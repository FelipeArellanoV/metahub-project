const { verify } = require('../config/jwt');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.statusCode = 401;
    return res.json({
      error: 'Acceso no autorizado. Token JWT requerido.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verify(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.statusCode = 401;
    return res.json({
      error: 'Token inválido o expirado.'
    });
  }
}

function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      res.statusCode = 403;
      return res.json({
        error: 'Permisos insuficientes para realizar esta acción.'
      });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
