// Validación de videos ANTES de subirlos (formato, tamaño y duración) y estados de la cola de análisis.
// Módulo sin dependencias de React para poder probarlo con node --test.

export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;   // mismo límite que la API
export const MAX_VIDEO_SECONDS = 5 * 60;           // el servicio de visión analiza hasta 5 minutos
export const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];
// Algunos navegadores móviles no informan el tipo (''), por eso se valida también la extensión.
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', ''];

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}

function extensionOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return match ? match[1].toLowerCase() : '';
}

/**
 * Valida nombre, tipo y tamaño. Devuelve { ok: true } o { ok: false, error }.
 * Acepta objetos File o cualquier { name, size, type }.
 */
export function validateVideoFile(file) {
  if (!file) return { ok: false, error: 'Selecciona un video.' };
  const ext = extensionOf(file.name);
  const type = String(file.type || '').split(';')[0].trim().toLowerCase();
  if (!VIDEO_EXTENSIONS.includes(ext)) {
    const hint = ext === '3gp' || type === 'video/3gpp'
      ? ' Tu celular grabó en 3GP: cambia el formato de la cámara a MP4.'
      : '';
    return { ok: false, error: `Formato no admitido (.${ext || '?'}). Usa un video MP4, WebM o MOV.${hint}` };
  }
  if (!VIDEO_MIME_TYPES.includes(type)) {
    return { ok: false, error: 'El archivo no parece un video MP4, WebM o MOV.' };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: 'El video está vacío. Vuelve a grabarlo o elige otro archivo.' };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      error: `El video pesa ${formatBytes(file.size)} y el máximo es ${formatBytes(MAX_VIDEO_BYTES)}. ` +
        'Graba un clip más corto o baja la resolución de la cámara a 1080p.'
    };
  }
  return { ok: true };
}

/** Valida la duración leída de los metadatos. Si no se pudo leer (null), no bloquea. */
export function validateDuration(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return { ok: true, unknown: true };
  if (seconds > MAX_VIDEO_SECONDS) {
    return { ok: false, error: `El video dura ${Math.round(seconds)} s; el análisis admite hasta ${MAX_VIDEO_SECONDS / 60} minutos. Recórtalo antes de subirlo.` };
  }
  return { ok: true };
}

/** Lee la duración de un video en el navegador (null si el formato no se puede leer aquí). */
export function readVideoDuration(file, timeoutMs = 8000) {
  return new Promise(resolve => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return resolve(null);
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = value => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}

// ------------------------------------------------------------------ estados de la cola

export const VIDEO_STATUS = {
  queued: { label: 'En cola', tone: 'pending', description: 'Esperando su turno para el análisis.' },
  processing: { label: 'Analizando', tone: 'active', description: 'Detectando la postura y calculando el IPT.' },
  completed: { label: 'Listo', tone: 'success', description: 'Análisis guardado en la ficha.' },
  failed: { label: 'Falló', tone: 'error', description: 'El análisis no se completó. Puedes reintentarlo.' }
};

/** Normaliza estados antiguos ('uploaded') al modelo de la cola. */
export function normalizeStatus(status) {
  if (status === 'uploaded') return 'queued';
  return VIDEO_STATUS[status] ? status : 'queued';
}

export function statusInfo(status) {
  return VIDEO_STATUS[normalizeStatus(status)];
}

/** ¿Hay videos que todavía pueden cambiar de estado? Entonces se sigue consultando. */
export function needsPolling(videos) {
  return Array.isArray(videos) && videos.some(v => ['queued', 'processing'].includes(normalizeStatus(v.status)));
}

export function canRetry(video) {
  return normalizeStatus(video.status) === 'failed';
}
