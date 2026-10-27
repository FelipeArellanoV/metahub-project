// Seguimiento compartido. Identidad y permisos derivados del JWT, nunca del body.
const crypto = require('crypto');
const repository = require('../db/repository');
const athleteAccess = require('./athleteAccess');
const { getPool } = require('../db/pgClient');
const memory = new Map();
const memoryReceipts = new Map();

function fail(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}
function integer(value, label = 'Identificador') {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) fail(400, label + ' inválido.');
  return n;
}
function text(value, label, max, optional = false) {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || (!optional && !value.trim()) || value.length > max) {
    fail(400, label + ': texto requerido, máximo ' + max + ' caracteres.');
  }
  return value.trim();
}
function date(value) {
  if (typeof value !== 'string' || !/T.*(Z|[+-]\d{2}:\d{2})$/.test(value)) {
    fail(400, 'La fecha debe incluir hora y zona horaria.');
  }
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) fail(400, 'Fecha inválida.');
  return d.toISOString();
}
async function resolveAthlete(user, requestedId, allowClubRead = false) {
  if (user.role === 'atleta') {
    const athlete = await repository.getAthleteByUserId(user.id);
    if (!athlete) fail(404, 'Tu cuenta no tiene ficha de atleta vinculada.');
    if (requestedId !== undefined && integer(requestedId) !== athlete.id) {
      fail(403, 'Solo puedes acceder a tu propia ficha.');
    }
    return athlete;
  }
  if (user.role !== 'entrenador') fail(403, 'Perfil no autorizado.');
  if (allowClubRead) return athleteAccess.readable(user, requestedId);
  const athlete = await repository.getAthleteByIdForTrainer(integer(requestedId), user.id);
  if (!athlete) fail(404, 'Atleta no encontrado.');
  return athlete;
}
function initialState() {
  return { tasks: [], appointments: [], messages: [], events: [], receipts: new Map() };
}
function memoryState(id) {
  if (!memory.has(id)) memory.set(id, initialState());
  return memory.get(id);
}
function validateOperation(user, kind, body) {
  const coach = user.role === 'entrenador';
  const athlete = user.role === 'atleta';
  if (kind === 'task.create') {
    if (!coach) fail(403, 'Solo el entrenador puede asignar ejercicios.');
    return { title: text(body.title, 'Título', 160), details: text(body.details, 'Indicaciones', 2000, true) };
  }
  if (kind === 'appointment.create') {
    if (!coach) fail(403, 'Solo el entrenador puede planificar citas.');
    const starts_at = date(body.startsAt);
    const ends_at = date(body.endsAt);
    if (ends_at <= starts_at) fail(400, 'El término debe ser posterior al inicio.');
    return { title: text(body.title, 'Título', 160), location: text(body.location, 'Lugar', 200), starts_at, ends_at };
  }
  if (kind === 'message.create') return { body: text(body.body, 'Mensaje', 2000) };
  if (kind === 'task.update') {
    if (!athlete) fail(403, 'Solo el alumno puede registrar cumplimiento.');
    if (typeof body.done !== 'boolean') fail(400, 'done debe ser booleano.');
    return { done: body.done, version: integer(body.version, 'Versión') };
  }
  if (kind === 'appointment.update') {
    const version = integer(body.version, 'Versión');
    if (athlete && ['confirmed', 'declined'].includes(body.attendance)) {
      return { attendance: body.attendance, version };
    }
    if (coach && body.cancelled === true) return { cancelled: true, version };
    fail(400, 'Alumno: confirmar o declinar. Entrenador: cancelar.');
  }
  fail(404, 'Operación desconocida.');
}
function conflict() {
  fail(409, 'Otro dispositivo modificó este registro. Actualiza y vuelve a intentarlo.');
}
function fingerprint(kind, id, data) {
  return crypto.createHash('sha256').update(JSON.stringify({ kind, id, data })).digest('hex');
}
async function mutate(user, athleteId, kind, entityId, body) {
  const athlete = await resolveAthlete(user, athleteId);
  const data = validateOperation(user, kind, body);
  const requestId = text(body.requestId, 'requestId', 80);
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) fail(400, 'requestId inválido.');
  const fp = fingerprint(kind, athlete.id + ':' + (entityId || ''), data);
  const pool = getPool();
  if (!pool) {
    const state = memoryState(athlete.id);
    const key = user.id + ':' + requestId;
    const previous = memoryReceipts.get(key);
    if (previous) {
      if (previous.fingerprint !== fp) fail(409, 'requestId ya utilizado para otra operación.');
      return previous.result;
    }
    const now = new Date().toISOString();
    let row;
    const collection = kind.startsWith('task.') ? state.tasks :
      kind.startsWith('appointment.') ? state.appointments : state.messages;
    if (kind.endsWith('.create')) {
      row = { id: crypto.randomUUID(), athlete_id: athlete.id, ...data };
      if (kind === 'message.create') {
        Object.assign(row, { author_id: user.id, author_role: user.role, created_at: now });
      } else {
        Object.assign(row, { version: 1, updated_at: now });
        if (kind === 'task.create') row.done = false;
        else Object.assign(row, { attendance: 'pending', cancelled: false });
      }
      collection.push(row);
    } else {
      row = collection.find(r => r.id === entityId);
      if (!row) fail(404, 'Registro no encontrado.');
      if (row.version !== data.version) conflict();
      if (kind === 'appointment.update' && row.cancelled) fail(409, 'La cita está cancelada.');
      const { version, ...fields } = data;
      Object.assign(row, fields, { version: version + 1, updated_at: now });
    }
    const result = { record: { ...row } };
    state.events.unshift({ id: crypto.randomUUID(), actor_id: user.id, kind, entity_id: row.id, created_at: now });
    memoryReceipts.set(key, { fingerprint: fp, result });
    return result;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Serializa operaciones de la ficha y comprueba nuevamente la relación dentro de la transacción.
    const locked = await client.query('SELECT trainer_id, user_id FROM athletes WHERE id=$1 FOR UPDATE', [athlete.id]);
    const relation = locked.rows[0];
    if (!relation) fail(404, 'Atleta no encontrado.');
    if ((user.role === 'atleta' && relation.user_id !== Number(user.id)) ||
        (user.role === 'entrenador' && relation.trainer_id !== Number(user.id))) {
      fail(403, 'La vinculación de esta ficha cambió.');
    }
    const prior = await client.query(
      'SELECT fingerprint, result FROM collaboration_receipts WHERE actor_id=$1 AND request_id=$2',
      [user.id, requestId]);
    if (prior.rows[0]) {
      if (prior.rows[0].fingerprint !== fp) fail(409, 'requestId ya utilizado para otra operación.');
      await client.query('COMMIT');
      return prior.rows[0].result;
    }
    const id = entityId || crypto.randomUUID();
    let result;
    if (kind === 'task.create') {
      result = await client.query(
        'INSERT INTO collaboration_tasks(id,athlete_id,title,details) VALUES($1,$2,$3,$4) RETURNING *',
        [id, athlete.id, data.title, data.details]);
    } else if (kind === 'appointment.create') {
      result = await client.query(
        'INSERT INTO collaboration_appointments(id,athlete_id,title,location,starts_at,ends_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
        [id, athlete.id, data.title, data.location, data.starts_at, data.ends_at]);
    } else if (kind === 'message.create') {
      result = await client.query(
        'INSERT INTO collaboration_messages(id,athlete_id,author_id,author_role,body) VALUES($1,$2,$3,$4,$5) RETURNING *',
        [id, athlete.id, user.id, user.role, data.body]);
    } else if (kind === 'task.update') {
      result = await client.query(
        'UPDATE collaboration_tasks SET done=$1,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND athlete_id=$3 AND version=$4 RETURNING *',
        [data.done, id, athlete.id, data.version]);
    } else {
      if (data.cancelled) {
        result = await client.query(
          'UPDATE collaboration_appointments SET cancelled=TRUE,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND athlete_id=$2 AND version=$3 AND NOT cancelled RETURNING *',
          [id, athlete.id, data.version]);
      } else {
        result = await client.query(
          'UPDATE collaboration_appointments SET attendance=$1,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 AND athlete_id=$3 AND version=$4 AND NOT cancelled RETURNING *',
          [data.attendance, id, athlete.id, data.version]);
      }
    }
    if (!result.rows[0]) conflict();
    const response = { record: result.rows[0] };
    await client.query(
      'INSERT INTO collaboration_events(id,athlete_id,actor_id,kind,entity_id) VALUES($1,$2,$3,$4,$5)',
      [crypto.randomUUID(), athlete.id, user.id, kind, id]);
    await client.query(
      'INSERT INTO collaboration_receipts(actor_id,request_id,athlete_id,fingerprint,result) VALUES($1,$2,$3,$4,$5)',
      [user.id, requestId, athlete.id, fp, JSON.stringify(response)]);
    await client.query('COMMIT');
    return response;
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') fail(409, 'Solicitud repetida; reutiliza la misma solicitud para recuperar su resultado.');
    throw error;
  } finally {
    client.release();
  }
}
async function snapshot(user, requestedId) {
  const athlete = await resolveAthlete(user, requestedId, true);
  const pool = getPool();
  let result;
  if (pool) {
    // Una sola instantánea transaccional evita mezclar lecturas de distintos momentos.
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const relation = (await client.query('SELECT trainer_id,user_id FROM athletes WHERE id=$1', [athlete.id])).rows[0];
      let shared = false;
      if (relation && user.role === 'entrenador' && relation.trainer_id !== Number(user.id)) {
        shared = (await client.query(
          'SELECT 1 FROM club_memberships v JOIN club_memberships o ON o.club_id=v.club_id WHERE v.user_id=$1 AND o.user_id=$2 LIMIT 1',
          [user.id, relation.trainer_id])).rows.length > 0;
      }
      if (!relation || (user.role === 'atleta' ? relation.user_id !== Number(user.id) : relation.trainer_id !== Number(user.id) && !shared)) {
        fail(403, 'La vinculación de esta ficha cambió.');
      }
      const tasks = await client.query('SELECT * FROM collaboration_tasks WHERE athlete_id=$1 ORDER BY updated_at DESC,id LIMIT 200', [athlete.id]);
      const appointments = await client.query('SELECT * FROM collaboration_appointments WHERE athlete_id=$1 ORDER BY starts_at DESC,id LIMIT 100', [athlete.id]);
      const messages = await client.query('SELECT * FROM collaboration_messages WHERE athlete_id=$1 ORDER BY created_at DESC,id LIMIT 100', [athlete.id]);
      const events = await client.query('SELECT * FROM collaboration_events WHERE athlete_id=$1 ORDER BY created_at DESC,id LIMIT 50', [athlete.id]);
      result = { tasks: tasks.rows, appointments: appointments.rows, messages: messages.rows, events: events.rows };
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  } else {
    const state = memoryState(athlete.id);
    result = {
      tasks: [...state.tasks].sort((a,b) => b.updated_at.localeCompare(a.updated_at)).slice(0,200),
      appointments: [...state.appointments].sort((a,b) => b.starts_at.localeCompare(a.starts_at)).slice(0,100),
      messages: [...state.messages].reverse().slice(0,100),
      events: state.events.slice(0,50)
    };
  }
  return {
    athlete: { id: athlete.id, name: athlete.name, consent: athlete.consent },
    ...result,
    permissions: { canEdit: user.role === 'atleta' || athlete.trainerId === Number(user.id) },
    storage: pool ? 'postgresql' : 'memory',
    fetchedAt: new Date().toISOString(),
    limits: { tasks: 200, appointments: 100, messages: 100, events: 50 }
  };
}
module.exports = { snapshot, mutate };
