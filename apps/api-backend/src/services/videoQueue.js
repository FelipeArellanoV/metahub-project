/**
 * Cola de análisis de video en segundo plano (respaldada en PostgreSQL).
 *
 * La subida responde de inmediato con estado "queued"; este trabajador toma los videos en
 * cola, los analiza y deja el resultado en la tabla. La interfaz consulta el estado.
 *
 *   queued (en cola) -> processing (analizando) -> completed (listo)
 *                                              \-> queued  (reintento automático si el fallo es transitorio)
 *                                              \-> failed  (falló; el usuario puede reintentar)
 *
 * - Se toma un trabajo con FOR UPDATE SKIP LOCKED: varias réplicas no procesan el mismo video.
 * - Un trabajo "processing" abandonado (caída del proceso) se recupera tras STALE_MINUTES.
 * - Los fallos transitorios (servicio de visión caído, tiempo agotado) se reintentan con espera
 *   creciente hasta MAX_ATTEMPTS; los fallos del propio video (formato, cuerpo no visible) no.
 */

const crypto = require('node:crypto');

const DEFAULTS = {
  pollMs: 3000,
  concurrency: 1,
  maxAttempts: 3,
  staleMinutes: 12,
  backoffSeconds: 30
};

/** Espera antes del intento n+1 (30 s, 60 s, 120 s…). */
function backoffSeconds(attempts, base = DEFAULTS.backoffSeconds) {
  return base * Math.pow(2, Math.max(0, attempts - 1));
}

function createVideoQueue({ pool, processJob, logger = console, ...options }) {
  const cfg = { ...DEFAULTS, ...options };
  let timer = null;
  let running = 0;
  let stopped = true;
  let ticking = false;

  /** Marca como fallidos los trabajos abandonados que ya agotaron sus intentos. */
  async function failExhausted() {
    await pool.query(
      `UPDATE athlete_video_uploads
          SET status='failed', process_key=NULL, updated_at=CURRENT_TIMESTAMP,
              error='El análisis se interrumpió varias veces. Reintenta o prueba con un clip más corto.'
        WHERE status='processing' AND started_at < CURRENT_TIMESTAMP - make_interval(mins => $1) AND attempts >= $2`,
      [cfg.staleMinutes, cfg.maxAttempts]
    );
  }

  /** Toma el siguiente trabajo disponible y lo marca como "processing". */
  async function claim() {
    const key = crypto.randomUUID();
    const row = (await pool.query(
      `UPDATE athlete_video_uploads
          SET status='processing', process_key=$1, started_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP,
              attempts=attempts+1, error=NULL
        WHERE id = (
          SELECT id FROM athlete_video_uploads
           WHERE (status='queued' AND next_attempt_at <= CURRENT_TIMESTAMP)
              OR (status='processing' AND started_at < CURRENT_TIMESTAMP - make_interval(mins => $2) AND attempts < $3)
           ORDER BY next_attempt_at
           LIMIT 1
           FOR UPDATE SKIP LOCKED)
        RETURNING *`,
      [key, cfg.staleMinutes, cfg.maxAttempts]
    )).rows[0];
    return row ? { row, key } : null;
  }

  /** Registra el resultado de un intento fallido: reintento automático o fallo definitivo. */
  async function recordFailure(row, key, outcome) {
    const retry = outcome.transient && row.attempts < cfg.maxAttempts;
    if (retry) {
      const wait = backoffSeconds(row.attempts, cfg.backoffSeconds);
      await pool.query(
        `UPDATE athlete_video_uploads
            SET status='queued', process_key=NULL, updated_at=CURRENT_TIMESTAMP, error=$1,
                next_attempt_at=CURRENT_TIMESTAMP + make_interval(secs => $2)
          WHERE id=$3 AND process_key=$4`,
        [(outcome.error + ' Se reintentará automáticamente.').slice(0, 300), wait, row.id, key]
      );
    } else {
      await pool.query(
        `UPDATE athlete_video_uploads SET status='failed', process_key=NULL, updated_at=CURRENT_TIMESTAMP, error=$1
          WHERE id=$2 AND process_key=$3`,
        [String(outcome.error).slice(0, 300), row.id, key]
      );
    }
    return retry ? 'queued' : 'failed';
  }

  /** Ejecuta un trabajo ya tomado y registra su resultado. */
  async function execute(job) {
    running++;
    try {
      const outcome = await processJob(job.row, job.key);
      if (outcome.status !== 'completed') await recordFailure(job.row, job.key, outcome);
    } catch (err) {
      // processJob ya traduce los errores conocidos; esto cubre fallos inesperados.
      logger.error('[cola-video] error inesperado en', job.row.id, err);
      await recordFailure(job.row, job.key, { transient: true, error: 'Error interno durante el análisis.' }).catch(() => {});
    } finally {
      running--;
    }
  }

  /** Toma y procesa un solo trabajo (true si había alguno). Útil en pruebas. */
  async function runOne() {
    const job = await claim();
    if (!job) return false;
    await execute(job);
    return true;
  }

  /** Revisa la cola y lanza trabajos hasta llenar la concurrencia. */
  async function tick() {
    if (stopped || ticking) return;
    ticking = true;
    try {
      await failExhausted();
      while (!stopped && running < cfg.concurrency) {
        const job = await claim();
        if (!job) break;
        // Al terminar, se vuelve a revisar la cola para tomar el siguiente sin esperar al sondeo.
        execute(job).finally(() => setImmediate(tick));
      }
    } catch (err) {
      logger.error('[cola-video] no se pudo revisar la cola:', err.message);
    } finally {
      ticking = false;
    }
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      timer = setInterval(tick, cfg.pollMs);
      timer.unref?.();
      setImmediate(tick);
      logger.log(`[cola-video] trabajador activo (concurrencia ${cfg.concurrency}, ${cfg.maxAttempts} intentos).`);
    },
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
    },
    /** Despierta la cola tras una subida o un reintento, sin esperar al siguiente sondeo. */
    notify() { setImmediate(tick); },
    // Expuesto para pruebas
    tick, runOne, get running() { return running; }
  };
}

module.exports = { createVideoQueue, backoffSeconds, DEFAULTS };
