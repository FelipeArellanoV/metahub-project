/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Configuración y Motor Criptográfico JWT (jwt.js)
 * Descripción: Implementa la firma y validación de tokens JSON Web Token bajo HMAC-SHA256.
 *              Incluye fallback nativo de alta fidelidad mediante módulo 'crypto' de Node.js.
 * =========================================================================================
 */

const crypto = require('crypto');
let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  jwt = null;
}

// Clave secreta para la firma criptográfica de tokens (configurable mediante variable de entorno)
const JWT_SECRET = process.env.JWT_SECRET || 'metahub_secret_key_change_in_production';

// Ventana de expiración estricta de 15 minutos para salvaguardar sesiones deportivas (RNF03)
const EXPIRES_IN = '15m';

/**
 * Codificación Base64URL conforme al estándar RFC 7515
 */
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Decodificación Base64URL conforme al estándar RFC 7515
 */
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Genera y firma un token JWT para la carga útil provista
 * @param {object} payload - Datos de identidad del usuario a codificar
 * @param {string} secret - Clave secreta para la firma HMAC
 * @returns {string} Token JWT firmado en formato header.payload.signature
 */
function sign(payload, secret = JWT_SECRET) {
  if (jwt) {
    return jwt.sign(payload, secret, { expiresIn: EXPIRES_IN });
  }

  // Fallback nativo mediante módulo crypto
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + 900 }; // 900 segundos = 15 minutos
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Valida la firma y vigencia temporal de un token JWT
 * @param {string} token - Token JWT a verificar
 * @param {string} secret - Clave secreta con la que fue generado
 * @returns {object} Carga útil decodificada
 */
function verify(token, secret = JWT_SECRET) {
  if (jwt) {
    return jwt.verify(token, secret);
  }

  // Fallback nativo mediante módulo crypto
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('El formato del token JWT es estructuralmente inválido.');
  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  if (signature !== expectedSignature) throw new Error('Firma criptográfica JWT inválida.');
  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('El token de sesión JWT ha expirado.');
  return payload;
}

module.exports = {
  JWT_SECRET,
  EXPIRES_IN,
  sign,
  verify
};
