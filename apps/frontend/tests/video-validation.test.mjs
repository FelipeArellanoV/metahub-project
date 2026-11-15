// Validación de video antes de subir y estados de la cola de análisis.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateVideoFile, validateDuration, formatBytes, statusInfo, normalizeStatus, needsPolling, canRetry,
  MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS
} from '../src/services/videoValidation.js';

const MB = 1024 * 1024;

test('acepta los formatos de celular habituales (MP4 de Android, MOV de iPhone, WebM del navegador)', () => {
  for (const file of [
    { name: 'VID_20261113.mp4', type: 'video/mp4', size: 12 * MB },
    { name: 'IMG_0042.MOV', type: 'video/quicktime', size: 30 * MB },
    { name: 'carrera-1731.webm', type: 'video/webm', size: 4 * MB },
    { name: 'sin-tipo.mp4', type: '', size: 2 * MB }          // algunos navegadores no informan el tipo
  ]) assert.deepEqual(validateVideoFile(file), { ok: true }, file.name);
});

test('rechaza formatos no admitidos con un mensaje útil', () => {
  const avi = validateVideoFile({ name: 'carrera.avi', type: 'video/x-msvideo', size: MB });
  assert.equal(avi.ok, false);
  assert.match(avi.error, /MP4, WebM o MOV/);
  const gp = validateVideoFile({ name: 'carrera.3gp', type: 'video/3gpp', size: MB });
  assert.match(gp.error, /3GP/);
  assert.equal(validateVideoFile({ name: 'foto.mp4', type: 'image/jpeg', size: MB }).ok, false, 'extensión cambiada a mano');
  assert.equal(validateVideoFile({ name: 'sin_extension', type: 'video/mp4', size: MB }).ok, false);
});

test('rechaza videos vacíos o de más de 50 MB antes de enviarlos', () => {
  assert.equal(validateVideoFile({ name: 'a.mp4', type: 'video/mp4', size: 0 }).ok, false);
  assert.equal(validateVideoFile({ name: 'a.mp4', type: 'video/mp4', size: MAX_VIDEO_BYTES }).ok, true);
  const big = validateVideoFile({ name: 'a.mp4', type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 });
  assert.equal(big.ok, false);
  assert.match(big.error, /50,0 MB/);
  assert.equal(validateVideoFile(null).ok, false);
});

test('duración: hasta 5 minutos; si no se puede leer, no bloquea', () => {
  assert.equal(validateDuration(42).ok, true);
  assert.equal(validateDuration(MAX_VIDEO_SECONDS).ok, true);
  assert.equal(validateDuration(MAX_VIDEO_SECONDS + 1).ok, false);
  assert.deepEqual(validateDuration(null), { ok: true, unknown: true });
  assert.deepEqual(validateDuration(Infinity), { ok: true, unknown: true });
});

test('formatea tamaños en español', () => {
  assert.equal(formatBytes(512), '1 KB');
  assert.equal(formatBytes(1.5 * MB), '1,5 MB');
});

test('estados de la cola: en cola, analizando, listo y falló', () => {
  assert.equal(statusInfo('queued').label, 'En cola');
  assert.equal(statusInfo('processing').label, 'Analizando');
  assert.equal(statusInfo('completed').label, 'Listo');
  assert.equal(statusInfo('failed').label, 'Falló');
  assert.equal(normalizeStatus('uploaded'), 'queued', 'las filas antiguas se muestran en cola');
});

test('se sigue consultando solo mientras haya análisis pendientes', () => {
  assert.equal(needsPolling([{ status: 'completed' }, { status: 'failed' }]), false);
  assert.equal(needsPolling([{ status: 'completed' }, { status: 'queued' }]), true);
  assert.equal(needsPolling([{ status: 'processing' }]), true);
  assert.equal(needsPolling([]), false);
});

test('solo los videos fallidos ofrecen reintento', () => {
  assert.equal(canRetry({ status: 'failed' }), true);
  for (const status of ['queued', 'processing', 'completed']) assert.equal(canRetry({ status }), false);
});
