/**
 * Límite de tasa en memoria (ventana fija por clave).
 *
 * Suficiente para una instancia de la API, que es el despliegue previsto. Con varias réplicas
 * habría que moverlo a un almacén compartido (Redis o PostgreSQL); ver docs/despliegue.md.
 */

const limiters = new Set();

function createLimiter({ name, windowMs, max }) {
  const buckets = new Map();
  const limiter = {
    name, windowMs, max,
    /** Registra un intento. Devuelve { allowed, remaining, retryAfter (s) }. */
    hit(key, now = Date.now()) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count++;
      const allowed = bucket.count <= max;
      return { allowed, remaining: Math.max(0, max - bucket.count), retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
    },
    /** Olvida una clave (por ejemplo, tras un inicio de sesión correcto). */
    clear(key) { buckets.delete(key); },
    reset() { buckets.clear(); },
    prune(now = Date.now()) { for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k); },
    size() { return buckets.size; }
  };
  limiters.add(limiter);
  return limiter;
}

const minutes = n => n * 60 * 1000;
const fromEnv = (name, fallback) => {
  const value = parseInt(process.env[name] || '', 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

// Límites por defecto; ajustables por variables de entorno sin tocar código.
const limits = {
  // Por IP + correo: frena la fuerza bruta contra una cuenta concreta.
  loginAccount: createLimiter({ name: 'login-cuenta', windowMs: minutes(15), max: fromEnv('RATE_LOGIN_PER_ACCOUNT', 5) }),
  // Por IP: frena el barrido de muchas cuentas desde un mismo origen.
  loginIp: createLimiter({ name: 'login-ip', windowMs: minutes(15), max: fromEnv('RATE_LOGIN_PER_IP', 30) }),
  register: createLimiter({ name: 'registro', windowMs: minutes(60), max: fromEnv('RATE_REGISTER_PER_IP', 10) }),
  // Subidas de video por usuario autenticado.
  upload: createLimiter({ name: 'subida', windowMs: minutes(60), max: fromEnv('RATE_UPLOAD_PER_USER', 20) }),
  // Análisis directo en el laboratorio de captura (CPU intensivo).
  cv: createLimiter({ name: 'vision', windowMs: minutes(10), max: fromEnv('RATE_CV_PER_USER', 10) })
};

// Limpieza periódica de ventanas vencidas para no acumular memoria.
setInterval(() => { for (const l of limiters) l.prune(); }, minutes(5)).unref();

function resetAll() { for (const l of limiters) l.reset(); }

/** Responde 429 con Retry-After. */
function reject(res, result, message) {
  res.setHeader('Retry-After', String(result.retryAfter));
  res.statusCode = 429;
  return res.json({ error: message || 'Demasiadas solicitudes. Espera un momento antes de reintentar.', retryAfter: result.retryAfter });
}

module.exports = { createLimiter, limits, resetAll, reject };
