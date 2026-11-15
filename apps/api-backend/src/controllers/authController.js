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
const { clientIp } = require('../config/security');
const { limits, reject } = require('../services/rateLimit');
const v = require('../services/validation');

let bcrypt = null;
try { bcrypt = require('bcryptjs'); } catch { bcrypt = null; }
// Hash de relleno: si el correo no existe se compara igual contra él, para que el tiempo de
// respuesta no revele qué correos están registrados.
const DUMMY_HASH = bcrypt ? bcrypt.hashSync('metahub-dummy-password', 10) : null;

function tokenFor(user) {
  return sign({ id: user.id, email: user.email, role: user.role, name: user.name });
}

/**
 * Registra un nuevo entrenador en la plataforma MetaHub
 * @route POST /api/auth/register
 */
async function register(req, res) {
  const limited = limits.register.hit(clientIp(req));
  if (!limited.allowed) return reject(res, limited, 'Demasiados registros desde esta conexión. Intenta más tarde.');
  try {
    const body = req.body || {};
    const name = v.text(body.name, { field: 'El nombre completo', min: 2, max: 100 });
    const email = v.email(body.email);
    const password = v.newPassword(body.password);
    const organizationName = v.text(body.organizationName, { field: 'El club o establecimiento', min: 2, max: 160, required: false });

    // Por directriz de seguridad RNF03, el registro público asigna estrictamente el rol 'entrenador'
    const user = await dbRepository.createUser({
      name, email, password, role: 'entrenador', organizationName: organizationName || ''
    });

    res.statusCode = 201;
    return res.json({ message: 'Entrenador registrado exitosamente en MetaHub.', user, token: tokenFor(user) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'No se pudo completar el registro.' });
  }
}

/**
 * Autentica una cuenta mediante credenciales y emite token JWT
 * @route POST /api/auth/login
 */
async function login(req, res) {
  const ip = clientIp(req);
  const byIp = limits.loginIp.hit(ip);
  if (!byIp.allowed) return reject(res, byIp, 'Demasiados intentos de inicio de sesión. Espera unos minutos.');
  try {
    const body = req.body || {};
    if (typeof body.email !== 'string' || !body.email.trim() || body.email.length > 150) {
      throw v.invalid('El correo electrónico y la contraseña son requeridos.');
    }
    const email = body.email.trim().toLowerCase();
    const password = v.loginPassword(body.password);

    const accountKey = ip + '|' + email;
    const byAccount = limits.loginAccount.hit(accountKey);
    if (!byAccount.allowed) return reject(res, byAccount, 'Demasiados intentos para esta cuenta. Espera unos minutos.');

    const user = await dbRepository.findUserByEmail(email);
    const isValid = user
      ? await dbRepository.validatePassword(user, password)
      : (DUMMY_HASH ? (await bcrypt.compare(password, DUMMY_HASH), false) : false);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas. Comprueba el correo o contraseña ingresada.' });
    }

    limits.loginAccount.clear(accountKey);
    const safeUser = dbRepository.sanitizeUser(user);
    return res.status(200).json({ message: 'Inicio de sesión exitoso en MetaHub Performance Lab.', user: safeUser, token: tokenFor(safeUser) });
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : 'No se pudo iniciar sesión. Intenta nuevamente.' });
  }
}

/**
 * Obtiene el perfil del usuario autenticado a partir de su JWT
 * @route GET /api/auth/me
 */
async function getProfile(req, res) {
  try {
    const user = await dbRepository.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'Perfil no encontrado.' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'No se pudo cargar el perfil.' });
  }
}

module.exports = {
  register,
  login,
  getProfile
};
