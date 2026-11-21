/**
 * Videos de carrera: subida, cola de análisis, historial, reproducción y trayectoria de pose.
 *
 * La subida guarda el archivo y deja el video "en cola" (queued) sin esperar el análisis.
 * El trabajador de services/videoQueue.js llama a processJob para analizarlo en segundo plano.
 * Estados: queued (en cola) -> processing (analizando) -> completed (listo) | failed (falló).
 * Ver ADR-020.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { Blob } = require('node:buffer');
const repo = require('../db/repository');
const { getPool } = require('../db/pgClient');
const { buildAnalysisSummary } = require('./sessionController');
const access = require('../services/athleteAccess');

const ROOT = path.resolve(process.env.VIDEO_STORAGE_DIR || path.join(__dirname, '../../uploads'));
const LIMIT = 50 * 1024 * 1024;
const EXTENSIONS = ['.mp4', '.webm', '.mov'];
const MIMES = ['video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream'];
const CV_TIMEOUT_MS = Number(process.env.CV_TIMEOUT_MS) || 600000;

// Consentimiento vigente: la marca de la ficha y, si existe registro formal, que el último no esté
// revocado ni vencido. La versión FOR UPDATE bloquea la ficha dentro de una transacción.
const ATHLETE_FOR_UPDATE = `SELECT a.trainer_id,a.user_id,
 (COALESCE(a.consent,false) AND COALESCE((SELECT c.status='granted' AND (c.expires_at IS NULL OR c.expires_at>CURRENT_TIMESTAMP)
   FROM consents c WHERE c.athlete_id=a.id ORDER BY c.id DESC LIMIT 1),true)) AS consent
 FROM athletes a WHERE a.id=$1 FOR UPDATE OF a`;
const ATHLETE_CONSENT = ATHLETE_FOR_UPDATE.replace(' FOR UPDATE OF a', '');

// La cola se conecta desde index.js. Sin cola (pruebas) la subida solo deja el video en cola.
let notifyQueue = () => {};
function setQueueNotifier(fn) {
  notifyQueue = typeof fn === 'function' ? fn : () => {};
}

// ------------------------------------------------------------------------------------- utilidades

function fail(code, message) {
  access.reject(code, message);
}

function pool() {
  const p = getPool();
  if (!p) fail(503, 'La carga de videos requiere PostgreSQL.');
  return p;
}

/** Ruta en disco de un video. Solo acepta nombres generados por la API (uuid + extensión). */
function disk(name) {
  if (!/^[a-f0-9-]{36}\.(mp4|webm|mov)$/.test(name)) fail(500, 'Referencia de archivo inválida.');
  return path.join(ROOT, name);
}

/** Ficha sobre la que actúa el usuario: la propia (atleta) o una de sus atletas (entrenador). */
async function target(req, requestedId) {
  if (req.user.role === 'atleta') {
    const athlete = await repo.getAthleteByUserId(req.user.id);
    if (!athlete) fail(404, 'No tienes una ficha vinculada.');
    if (requestedId !== undefined && requestedId !== null && Number(requestedId) !== athlete.id) {
      fail(403, 'Solo puedes cargar videos en tu propia ficha.');
    }
    return athlete;
  }
  if (req.user.role === 'entrenador') {
    const id = access.positiveId(requestedId);
    const athlete = await repo.getAthleteByIdForTrainer(id, req.user.id);
    if (!athlete) fail(404, 'Atleta no disponible.');
    return athlete;
  }
  fail(403, 'Perfil no autorizado para capturar carreras.');
}

/** ¿La ficha sigue vinculada a quien actúa? (el atleta dueño o su entrenador) */
function linkedToActor(actor, linked) {
  if (!linked) return false;
  if (actor.role === 'atleta') return linked.user_id === Number(actor.id);
  return actor.role === 'entrenador' && linked.trainer_id === Number(actor.id);
}

async function consentValid(p, athleteId) {
  const row = (await p.query(ATHLETE_CONSENT, [athleteId])).rows[0];
  return Boolean(row && row.consent);
}

async function canRead(req, athleteId) {
  if (req.user.role === 'atleta') {
    const own = await target(req);
    if (own.id !== athleteId) fail(404, 'Video no disponible.');
  } else {
    await access.readable(req.user, athleteId);
  }
}

