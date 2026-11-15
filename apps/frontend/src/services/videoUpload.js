// Subida de video con progreso real (XMLHttpRequest informa los bytes enviados; fetch no).

const BASE = import.meta.env?.VITE_API_BASE || '';

function token() {
  try { return localStorage.getItem('metahub_token') || ''; } catch { return ''; }
}

function expireSession() {
  try {
    localStorage.removeItem('metahub_token');
    localStorage.removeItem('metahub_user');
  } catch { /* almacenamiento no disponible */ }
  location.assign('/#/login');
}

/**
 * Sube un archivo al endpoint de captura.
 * @param {object} p
 * @param {string} p.query      parámetros (requestId, filename, athleteId)
 * @param {File}   p.file
 * @param {(sent:number,total:number)=>void} [p.onProgress]
 * @param {AbortSignal} [p.signal]
 * @returns {Promise<object>} respuesta JSON de la API
 */
export function uploadVideo({ query, file, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE + '/api/capture/videos?' + query);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token());
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.responseType = 'json';
    xhr.upload.onprogress = event => {
      if (onProgress) onProgress(event.loaded, event.lengthComputable ? event.total : file.size);
    };
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status === 401) { expireSession(); return reject(new Error('Tu sesión expiró. Inicia sesión de nuevo.')); }
      if (xhr.status === 429) return reject(new Error(data.error || 'Demasiadas subidas seguidas. Espera un momento.'));
      if (xhr.status < 200 || xhr.status >= 300) return reject(new Error(data.error || 'No se pudo subir el video.'));
      resolve(data);
    };
    xhr.onerror = () => reject(new Error('Se perdió la conexión durante la subida. Puedes reintentar: no se duplicará el video.'));
    xhr.ontimeout = () => reject(new Error('La subida tardó demasiado. Revisa tu conexión y reintenta.'));
    xhr.onabort = () => { const e = new Error('Subida cancelada.'); e.name = 'AbortError'; reject(e); };
    if (signal) {
      if (signal.aborted) return xhr.abort();
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}

/** Llamadas JSON a la API de videos (historial, reintento, estado). */
export async function videoRequest(path, options = {}) {
  const response = await fetch(BASE + path, {
    ...options,
    headers: { Authorization: 'Bearer ' + token(), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) { expireSession(); throw new Error('Tu sesión expiró.'); }
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
  return data;
}
