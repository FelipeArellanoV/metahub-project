/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Middleware de Autenticación y Autorización (authMiddleware.js)
 * Descripción: Interceptores de solicitud HTTP para verificar la integridad y vigencia
 *              de tokens JWT, e inspeccionar roles de acceso autorizados (RNF03).
 * =========================================================================================
 */

const { verify } = require('../config/jwt');

/**
 * Middleware que verifica la presencia y validez de la cabecera 'Authorization: Bearer <token>'
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.statusCode = 401;
    return res.json({
      error: 'Acceso no autorizado. Token JWT requerido para acceder al sistema.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verify(token);
    req.user = decoded; // Inyecta la identidad del usuario en la solicitud
    next();
  } catch (err) {
    res.statusCode = 401;
    return res.json({
      error: 'Token de sesión inválido o expirado. Por favor, inicia sesión nuevamente.'
    });
  }
}

/**
 * Middleware para restringir rutas a roles específicos ('entrenador', 'admin')
 * @param {string|string[]} allowedRoles - Rol o lista de roles autorizados
 */
function requireRole(allowedRoles = []) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
      res.statusCode = 403;
      return res.json({
        error: 'Permisos insuficientes: tu perfil no posee autorización para realizar esta acción.'
      });
    }
    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
