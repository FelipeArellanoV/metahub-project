/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Archivo: index.js
 * Descripción: Punto de entrada del servidor API Backend y despachador HTTP de MetaHub.
 * =========================================================================================
 */

const http = require('http');
const app = require('./app');
const path = require('path');
const dbRepository = require('./db/repository');
const { getPool } = require('./db/pgClient');
const { purgarVideosVencidos } = require('./services/retencion');

// Puerto de escucha del servidor (3000 por defecto para el backend de MetaHub)
const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await dbRepository.seedDefaults();
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`🚀 MetaHub API Backend ejecutándose en http://localhost:${PORT}`);
  });
  scheduleRetention();
}

// CU-08 / T-12: purga diaria de videos vencidos. Solo se activa si RETENTION_DAYS está definido
// (no hay plazo por defecto: lo fija la institución). Sin la variable, no se elimina nada.
function scheduleRetention() {
  const retentionDays = Number(process.env.RETENTION_DAYS);
  if (!process.env.RETENTION_DAYS) return console.log('Retención: desactivada (RETENTION_DAYS no definido).');
  if (!Number.isInteger(retentionDays) || retentionDays < 1) return console.error('Retención: RETENTION_DAYS inválido; no se programa la purga.');
  const rootDir = process.env.VIDEO_STORAGE_DIR || path.join(__dirname, '../uploads');
  const run = () => purgarVideosVencidos({ pool: getPool(), rootDir, retentionDays, dryRun: false })
    .then(r => console.log(`Retención: ${r.purged} carga(s) purgada(s), ${r.errors.length} error(es).`))
    .catch(e => console.error('Retención:', e.message));
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, 24 * 60 * 60 * 1000).unref();
  console.log(`Retención: purga diaria activada (${retentionDays} días).`);
}

bootstrap();
