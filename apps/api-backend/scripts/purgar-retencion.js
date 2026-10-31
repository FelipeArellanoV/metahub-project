#!/usr/bin/env node
// Uso: RETENTION_DAYS=<días> node scripts/purgar-retencion.js [--apply]
// Sin --apply solo informa qué se eliminaría (simulación).
const path = require('node:path');
const { getPool } = require('../src/db/pgClient');
const { purgarVideosVencidos } = require('../src/services/retencion');

(async () => {
  const retentionDays = Number(process.env.RETENTION_DAYS);
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    console.error('Defina RETENTION_DAYS (entero >= 1). No existe un plazo por defecto.');
    process.exit(2);
  }
  const rootDir = process.env.VIDEO_STORAGE_DIR || path.join(__dirname, '../uploads');
  const result = await purgarVideosVencidos({ pool: getPool(), rootDir, retentionDays, dryRun: !process.argv.includes('--apply') });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.errors.length ? 1 : 0);
})().catch(e => { console.error(e.message); process.exit(1); });
