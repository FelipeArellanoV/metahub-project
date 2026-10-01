const crypto = require('crypto');
let jwt;
try {
  jwt = require('jsonwebtoken');
} catch (e) {
  jwt = null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'metahub_secret_key_change_in_production';
const EXPIRES_IN = '15m'; // 15 minutos

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

function sign(payload, secret = JWT_SECRET) {
  if (jwt) {
    return jwt.sign(payload, secret, { expiresIn: EXPIRES_IN });
  }

  // Fallback nativo crypto si no hay node_modules local
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + 900 };
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verify(token, secret = JWT_SECRET) {
  if (jwt) {
    return jwt.verify(token, secret);
  }

  // Fallback nativo crypto si no hay node_modules local
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Formato de token JWT inválido');
  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', secret).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  if (signature !== expectedSignature) throw new Error('Firma JWT inválida');
  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token JWT expirado');
  return payload;
}

module.exports = {
  JWT_SECRET,
  EXPIRES_IN,
  sign,
  verify
};
