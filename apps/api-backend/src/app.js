/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Enrutador y Servidor Principal de Aplicación (app.js)
 * Descripción: Define el enrutamiento HTTP, políticas de CORS, análisis de payloads JSON,
 *              servidor de archivos estáticos para la interfaz PWA y despacho de controladores.
 * =========================================================================================
 */

const authController = require('./controllers/authController');
const athleteController = require('./controllers/athleteController');
const sessionController = require('./controllers/sessionController');
const portalController = require('./controllers/portalController');
const sessionReviewController = require('./controllers/sessionReviewController');
const athleteVideoController = require('./controllers/athleteVideoController');
const organizationController = require('./controllers/organizationController');
const clubController = require('./controllers/clubController');
const collaborationController = require('./controllers/collaborationController');
const cvProxyController = require('./controllers/cvProxyController');
const { verifyToken, requireRole } = require('./middleware/authMiddleware');
const { applyCors, applySecurityHeaders } = require('./config/security');
const { limits, reject } = require('./services/rateLimit');

// Tamaño máximo de un cuerpo JSON. Los videos no pasan por aquí (se transmiten como binario).
const JSON_LIMIT = 2 * 1024 * 1024;

// La interfaz web la sirve nginx (apps/frontend). La API ya no entrega archivos estáticos.

/**
 * Función auxiliar para parsear de forma asíncrona cuerpos de solicitud en formato JSON
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    let exceeded = false;
    req.on('error', reject);
    req.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > JSON_LIMIT) {
        exceeded = true;
        const error = new Error('El cuerpo JSON supera el máximo de 2 MiB.');
        error.statusCode = 413;
        reject(error);
        return;
      }
      if (!exceeded) data += chunk;
    });
    req.on('end', () => {
      if (exceeded) return;
      try {
        const parsed = data ? JSON.parse(data) : {};
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        resolve(parsed);
      } catch {
        const error = new Error('Se requiere un objeto JSON válido.');
        error.statusCode = 400;
        reject(error);
      }
    });
  });
}

/**
 * Despachador central de peticiones HTTP de la API de MetaHub
 */
async function app(req, res) {
  try {
    return await dispatch(req, res);
  } catch (err) {
    // Último recurso: nunca devolver trazas ni mensajes internos.
    console.error('[api] error no controlado en', req.method, req.url.split('?')[0], err);
    if (res.headersSent) return res.destroy();
    res.statusCode = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    return res.json({ error: err.statusCode && err.statusCode < 500 ? err.message : 'Error interno del servidor.' });
  }
}