/** Error que el usuario puede ver; transient indica si conviene reintentar automáticamente. */
// Cámara lenta habitual de celular guardada a 30 cuadros/s: 60 (x2), 120 (x4) y 240 (x8).
const FACTORES_CAMARA_LENTA = [1, 2, 4, 8];

function jobError(message, transient) {
  const error = new Error(message);
  error.userMessage = message;
  error.transient = transient;
  return error;
}

function statusOf(row) {
  return row.status === 'uploaded' ? 'queued' : row.status;
}

// ------------------------------------------------------------------------------- análisis (cola)

async function callVisionService(row, athlete) {
  const form = new FormData();
  form.append('file', new Blob([await fsp.readFile(disk(row.stored_name))], { type: row.mime }), row.original_name);
  form.append('use_sample', 'false');
  form.append('sample_stride', '1');   // cuadro a cuadro: los eventos de contacto necesitan >= 60 Hz (ADR-023)
  form.append('max_frames', '240');
  form.append('scan_full_video', 'true');
  form.append('include_pose', 'true');
  form.append('max_samples', '4500');
  const factor = Number(row.slow_motion_factor) || 1;
  if (factor > 1) form.append('factor_camara_lenta', String(factor));
  const athleteAge = repo.formatAthlete(athlete)?.age;
  if (Number.isInteger(athleteAge) && athleteAge > 0) form.append('athlete_age', String(athleteAge));

  const url = process.env.CV_SERVICE_URL || 'http://cv-service:8000';
  let response;
  try {
    response = await fetch(url + '/api/cv/process-video', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(CV_TIMEOUT_MS)
    });
  } catch (err) {
    if (err.name === 'TimeoutError') throw jobError('Se agotó el tiempo de análisis.', true);
    throw jobError('El servicio de análisis no está disponible en este momento.', true);
  }
  if (response.status >= 500) throw jobError('El servicio de análisis tuvo un problema temporal.', true);
  if (!response.ok) {
    // Los rechazos 4xx del servicio de visión describen un problema del propio video (formato, duración…).
    const data = await response.json().catch(() => ({}));
    const detail = typeof data.detail === 'string' && data.detail.length <= 200 ? data.detail : null;
    throw jobError(detail || 'El servicio no pudo analizar el video. Comprueba el formato y la visibilidad del cuerpo.', false);
  }
  return response.json();
}

