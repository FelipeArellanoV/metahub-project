/**
 * Puerta de entrada autenticada al servicio de visión (/api/cv/*).
 *
 * Antes, nginx enviaba /api/cv directamente al servicio de visión y cualquiera podía mandarle
 * videos sin iniciar sesión (consumo de CPU sin control). Ahora la API exige JWT de entrenador,
 * aplica límite de tasa y tamaño, y reenvía la petición. El servicio de visión ya no se publica.
 */
const { Transform, Readable } = require('node:stream');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { limits, reject } = require('../services/rateLimit');

const LIMIT = 60 * 1024 * 1024;
const TIMEOUT_MS = Number(process.env.CV_TIMEOUT_MS) || 600000;
const ALLOWED = new Set(['POST /api/cv/process-video', 'POST /api/cv/metrics']);

function cvUrl() {
  return process.env.CV_SERVICE_URL || 'http://cv-service:8000';
}

async function forward(req, res, pathname) {
  const contentLength = Number(req.headers['content-length']);
  if (contentLength > LIMIT) {
    req.resume();
    return res.status(413).json({ error: 'El archivo supera el máximo permitido (60 MB).' });
  }
  let size = 0;
  const limiter = new Transform({
    transform(chunk, _enc, cb) {
      size += chunk.length;
      if (size > LIMIT) { const e = new Error('too large'); e.statusCode = 413; return cb(e); }
      cb(null, chunk);
    }
  });
  const body = req.pipe(limiter);
  let response;
  try {
    response = await fetch(cvUrl() + pathname, {
      method: 'POST',
      headers: { 'content-type': req.headers['content-type'] || 'application/octet-stream' },
      body: Readable.toWeb ? Readable.toWeb(body) : body,
      duplex: 'half',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
  } catch (err) {
    req.resume();
    if (size > LIMIT) return res.status(413).json({ error: 'El archivo supera el máximo permitido (60 MB).' });
    if (err.name === 'TimeoutError') return res.status(504).json({ error: 'El análisis tardó demasiado. Prueba con un clip más corto.' });
    console.error('[cv-proxy] servicio de visión no disponible:', err.message);
    return res.status(503).json({ error: 'El servicio de análisis no está disponible en este momento.' });
  }
  const data = await response.json().catch(() => null);
  if (response.status >= 500 || !data) {
    console.error('[cv-proxy] respuesta de error del servicio de visión:', response.status);
    return res.status(502).json({ error: 'El servicio de análisis no pudo procesar la solicitud.' });
  }
  // Los 4xx del servicio de visión describen un problema de la entrada (formato, duración…) y se muestran.
  return res.status(response.status).json(data);
}

async function handle(req, res) {
  const pathname = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // Comprobación de salud: pública y sin cuerpo.
  if (method === 'GET' && (pathname === '/api/cv/health' || pathname === '/api/cv')) {
    try {
      const response = await fetch(cvUrl() + '/health', { signal: AbortSignal.timeout(5000) });
      return res.status(response.ok ? 200 : 503).json({ status: response.ok ? 'ok' : 'degradado', service: 'metahub-cv-service' });
    } catch {
      return res.status(503).json({ status: 'no disponible', service: 'metahub-cv-service' });
    }
  }

  if (!ALLOWED.has(method + ' ' + pathname)) {
    req.resume();
    return res.status(404).json({ error: 'Ruta del servicio de visión no encontrada.' });
  }

  return verifyToken(req, res, () => requireRole(['entrenador', 'admin'])(req, res, () => {
    const limited = limits.cv.hit('usuario:' + req.user.id);
    if (!limited.allowed) {
      req.resume();
      return reject(res, limited, 'Has alcanzado el máximo de análisis directos. Espera unos minutos.');
    }
    return forward(req, res, pathname);
  }));
}

module.exports = { handle };
