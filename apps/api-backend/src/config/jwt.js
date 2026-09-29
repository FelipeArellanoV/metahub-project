const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'metahub_secret_key_change_in_production';
const EXPIRES_IN = '15m'; // Expiración de 15 minutos según RNF03 e informe

function sign(payload, secret = JWT_SECRET) {
  return jwt.sign(payload, secret, { expiresIn: EXPIRES_IN });
}

function verify(token, secret = JWT_SECRET) {
  return jwt.verify(token, secret);
}

module.exports = {
  JWT_SECRET,
  EXPIRES_IN,
  sign,
  verify
};