/** Guarda el resultado en una transacción, revalidando vínculo, consentimiento y propiedad del trabajo. */
async function saveResult(p, row, key, actor, summary, poseTrack) {
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const valid = (await client.query(ATHLETE_FOR_UPDATE, [row.athlete_id])).rows[0];
    if (!linkedToActor(actor, valid) || !valid.consent) {
      throw jobError('La vinculación o el consentimiento cambió durante el análisis.', false);
    }
    const active = (await client.query('SELECT id FROM athlete_video_uploads WHERE id=$1 AND process_key=$2 FOR UPDATE', [row.id, key])).rows[0];
    if (!active) throw jobError('Otro intento tomó el análisis de este video.', false);

    // Escritura atómica de la trayectoria: archivo temporal + rename.
    const posePath = disk(row.stored_name) + '.pose.json';
    const poseTemp = posePath + '.' + key + '.tmp';
    try {
      await fsp.writeFile(poseTemp, JSON.stringify(poseTrack), { flag: 'wx' });
      await fsp.rename(poseTemp, posePath);
    } finally {
      await fsp.unlink(poseTemp).catch(() => {});
    }

    await client.query('UPDATE sessions SET trainer_id=$1,ipt_score=$2,analysis=$3 WHERE id=$4 AND athlete_id=$5',
      [valid.trainer_id, typeof summary.ipt_score === 'number' ? Math.round(summary.ipt_score * 10) / 10 : null,
        JSON.stringify(summary), row.session_id, row.athlete_id]);
    await client.query("UPDATE athlete_video_uploads SET status='completed',error=NULL,process_key=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND process_key=$2",
      [row.id, key]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Analiza un video tomado de la cola. Devuelve {status:'completed'} o
 * {status:'failed', transient, error}. La cola decide si reintenta.
 */
async function processJob(row, key) {
  const p = pool();
  try {
    const actorId = row.requested_by || row.user_id;
    const actor = (await p.query('SELECT id,role FROM users WHERE id=$1', [actorId])).rows[0];
    if (!actor) throw jobError('La cuenta que pidió el análisis ya no existe.', false);
    const athlete = (await p.query('SELECT id,name,age,birth_date AS "birthDate" FROM athletes WHERE id=$1', [row.athlete_id])).rows[0];
    if (!athlete) throw jobError('La ficha del atleta ya no existe.', false);
    if (!(await consentValid(p, row.athlete_id))) throw jobError('Falta consentimiento vigente para analizar este video.', false);

    const raw = await callVisionService(row, athlete);
    const summary = buildAnalysisSummary(raw);
    const ipt = summary && summary.ipt_score;
    // IPT v2 (ADR-023): puede no haber IPT cuando ninguna variable es comparable con la referencia (por
    // ejemplo, un trote o un video con los pies tapados). La sesión se guarda igual con la estadística
    // medida y el motivo; lo que nunca se acepta es un puntaje fuera de rango.
    const sinIpt = ipt === null || ipt === undefined;
    if (!summary || (!sinIpt && (typeof ipt !== 'number' || !Number.isFinite(ipt) || ipt < 0 || ipt > 100))
        || (sinIpt && !summary.cinematica_eventos)) {
      throw jobError('El video no produjo un análisis válido. Prueba una captura con el cuerpo completo visible.', false);
    }
    const poseTrack = raw.pose_track;
    if (!poseTrack || poseTrack.landmark_count !== 33 || !Array.isArray(poseTrack.frames) || !poseTrack.frames.length) {
      throw jobError('El analizador no devolvió la trayectoria corporal. Comprueba que el servicio de visión esté actualizado.', false);
    }
    summary.pose_info = { version: 1, landmark_count: 33, sampled_frames: poseTrack.frames.length, full_video: poseTrack.full_video };

    await saveResult(p, row, key, actor, summary, poseTrack);
    return { status: 'completed', uploadId: row.id, sessionId: row.session_id, iptScore: ipt };
  } catch (err) {
    if (!err.userMessage) console.error('[video] fallo inesperado al analizar', row.id, err);
    // Los errores inesperados no exponen detalles internos al usuario.
    return {
      status: 'failed',
      transient: err.userMessage ? Boolean(err.transient) : true,
      error: err.userMessage || 'Error interno durante el análisis.'
    };
  }
}

/** Vuelve a poner un video en cola (reintento manual o reanálisis forzado). */
async function requeue(req, row, { allowCompleted = false } = {}) {
  const p = pool();
  await target(req, row.athlete_id);
  if (!(await consentValid(p, row.athlete_id))) fail(403, 'Falta consentimiento vigente para analizar este video.');
  const states = allowCompleted ? ['uploaded', 'failed', 'completed'] : ['uploaded', 'failed'];
  const updated = (await p.query(`UPDATE athlete_video_uploads SET status='queued',attempts=0,error=NULL,process_key=NULL,
  next_attempt_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP,requested_by=$2
  WHERE id=$1 AND status=ANY($3::text[]) RETURNING id,session_id,status`, [row.id, req.user.id, states])).rows[0];
  if (updated) {
    notifyQueue();
    return { uploadId: updated.id, sessionId: updated.session_id, status: 'queued' };
  }
  // Ya está en cola o analizándose: se informa el estado actual sin duplicar el trabajo.
  const current = (await p.query('SELECT id,session_id,status,error FROM athlete_video_uploads WHERE id=$1', [row.id])).rows[0];
  return { uploadId: current.id, sessionId: current.session_id, status: statusOf(current), error: current.error };
}

// ------------------------------------------------------------------------------------- subida

async function upload(req, res) {
  let temp = null;
  let finalFile = null;
  let committed = false;
  let targetAthleteId = null;
  try {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const athlete = await target(req, params.get('athleteId'));
    const p = pool();
    targetAthleteId = athlete.id;
    if (!(await consentValid(p, athlete.id))) fail(403, 'La ficha requiere un consentimiento vigente para subir videos.');

    const requestId = params.get('requestId') || '';
    const original = params.get('filename') || '';
    if (!/^[a-f0-9-]{36}$/.test(requestId)) fail(400, 'Identificador de carga inválido.');
    const ext = path.extname(original).toLowerCase();
    const mime = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!EXTENSIONS.includes(ext) || !MIMES.includes(mime)) fail(400, 'Usa un video MP4, WebM o MOV.');
    const originalName = path.basename(original).replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 180);
    // Cámara lenta (ADR-023): cuadros de captura / cuadros del archivo. Solo valores conocidos de celular.
    const slowMotion = Number(params.get('slowMotion') || 1);
    if (!FACTORES_CAMARA_LENTA.includes(slowMotion)) fail(400, 'Factor de cámara lenta no válido.');

    // Idempotencia: el mismo requestId devuelve la carga ya registrada (reintentos de red en el celular).
    const previous = (await p.query('SELECT id,athlete_id,session_id,status,error,original_name FROM athlete_video_uploads WHERE user_id=$1 AND request_id=$2',
      [req.user.id, requestId])).rows[0];
    if (previous) {
      req.resume();
      if (previous.athlete_id !== athlete.id || previous.original_name !== originalName) {
        fail(409, 'Identificador de carga reutilizado para otro archivo.');
      }
      return res.json({ uploadId: previous.id, sessionId: previous.session_id, status: statusOf(previous), error: previous.error });
    }
    if (Number(req.headers['content-length']) > LIMIT) fail(413, 'El video no debe superar 50 MB.');

    // Se escribe en un archivo .part y se renombra al terminar, para no dejar videos a medias.
    await fsp.mkdir(ROOT, { recursive: true });
    const id = crypto.randomUUID();
    const stored = id + ext;
    finalFile = disk(stored);
    temp = finalFile + '.part';
    let size = 0;
    const limit = new Transform({
      transform(chunk, encoding, callback) {
        size += chunk.length;
        if (size > LIMIT) {
          const error = new Error('El video supera 50 MB.');
          error.statusCode = 413;
          callback(error);
        } else {
          callback(null, chunk);
        }
      }
    });
    await pipeline(req, limit, fs.createWriteStream(temp, { flags: 'wx' }));
    if (!size) fail(400, 'El archivo está vacío.');
    await fsp.rename(temp, finalFile);
    temp = null;

    const client = await p.connect();
    let row;
    try {
      await client.query('BEGIN');
      const linked = (await client.query(ATHLETE_FOR_UPDATE, [athlete.id])).rows[0];
      if (!linkedToActor(req.user, linked) || !linked.consent) fail(403, 'La vinculación o el consentimiento cambió.');
      const notes = req.user.role === 'atleta' ? 'Video cargado por el alumno.' : 'Video registrado por su entrenador.';
      const session = (await client.query('INSERT INTO sessions(athlete_id,trainer_id,notes) VALUES($1,$2,$3) RETURNING id',
        [athlete.id, linked.trainer_id, notes])).rows[0];
      await client.query('UPDATE sessions SET video_url=$1 WHERE id=$2', ['/api/videos/' + session.id, session.id]);
      row = (await client.query(`INSERT INTO athlete_video_uploads(id,user_id,athlete_id,session_id,request_id,stored_name,original_name,mime,status,requested_by,slow_motion_factor)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,'queued',$2,$9) RETURNING *`,
        [id, req.user.id, athlete.id, session.id, requestId, stored, originalName, mime, slowMotion])).rows[0];
      await client.query('COMMIT');
      committed = true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    notifyQueue();
    return res.status(201).json({ uploadId: row.id, sessionId: row.session_id, status: 'queued' });
  } catch (err) {
    req.resume();
    if (temp) await fsp.unlink(temp).catch(() => {});
    if (finalFile && !committed) await fsp.unlink(finalFile).catch(() => {});
    if (err.code === '23505') {
      // Dos subidas simultáneas con el mismo requestId: gana la primera.
      const requestId = new URL(req.url, 'http://localhost').searchParams.get('requestId');
      const r = (await pool().query('SELECT id,athlete_id,session_id,status FROM athlete_video_uploads WHERE user_id=$1 AND request_id=$2',
        [req.user.id, requestId])).rows[0];
      if (r && r.athlete_id !== targetAthleteId) return res.status(409).json({ error: 'Identificador de carga reutilizado para otra ficha.' });
      if (r) return res.json({ uploadId: r.id, sessionId: r.session_id, status: statusOf(r) });
    }
    if (!err.statusCode) console.error('[video] fallo al guardar la subida', err);
    return res.status(err.statusCode || 500).json({
      error: err.statusCode ? err.message : 'No se pudo conservar el video. Intenta nuevamente.'
    });
  }
}

// ------------------------------------------------------------------------------------- consultas

async function listSessions(req, res, url, p) {
  const athleteId = req.user.role === 'atleta' ? (await target(req)).id : access.positiveId(url.searchParams.get('athleteId'));
  await canRead(req, athleteId);
  const rows = (await p.query('SELECT id,athlete_id AS "athleteId",session_date AS "sessionDate",video_url AS "videoUrl",notes,ipt_score AS "iptScore",analysis FROM sessions WHERE athlete_id=$1 ORDER BY session_date',
    [athleteId])).rows;
  return res.json({ sessions: rows });
}

async function listUploads(req, res, url, p) {
  const athlete = await target(req, url.searchParams.get('athleteId'));
  const rows = (await p.query(`SELECT v.id,v.session_id AS "sessionId",v.original_name AS filename,
    CASE WHEN v.status='uploaded' THEN 'queued' ELSE v.status END AS status,v.error,v.attempts,
    v.created_at AS "createdAt",v.updated_at AS "updatedAt",v.next_attempt_at AS "nextAttemptAt",s.ipt_score AS "iptScore"
    FROM athlete_video_uploads v JOIN sessions s ON s.id=v.session_id
    WHERE v.athlete_id=$1 ORDER BY v.created_at DESC LIMIT 50`, [athlete.id])).rows;
  return res.json({ videos: rows });
}

async function sessionVideo(req, res, p, sessionId, action) {
  const row = (await p.query('SELECT * FROM athlete_video_uploads WHERE session_id=$1', [sessionId])).rows[0];
  if (!row) fail(404, 'Esta sesión no conserva un video original para superponer el esqueleto.');
  if (action === 'analyze-pose') return res.status(202).json(await requeue(req, row, { allowCompleted: true }));
  await canRead(req, row.athlete_id);
  if (action === 'analysis-status') {
    return res.json({ uploadId: row.id, sessionId: row.session_id, status: statusOf(row), error: row.error, attempts: row.attempts });
  }
  try {
    return res.json(JSON.parse(await fsp.readFile(disk(row.stored_name) + '.pose.json', 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') fail(404, 'Este video todavía no tiene esqueleto. Su responsable puede generar el análisis corporal.');
    throw error;
  }
}

async function playback(req, res, p, sessionId) {
  const row = (await p.query('SELECT * FROM athlete_video_uploads WHERE session_id=$1', [sessionId])).rows[0];
  if (!row) fail(404, 'Video no disponible.');
  await canRead(req, row.athlete_id);
  const stat = await fsp.stat(disk(row.stored_name));
  res.setHeader('Content-Type', row.mime === 'application/octet-stream' ? 'video/mp4' : row.mime);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Length', stat.size);
  await pipeline(fs.createReadStream(disk(row.stored_name)), res);
}

// ------------------------------------------------------------------------------------- enrutador

async function handle(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const url = new URL(req.url, 'http://localhost');
  url.pathname = url.pathname.replace('/api/capture/videos', '/api/portal/videos');
  if (req.method === 'POST' && url.pathname === '/api/portal/videos') return upload(req, res);
  try {
    const p = pool();
    if (req.method === 'GET' && url.pathname === '/api/videos/sessions') return await listSessions(req, res, url, p);
    if (req.method === 'GET' && url.pathname === '/api/portal/videos') return await listUploads(req, res, url, p);

    const retry = url.pathname.match(/^\/api\/portal\/videos\/([a-f0-9-]{36})\/analyze$/);
    if (req.method === 'POST' && retry) {
      const row = (await p.query('SELECT * FROM athlete_video_uploads WHERE id=$1', [retry[1]])).rows[0];
      if (!row) fail(404, 'Video no disponible.');
      return res.status(202).json(await requeue(req, row));
    }

    const poseRoute = url.pathname.match(/^\/api\/videos\/(\d+)\/(pose|analyze-pose|analysis-status)$/);
    if (poseRoute) {
      const allowed = poseRoute[2] === 'analyze-pose' ? req.method === 'POST' : req.method === 'GET';
      if (!allowed) return res.status(405).json({ error: 'Método no permitido.' });
      return await sessionVideo(req, res, p, poseRoute[1], poseRoute[2]);
    }

    const play = url.pathname.match(/^\/api\/videos\/(\d+)$/);
    if (req.method === 'GET' && play) return await playback(req, res, p, play[1]);

    return res.status(404).json({ error: 'Ruta de video no encontrada.' });
  } catch (err) {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (!err.statusCode) console.error('[video] error', err);
    return res.status(err.statusCode || 500).json({
      error: err.statusCode ? err.message : 'No se pudo consultar el video. Intenta nuevamente.'
    });
  }
}

module.exports = { handle, processJob, setQueueNotifier };
