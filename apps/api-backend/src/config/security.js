/**
 * Configuración de seguridad de la API: entorno, CORS, IP del cliente y encabezados.
 *
 * En producción (NODE_ENV=production) las variables críticas son obligatorias y la API
 * se niega a arrancar sin ellas (assertProductionConfig). En desarrollo hay valores
 * cómodos por defecto para localhost.
 */

const DEV_ORIGINS = ['http://localhost', 'http://localhost:5173', 'http://127.0.0.1', 'http://127.0.0.1:5173'];
const PLACEHOLDER_SECRETS = ['reemplazar_por_un_secreto_largo_y_aleatorio', 'metahub_secret_key_change_in_production'];

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/** Orígenes permitidos para CORS: CORS_ORIGINS separado por comas. Sin variable: solo localhost en desarrollo, ninguno en producción. */
function allowedOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (raw !== undefined) {
    return raw.split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean);
  }
  return isProduction() ? [] : DEV_ORIGINS;
}

/**
 * Comprueba la configuración obligatoria de producción. Lanza un error con la lista de problemas.
 */
function assertProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const problems = [];
  const secret = env.JWT_SECRET || '';
  if (!secret) problems.push('JWT_SECRET no está definido.');
  else if (secret.length < 32 || PLACEHOLDER_SECRETS.includes(secret)) problems.push('JWT_SECRET debe ser aleatorio y de al menos 32 caracteres (openssl rand -hex 32).');
  if (!env.DATABASE_URL) problems.push('DATABASE_URL no está definido.');
  const origins = (env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length) problems.push('CORS_ORIGINS no está definido (ej.: https://metahub.ejemplo.cl).');
  else if (origins.some(o => o === '*' || !/^https:\/\//.test(o))) problems.push('CORS_ORIGINS solo admite orígenes https:// explícitos, sin comodín.');
  if (problems.length) {
    const error = new Error('Configuración de producción incompleta:\n - ' + problems.join('\n - '));
    error.code = 'CONFIG_INVALIDA';
    throw error;
  }
}

/**
 * Aplica CORS a la respuesta. Devuelve false si la petición trae un Origin no permitido.
 * Las peticiones del mismo origen (sin cabecera Origin, o con el propio host) no necesitan CORS.
 */
/**
 * Un nombre de host con punto final ("localhost.", "metahub.cl.") es el mismo host en DNS.
 * Se compara sin ese punto para no rechazar al navegador que lo escribe así.
 */
function withoutTrailingDot(value) {
  return String(value).replace(/\/+$/, '').replace(/^((?:https?:\/\/)?[^/:]+)\.(?=$|:)/i, '$1').toLowerCase();
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');
  if (!origin) return true;
  const normalized = String(origin).replace(/\/+$/, '');
  const comparable = withoutTrailingDot(normalized);
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const ownHost = host ? withoutTrailingDot(host) : '';
  const sameOrigin = Boolean(ownHost) && (comparable === 'https://' + ownHost || comparable === 'http://' + ownHost);
  if (!sameOrigin && !allowedOrigins().map(withoutTrailingDot).includes(comparable)) return false;
  res.setHeader('Access-Control-Allow-Origin', normalized);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}

/** Encabezados de seguridad para todas las respuestas de la API (JSON o video). */
function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Cache-Control', 'no-store');
}

/**
 * IP del cliente. TRUST_PROXY_HOPS indica cuántos proxies propios hay delante de la API
 * (desarrollo: 1 = nginx; producción: 2 = Caddy + nginx). Se toma la dirección que
 * agregó el proxy más externo, de modo que un X-Forwarded-For falsificado no cambia la IP.
 */
function clientIp(req) {
  const remote = (req.socket && req.socket.remoteAddress) || '';
  const hops = Math.max(0, parseInt(process.env.TRUST_PROXY_HOPS || '0', 10) || 0);
  if (!hops) return remote || 'desconocida';
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  const chain = [...forwarded, remote].filter(Boolean);
  return chain[Math.max(0, chain.length - 1 - hops)] || remote || 'desconocida';
}

module.exports = { isProduction, allowedOrigins, assertProductionConfig, applyCors, applySecurityHeaders, clientIp, PLACEHOLDER_SECRETS };
