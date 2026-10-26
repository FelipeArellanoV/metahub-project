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

const fs = require('fs');
const path = require('path');
const authController = require('./controllers/authController');
const athleteController = require('./controllers/athleteController');
const sessionController = require('./controllers/sessionController');
const portalController = require('./controllers/portalController');
const { verifyToken, requireRole } = require('./middleware/authMiddleware');

// Directorio raíz de la interfaz web frontend para entrega estática
const FRONTEND_DIR = path.resolve(__dirname, '../../frontend');

// Mapeo de extensiones a tipos MIME estándar
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.jsx': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

/**
 * Despachador de archivos estáticos para servir la interfaz web PWA
 */
function serveStatic(req, res, targetUrl) {
  let relativePath = targetUrl === '/' ? '/preview.html' : targetUrl;
  const filePath = path.join(FRONTEND_DIR, relativePath);

  // Verificación de seguridad para prevenir ataques de Directory Traversal
  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.statusCode = 403;
    res.end('Acceso denegado: ruta no permitida.');
    return true;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    const content = fs.readFileSync(filePath);
    res.end(content);
    return true;
  }

  return false;
}

/**
 * Función auxiliar para parsear de forma asíncrona cuerpos de solicitud en formato JSON
 */
function parseJsonBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

/**
 * Despachador central de peticiones HTTP de la API de MetaHub
 */
async function app(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // Helper de serialización y cabeceras de respuesta JSON
  res.json = function(data) {
    if (!res.statusCode) res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.end(JSON.stringify(data));
  };
  
  res.status = function(code) {
    res.statusCode = code;
    return res;
  };

  // Manejo de peticiones preflight CORS (OPTIONS)
  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    return res.end();
  }

  // Entrega de interfaz web estática si la ruta no pertenece al prefijo '/api'
  if (method === 'GET' && !url.startsWith('/api')) {
    const served = serveStatic(req, res, url);
    if (served) return;
  }

  // Parsear cuerpo de la petición si es POST o PUT
  if (method !== 'GET') {
    req.body = await parseJsonBody(req);
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
  return res.json({ error: `Ruta no encontrada en MetaHub: ${method} ${url}` });
}

module.exports = app;
