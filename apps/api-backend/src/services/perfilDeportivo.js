/**
 * Perfil deportivo del atleta (ADR-026): prueba principal, pierna dominante, estatura y mejor marca.
 * Es contexto para el entrenador y el informe; no entra al IPT. Sin PostgreSQL no hay perfil (null).
 */
const { getPool } = require('../db/pgClient');

const PRUEBAS = ['60m', '80m', '100m', '150m', '200m', '400m', 'vallas', 'relevos', 'otra'];
const PIERNAS = ['derecha', 'izquierda'];

function fail(status, message) {
  const e = new Error(message);
  e.statusCode = status;
  throw e;
}

const fila = r => (r ? {
  mainEvent: r.main_event || null,
  dominantLeg: r.dominant_leg || null,
  heightCm: r.height_cm == null ? null : Number(r.height_cm),
  bestMark: r.best_mark || null,
  updatedAt: r.updated_at
} : null);

async function obtener(athleteId) {
  const pool = getPool();
  if (!pool) return null;
  try {
    const r = await pool.query('SELECT * FROM athlete_sport_profiles WHERE athlete_id=$1', [athleteId]);
    return fila(r.rows[0]);
  } catch (err) {
    // Base sin la migración 009: la ficha funciona igual, sin perfil deportivo.
    if (err.code === '42P01') return null;
    throw err;
  }
}

/** Valida el cuerpo. Un campo vacío se guarda como null (el entrenador puede borrarlo). */
function validar(body) {
  const b = body && typeof body === 'object' ? body : {};
  const vacio = v => v === undefined || v === null || v === '';
  const mainEvent = vacio(b.mainEvent) ? null : String(b.mainEvent);
  if (mainEvent && !PRUEBAS.includes(mainEvent)) fail(400, 'Prueba principal no válida.');
  const dominantLeg = vacio(b.dominantLeg) ? null : String(b.dominantLeg);
  if (dominantLeg && !PIERNAS.includes(dominantLeg)) fail(400, 'Pierna dominante no válida.');
  let heightCm = null;
  if (!vacio(b.heightCm)) {
    heightCm = Number(b.heightCm);
    if (!Number.isInteger(heightCm) || heightCm < 100 || heightCm > 230) fail(400, 'La estatura debe ser un número entero entre 100 y 230 cm.');
  }
  const bestMark = vacio(b.bestMark) ? null : String(b.bestMark).trim().slice(0, 60);
  return { mainEvent, dominantLeg, heightCm, bestMark: bestMark || null };
}

async function guardar(athleteId, body) {
  const pool = getPool();
  if (!pool) fail(503, 'El perfil deportivo requiere PostgreSQL.');
  const d = validar(body);
  const r = await pool.query(`
    INSERT INTO athlete_sport_profiles (athlete_id, main_event, dominant_leg, height_cm, best_mark, updated_at)
    VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP)
    ON CONFLICT (athlete_id) DO UPDATE SET main_event=EXCLUDED.main_event, dominant_leg=EXCLUDED.dominant_leg,
      height_cm=EXCLUDED.height_cm, best_mark=EXCLUDED.best_mark, updated_at=CURRENT_TIMESTAMP
    RETURNING *`, [athleteId, d.mainEvent, d.dominantLeg, d.heightCm, d.bestMark]);
  return fila(r.rows[0]);
}

module.exports = { obtener, guardar, validar, PRUEBAS, PIERNAS };
