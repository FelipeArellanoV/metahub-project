const authController = require('./controllers/authController');
const athleteController = require('./controllers/athleteController');
const sessionController = require('./controllers/sessionController');
const { verifyToken, requireRole } = require('./middleware/authMiddleware');

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

async function app(req, res) {
  const url = req.url.split('?')[0];
  const method = req.method.toUpperCase();

  // Helper de respuesta JSON
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

  // Parsear body si no es GET
  if (method !== 'GET') {
    req.body = await parseJsonBody(req);
  } else {
    req.body = {};
  }

  // Ruta raíz: Bienvenida e información del API
  if (method === 'GET' && (url === '/' || url === '/api')) {
    return res.json({
      name: 'MetaHub API Backend',
      version: '1.0.0',
      description: 'API REST para gestión de atletas, sesiones y autenticación JWT en MetaHub',
      endpoints: {
        health: '/api/health',
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me (Requiere JWT)',
        athletes: 'GET, POST, PUT /:id, DELETE /:id /api/athletes (Requiere JWT)',
        sessions: 'POST /api/sessions, GET /api/athletes/:id/sessions (Requiere JWT)'
      }
    });
  }

  // Endpoint de salud
  if (method === 'GET' && url === '/api/health') {
    return res.json({ status: 'ok', service: 'metahub-api-backend' });
  }

  // Endpoints públicos de autenticación
  if (method === 'POST' && url === '/api/auth/register') {
    return authController.register(req, res);
  }

  if (method === 'POST' && url === '/api/auth/login') {
    return authController.login(req, res);
  }

  // Rutas protegidas - /api/auth/me
  if (method === 'GET' && url === '/api/auth/me') {
    return verifyToken(req, res, () => authController.getProfile(req, res));
  }

  // Rutas protegidas - /api/sessions
  if (method === 'POST' && url === '/api/sessions') {
    return verifyToken(req, res, () => {
      return requireRole(['entrenador', 'admin'])(req, res, () => sessionController.createSession(req, res));
    });
  }

  // Rutas protegidas - /api/athletes
  if (url === '/api/athletes' || url.startsWith('/api/athletes/')) {
    return verifyToken(req, res, () => {
      return requireRole(['entrenador', 'admin'])(req, res, () => {
        if (method === 'GET' && url === '/api/athletes') {
          return athleteController.getAthletes(req, res);
        }

        if (method === 'POST' && url === '/api/athletes') {
          return athleteController.createAthlete(req, res);
        }

        // GET /api/athletes/:id/sessions
        const sessionsMatch = url.match(/^\/api\/athletes\/(\d+)\/sessions$/);
        if (method === 'GET' && sessionsMatch) {
          req.params = { athleteId: sessionsMatch[1] };
          return sessionController.getAthleteSessions(req, res);
        }

        // GET / PUT / DELETE /api/athletes/:id
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
        return res.json({ error: 'Ruta de atletas no encontrada.' });
      });
    });
  }

  res.statusCode = 404;
  return res.json({ error: `Ruta no encontrada: ${method} ${url}` });
}

module.exports = app;
