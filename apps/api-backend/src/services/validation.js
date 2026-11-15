/**
 * Validación de entradas de la API. Cada función lanza un error con statusCode 400 y un
 * mensaje pensado para el usuario cuando el dato no es válido.
 */

function invalid(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

/** Texto obligatorio u opcional, recortado y con largo acotado. */
function text(value, { field, min = 1, max = 200, required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw invalid(`${field} es obligatorio.`);
    return undefined;
  }
  if (typeof value !== 'string') throw invalid(`${field} debe ser texto.`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw invalid(required || trimmed ? `${field} debe tener al menos ${min} caracteres.` : `${field} es obligatorio.`);
  if (trimmed.length > max) throw invalid(`${field} admite como máximo ${max} caracteres.`);
  // Caracteres de control (salvo saltos de línea y tabulaciones) no tienen uso legítimo aquí.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(trimmed)) throw invalid(`${field} contiene caracteres no permitidos.`);
  return trimmed;
}

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
function email(value, { field = 'El correo electrónico', required = true } = {}) {
  const v = text(value, { field, min: 3, max: 150, required });
  if (v === undefined) return undefined;
  if (!EMAIL.test(v)) throw invalid(`${field} no tiene un formato válido.`);
  return v.toLowerCase();
}

/**
 * Contraseña nueva: 8 a 128 caracteres (bcrypt solo usa los primeros 72 bytes; el tope evita
 * gastar CPU en entradas enormes).
 */
function newPassword(value, { field = 'La contraseña' } = {}) {
  if (typeof value !== 'string' || !value) throw invalid(`${field} es obligatoria.`);
  if (value.length < 8) throw invalid(`${field} debe contener al menos 8 caracteres.`);
  if (value.length > 128) throw invalid(`${field} admite como máximo 128 caracteres.`);
  return value;
}

/** Contraseña al iniciar sesión: solo tipo y largo máximo (no revela la política). */
function loginPassword(value) {
  if (typeof value !== 'string' || !value || value.length > 128) throw invalid('El correo electrónico y la contraseña son requeridos.');
  return value;
}

/** Fecha AAAA-MM-DD válida dentro de un rango. */
function isoDate(value, { field, required = false, notFuture = false, futureOnly = false, minYear = 1900 } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw invalid(`${field} es obligatoria.`);
    return value === undefined ? undefined : null;
  }
  if (typeof value !== 'string') throw invalid(`${field} debe ser una fecha AAAA-MM-DD.`);
  const day = value.split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  const date = match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])) : null;
  if (!date || date.getUTCMonth() !== +match[2] - 1 || date.getUTCDate() !== +match[3]) throw invalid(`${field} no es una fecha válida.`);
  if (+match[1] < minYear) throw invalid(`${field} no es una fecha válida.`);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (notFuture && date > today) throw invalid(`${field} no puede estar en el futuro.`);
  if (futureOnly && date <= today) throw invalid(`${field} debe ser una fecha futura.`);
  return day;
}

/** Entero dentro de un rango; acepta números o texto numérico. */
function integer(value, { field, min, max, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw invalid(`${field} es obligatorio.`);
    return undefined;
  }
  const n = typeof value === 'number' ? value : (typeof value === 'string' && /^-?\d+$/.test(value.trim()) ? Number(value) : NaN);
  if (!Number.isInteger(n) || n < min || n > max) throw invalid(`${field} debe ser un número entero entre ${min} y ${max}.`);
  return n;
}

/** Teléfono de contacto: dígitos, espacios, +, guiones y paréntesis; entre 8 y 15 dígitos. */
function phone(value, { field = 'El teléfono', required = false } = {}) {
  const v = text(value, { field, min: 6, max: 30, required });
  if (v === undefined) return undefined;
  const digits = v.replace(/\D/g, '');
  if (!/^[+\d\s()-]+$/.test(v) || digits.length < 8 || digits.length > 15) {
    throw invalid(`${field} no tiene un formato válido (ej.: +56 9 1234 5678).`);
  }
  return v.replace(/\s+/g, ' ');
}

function oneOf(value, allowed, { field }) {
  if (!allowed.includes(value)) throw invalid(`${field} debe ser uno de: ${allowed.join(', ')}.`);
  return value;
}

function boolean(value, { field }) {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw invalid(`${field} debe ser verdadero o falso.`);
  return value;
}

module.exports = { invalid, text, email, newPassword, loginPassword, isoDate, integer, oneOf, boolean, phone };
