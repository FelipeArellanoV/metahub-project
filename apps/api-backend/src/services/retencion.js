// T-12 / CU-08: purga de datos biométricos vencidos (video y archivo de pose).
// Elimina el archivo de video y su .pose.json, borra el registro de la carga y deja la sesión sin enlace
// de video. Las métricas agregadas de la sesión (IPT, resumen) se conservan: no son el registro audiovisual.
// El plazo NO tiene valor por defecto: debe definirse explícitamente (decisión de la institución y del profesor guía).
const fsp = require('node:fs/promises');
const path = require('node:path');

const STORED_NAME = /^[a-f0-9-]{36}\.(mp4|webm|mov)$/;
const DAY_MS = 24 * 60 * 60 * 1000;

async function unlinkIfExists(file) {
  try { await fsp.unlink(file); return true; }
  catch (e) { if (e.code === 'ENOENT') return false; throw e; }
}

async function purgarVideosVencidos({ pool, rootDir, retentionDays, now = new Date(), dryRun = true }) {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays debe ser un entero >= 1 y definirse explícitamente.');
  }
  if (!pool) throw new Error('La purga requiere PostgreSQL.');
  const root = path.resolve(rootDir);
  const cutoff = new Date(now.getTime() - retentionDays * DAY_MS);
  const { rows } = await pool.query(
    `SELECT id, session_id AS "sessionId", stored_name AS "storedName", created_at AS "createdAt"
     FROM athlete_video_uploads
     WHERE created_at < $1 AND status IN ('uploaded','completed','failed')
     ORDER BY created_at, id`, [cutoff]);
  const result = { dryRun, retentionDays, cutoff: cutoff.toISOString(), candidates: rows.length, purged: 0, filesDeleted: 0, errors: [] };
  for (const row of rows) {
    if (!STORED_NAME.test(row.storedName)) { result.errors.push({ id: row.id, error: 'Nombre de archivo inválido' }); continue; }
    if (dryRun) continue;
    const video = path.join(root, row.storedName);
    try {
      if (await unlinkIfExists(video)) result.filesDeleted++;
      if (await unlinkIfExists(video + '.pose.json')) result.filesDeleted++;
    } catch (e) { result.errors.push({ id: row.id, error: e.code || e.message }); continue; }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE sessions SET video_url = '' WHERE id = $1`, [row.sessionId]);
      await client.query('DELETE FROM athlete_video_uploads WHERE id = $1', [row.id]);
      await client.query('COMMIT');
      result.purged++;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      result.errors.push({ id: row.id, error: e.message });
    } finally { client.release(); }
  }
  return result;
}

module.exports = { purgarVideosVencidos };