async function dispatch(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // Helper de serialización JSON. Las respuestas 5xx nunca exponen el mensaje interno.
  res.json = function(data) {
    if (!res.statusCode) res.statusCode = 200;
    if (res.statusCode >= 500 && data && typeof data.error === 'string' && !GENERIC_5XX.has(data.error)) {
      console.error('[api] error', res.statusCode, 'en', method, url + ':', data.error);
      data = { ...data, error: 'Error interno del servidor. Intenta nuevamente en unos minutos.' };
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
  };

  res.status = function(code) {
    res.statusCode = code;
    return res;
  };

  applySecurityHeaders(res);
  const corsAllowed = applyCors(req, res);

  // Manejo de peticiones preflight CORS (OPTIONS)
  if (method === 'OPTIONS') {
    res.statusCode = corsAllowed ? 204 : 403;
    return res.end();
  }
  if (!corsAllowed) {
    req.resume();
    return res.status(403).json({ error: 'Origen no permitido.' });
  }

  if (!url.startsWith('/api')) {
    req.resume();
    return res.status(404).json({ error: 'Ruta no encontrada. La interfaz web se sirve desde el frontend.' });
  }

  // Servicio de visión: autenticado y con límite de tasa (el cuerpo es multipart, no JSON).
  if (url === '/api/cv' || url.startsWith('/api/cv/')) {
    return cvProxyController.handle(req, res);
  }

  // El video llega como binario: no debe pasar por el parser JSON.
  if (method === 'POST' && (url === '/api/portal/videos' || url === '/api/capture/videos')) {
    return verifyToken(req, res, () => {
      const limited = limits.upload.hit('usuario:' + req.user.id);
      if (!limited.allowed) {
        req.resume();
        return reject(res, limited, 'Has alcanzado el máximo de videos por hora. Intenta más tarde.');
      }
      return athleteVideoController.handle(req, res);
    });
  }

  // Parsear cuerpo de la petición si es POST o PUT
  if (method !== 'GET') {
    try {
      req.body = await parseJsonBody(req);
    } catch (error) {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
  } else {
    req.body = {};
  }

  // =======================================================================================
  // DEFINICIÓN DE RUTAS DEL API
  // =======================================================================================

  // Ruta raíz de API: Documentación informativa
  if (method === 'GET' && (url === '/api' || url === '/api/info')) {
    return res.json({
      name: 'MetaHub API Backend',
      version: '1.1.0',
      description: 'API REST para gestión de atletas, sesiones y autenticación JWT en MetaHub (Memoria UCT)',
      autores: ['Felipe Arellano Vargas', 'Sofía Henríquez Soto'],
      profesorGuia: 'Dr. Marcos Lévano',
      endpoints: {
        health: 'GET /api/health',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me (Requiere JWT)',
        athletes: 'GET, POST, PUT /:id, DELETE /:id /api/athletes (Requiere JWT)',
        sessions: 'GET, POST /api/sessions, GET /api/athletes/:id/sessions (Requiere JWT)',
        portal: 'GET /api/portal/me (Requiere JWT con rol atleta)'
      }
    });
  }

  // Endpoint de comprobación de salud del servicio (Health Check)
  if (method === 'GET' && url === '/api/health') {
    return res.json({ status: 'ok', service: 'metahub-api-backend' });
  }

  if (url === '/api/organization') {
    return verifyToken(req, res, () => organizationController.handle(req, res));
  }
  if (url === '/api/capture/videos' || url.startsWith('/api/capture/videos/') || url === '/api/portal/videos' || url.startsWith('/api/portal/videos/') || url.startsWith('/api/videos/')) {
    return verifyToken(req, res, () => athleteVideoController.handle(req, res));
  }

  if (url === '/api/reviews' || url.startsWith('/api/reviews/')) {
    return verifyToken(req, res, () => sessionReviewController.handle(req, res));
  }

  // Rutas públicas de autenticación
  if (method === 'POST' && url === '/api/auth/register') {
    return authController.register(req, res);
  }

  if (method === 'POST' && url === '/api/auth/login') {
    return authController.login(req, res);
  }

  // Rutas protegidas - Perfil del usuario
  if (method === 'GET' && url === '/api/auth/me') {
    return verifyToken(req, res, () => authController.getProfile(req, res));
  }

  if (url === '/api/roster' || url.startsWith('/api/roster/') || url === '/api/clubs' || url.startsWith('/api/clubs/')) {
    return verifyToken(req, res, () => clubController.handle(req, res));
  }

  // Seguimiento compartido: el servicio valida propiedad y rol en cada operación.
  if (url === '/api/collaboration' || url.startsWith('/api/collaboration/')) {
    return verifyToken(req, res, () => collaborationController.handle(req, res));
  }

  // Rutas protegidas - Portal del Atleta (solo rol 'atleta'; datos propios segun el JWT)
  if (method === 'GET' && url === '/api/portal/me') {
    return verifyToken(req, res, () => {
      return requireRole(['atleta'])(req, res, () => portalController.getMyPortal(req, res));
    });
  }

  // Rutas protegidas - Gestión de Sesiones de Carrera
  if (url === '/api/sessions') {
    return verifyToken(req, res, () => {
      return requireRole(['entrenador', 'admin'])(req, res, () => {
        if (method === 'POST') {
          return sessionController.createSession(req, res);
        }
        if (method === 'GET') {
          return sessionController.getAllSessions(req, res);
        }
        res.statusCode = 405;
        return res.json({ error: 'Método HTTP no permitido en /api/sessions.' });
      });
    });
  }

  // Rutas protegidas - Gestión de Atletas Escolares (CRUD)
  if (url === '/api/athletes' || url.startsWith('/api/athletes/')) {
    return verifyToken(req, res, () => {
      return requireRole(['entrenador', 'admin'])(req, res, () => {
        if (method === 'GET' && url === '/api/athletes') {
          return athleteController.getAthletes(req, res);
        }

        if (method === 'POST' && url === '/api/athletes') {
          return athleteController.createAthlete(req, res);
        }

        // GET /api/athletes/:athleteId/sessions
        const sessionsMatch = url.match(/^\/api\/athletes\/(\d+)\/sessions$/);
        if (method === 'GET' && sessionsMatch) {
          req.params = { athleteId: sessionsMatch[1] };
          return sessionController.getAthleteSessions(req, res);
        }

        // GET o POST /api/athletes/:id/consents (CU-07 / HU-10)
        const consentsMatch = url.match(/^\/api\/athletes\/(\d+)\/consents$/);
        if (consentsMatch) {
          req.params = { id: consentsMatch[1] };
          if (method === 'GET') {
            return athleteController.getAthleteConsents(req, res);
          }
          if (method === 'POST') {
            return athleteController.createAthleteConsent(req, res);
          }
        }

        // GET, PUT o DELETE /api/athletes/:id
        const idMatch = url.match(/^\/api\/athletes\/(\d+)$/);
        if (idMatch) {
          req.params = { id: idMatch[1] };
          if (method === 'GET') {
            return athleteController.getAthleteById(req, res);
          }
          if (method === 'PUT') {
            return athleteController.updateAthlete(req, res);
          }
          if (method === 'DELETE') {
            return athleteController.deleteAthlete(req, res);
          }
        }

        res.statusCode = 404;
        return res.json({ error: 'Recurso de atletas no encontrado en la API.' });
      });
    });
  }

  // Ruta 404 por defecto
  res.statusCode = 404;
  return res.json({ error: 'Ruta no encontrada en la API de MetaHub.' });
}

// Mensajes genéricos que ya son seguros (no se reemplazan ni se vuelven a registrar).
const GENERIC_5XX = new Set([
  'Error interno del servidor.',
  'Error interno del servidor. Intenta nuevamente en unos minutos.',
  'La carga de videos requiere PostgreSQL.'
]);

module.exports = app;
