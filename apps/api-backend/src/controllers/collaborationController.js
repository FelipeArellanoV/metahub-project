const service = require('../services/collaboration');

async function handle(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const url = new URL(req.url, 'http://localhost');
    const method = req.method.toUpperCase();
    if (method === 'GET' && url.pathname === '/api/collaboration') {
      const id = url.searchParams.has('athleteId') ? url.searchParams.get('athleteId') : undefined;
      return res.json(await service.snapshot(req.user, id));
    }
    const match = url.pathname.match(/^\/api\/collaboration\/(tasks|appointments|messages)(?:\/([a-zA-Z0-9-]{1,80}))?$/);
    if (!match) return res.status(404).json({ error: 'Recurso no encontrado.' });
    const resource = { tasks: 'task', appointments: 'appointment', messages: 'message' }[match[1]];
    const body = req.body || {};
    if (method === 'POST' && !match[2]) {
      return res.status(201).json(await service.mutate(req.user, body.athleteId, resource + '.create', null, body));
    }
    if (method === 'PUT' && match[2] && resource !== 'message') {
      return res.json(await service.mutate(req.user, body.athleteId, resource + '.update', match[2], body));
    }
    return res.status(405).json({ error: 'Método no permitido.' });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status === 500) console.error('Error collaboration:', error.code || error.message);
    return res.status(status).json({
      error: status === 500 ? 'No fue posible guardar o consultar el seguimiento. Verifica la migración y conexión a la base de datos.' : error.message
    });
  }
}
module.exports = { handle };
