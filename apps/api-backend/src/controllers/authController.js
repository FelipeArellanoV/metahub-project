/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Controlador de Autenticación y Seguridad (authController.js)
 * Descripción: Implementa el registro, inicio de sesión y consulta de perfil con
 *              cifrado seguro de contraseñas y emisión de tokens firmados JSON Web Tokens (JWT).
 * =========================================================================================
 */

const dbRepository = require('../db/repository');
const { sign } = require('../config/jwt');

/**
 * Registra un nuevo entrenador en la plataforma MetaHub
 * @route POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { name, email, password, organizationName } = req.body || {};
    if (organizationName !== undefined && (typeof organizationName !== 'string' || !organizationName.trim() || organizationName.length > 160)) {
      return res.status(400).json({ error: 'Indica tu club o establecimiento (máximo 160 caracteres).' });
    }

    if (!name || !email || !password) {
      res.statusCode = 400;
      return res.json({
        error: 'El nombre completo, correo electrónico y contraseña son obligatorios.'
      });
    }

    if (password.length < 6) {
      res.statusCode = 400;
      return res.json({
        error: 'La contraseña debe contener al menos 6 caracteres por política de seguridad.'
      });
    }

    // Por directriz de seguridad RNF03, el registro público asigna estrictamente el rol 'entrenador'
    const user = await dbRepository.createUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: 'entrenador',
      organizationName: (organizationName || '').trim()
    });

    // Emisión de token JWT con tiempo de vida estricto (15 minutos)
    const token = sign({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    res.statusCode = 201;
    return res.json({
      message: 'Entrenador registrado exitosamente en MetaHub.',
      user,
      token
    });
  } catch (err) {
    res.statusCode = err.statusCode || 500;
    return res.json({ error: err.message });
  }
}

/**
 * Autentica un entrenador existente mediante credenciales y emite token JWT
 * @route POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.statusCode = 400;
      return res.json({
        error: 'El correo electrónico y la contraseña son requeridos.'
      });
    }

    const user = await dbRepository.findUserByEmail(email.trim().toLowerCase());
    if (!user) {
      res.statusCode = 401;
      return res.json({
        error: 'Credenciales inválidas. Comprueba el correo o contraseña ingresada.'
      });
    }

    const isValid = await dbRepository.validatePassword(user, password);
    if (!isValid) {
      res.statusCode = 401;
      return res.json({
        error: 'Credenciales inválidas. Comprueba el correo o contraseña ingresada.'
      });
    }

    const safeUser = dbRepository.sanitizeUser(user);
    const token = sign({
      id: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
      name: safeUser.name
    });

    res.statusCode = 200;
    return res.json({
      message: 'Inicio de sesión exitoso en MetaHub Performance Lab.',
      user: safeUser,
      token
    });
  } catch (err) {
    res.statusCode = 500;
    return res.json({ error: err.message });
  }
}

/**
 * Obtiene el perfil del usuario autenticado a partir de su JWT
 * @route GET /api/auth/me
 */
async function getProfile(req, res) {
  try {
    const user = await dbRepository.findUserById(req.user.id);
    if (!user) {
      res.statusCode = 404;
      return res.json({ error: 'Perfil de entrenador no encontrado.' });
    }
    return res.json({ user });
  } catch (err) {
    res.statusCode = 500;
    return res.json({ error: err.message });
  }
}

module.exports = {
  register,
  login,
  getProfile
};
