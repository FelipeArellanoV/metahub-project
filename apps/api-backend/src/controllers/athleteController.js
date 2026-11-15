/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 *
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 *
 * Módulo: Controlador de Atletas (athleteController.js)
 * Descripción: Maneja los endpoints REST para la gestión del ciclo de vida de atletas escolares,
 *              garantizando el aislamiento de datos por entrenador autenticado (HU-04).
 * =========================================================================================
 */

const dbRepository = require('../db/repository');
const v = require('../services/validation');

const ADULT_AGE = 18;
const PLACEHOLDER_GUARDIANS = ['apoderado no registrado', 'apoderado registrado', 'sin apoderado', 'n/a', 'na', '-'];

/** Respuesta de error sin detalles internos: solo los errores esperados (con statusCode) muestran su mensaje. */
function fail(res, err, fallback) {
  if (!err.statusCode) console.error('[atletas]', err);
  return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : fallback });
}

function notFound() {
  const error = new Error('Atleta no encontrado en el sistema.');
  error.statusCode = 404;
  return error;
}

/** Atleta del entrenador en sesión (404 si no existe, 403 si pertenece a otro entrenador). */
async function ownedAthlete(req) {
  const athlete = await dbRepository.getAthleteByIdForTrainer(req.params.id, req.user.id);
  if (!athlete) throw notFound();
  return athlete;
}

/**
 * Datos del consentimiento informado (CU-07 / HU-10, Ley 19.628 / 21.719).
 * Para menores de edad (o si no se conoce la edad) es obligatorio identificar al apoderado
 * o tutor legal que lo firmó.
 */
function consentInput(body, age) {
  const minor = !Number.isInteger(age) || age < ADULT_AGE;
  const guardianName = v.text(body.guardianName ?? body.guardian, { field: 'El nombre del apoderado', min: 3, max: 120, required: minor });
  if (minor && PLACEHOLDER_GUARDIANS.includes(guardianName.toLowerCase())) {
    throw v.invalid('Para un atleta menor de edad indica el nombre real del apoderado o tutor legal que firmó el consentimiento.');
  }
  return {
    guardianName: guardianName || null,
    guardianRelationship: v.text(body.guardianRelationship, { field: 'La relación con el atleta', min: 2, max: 60, required: false }) || null,
    guardianPhone: v.phone(body.guardianPhone, { field: 'El teléfono del apoderado' }) || null,
    expiresAt: v.isoDate(body.expiresAt, { field: 'La fecha de vencimiento', futureOnly: true }) || null,
    notes: v.text(body.notes, { field: 'Las observaciones', min: 0, max: 500, required: false }) || (minor ? '' : 'Otorgado por el propio atleta mayor de edad.')
  };
}

function wantsConsent(body) {
  if (body.consent !== undefined) return v.boolean(body.consent, { field: 'El consentimiento' });
  if (body.consentStatus !== undefined) return v.oneOf(body.consentStatus, ['vigente', 'pendiente'], { field: 'El estado del consentimiento' }) === 'vigente';
  return undefined;
}

function ageOf(athlete) {
  const formatted = dbRepository.formatAthlete(athlete);
  return formatted && Number.isInteger(formatted.age) ? formatted.age : undefined;
}

/**
 * Consulta la lista de atletas escolares asociados al entrenador en sesión
 * @route GET /api/athletes
 */
async function getAthletes(req, res) {
  try {
    const athletes = await dbRepository.getAthletesByTrainer(req.user.id);
    return res.json({ athletes });
  } catch (err) {
    return fail(res, err, 'No se pudo cargar la lista de atletas.');
  }
}

/**
 * Consulta los datos de un atleta específico por su ID
 * @route GET /api/athletes/:id
 */
async function getAthleteById(req, res) {
  try {
    return res.json({ athlete: await ownedAthlete(req) });
  } catch (err) {
    return fail(res, err, 'No se pudo cargar el atleta.');
  }
}

/**
 * Registra un nuevo atleta escolar vinculado al entrenador
 * @route POST /api/athletes
 */
async function createAthlete(req, res) {
  try {
    const body = req.body || {};
    const trainerId = req.user.id;
    const name = v.text(body.name, { field: 'El nombre completo', min: 2, max: 100 });
    const birthDate = v.isoDate(body.birthDate ?? body.birth_date, { field: 'La fecha de nacimiento', notFuture: true, minYear: 1920 });
    const age = v.integer(body.age, { field: 'La edad', min: 4, max: 100 });
    if (!birthDate && age === undefined) {
      throw v.invalid('El nombre completo y la fecha de nacimiento (o edad) del atleta son campos obligatorios.');
    }
    const organizationName = v.text(body.organizationName ?? body.school, { field: 'El club o establecimiento', min: 2, max: 160, required: false });

    // Cuenta de acceso opcional: ambos campos deben venir juntos
    const rawAccount = body.account && typeof body.account === 'object' ? body.account : {};
    const rawEmail = body.email ?? rawAccount.email;
    const rawPassword = body.password ?? rawAccount.password;
    let account = null;
    if (rawEmail || rawPassword) {
      if (!rawEmail || !rawPassword) throw v.invalid('Para crear la cuenta del atleta se requieren correo y contraseña temporal.');
      account = {
        email: v.email(rawEmail, { field: 'El correo de la cuenta' }),
        password: v.newPassword(rawPassword, { field: 'La contraseña temporal' })
      };
    }

    const granted = wantsConsent(body) === true;
    const computedAge = birthDate ? ageOf({ birthDate, age }) : age;
    const consent = granted ? consentInput(body, computedAge) : null;

    // Solo un consentimiento formal (con apoderado si es menor) deja la ficha con consentimiento vigente.
    const athlete = await dbRepository.createAthlete({
      name, age, birthDate: birthDate || null, consent: false, trainerId,
      organizationName: organizationName || '', account,
      consentRecord: consent ? { ...consent, recordedBy: trainerId } : null
    });

    return res.status(201).json({ message: 'Atleta escolar registrado exitosamente.', athlete });
  } catch (err) {
    return fail(res, err, 'No se pudo registrar el atleta.');
  }
}

/**
 * Actualiza la información (nombre, edad, fecha de nacimiento o consentimiento) de un atleta.
 * Otorgar el consentimiento exige los datos del apoderado; quitarlo queda registrado como revocación.
 * @route PUT /api/athletes/:id
 */
async function updateAthlete(req, res) {
  try {
    const body = req.body || {};
    const current = await ownedAthlete(req);
    const name = v.text(body.name, { field: 'El nombre completo', min: 2, max: 100, required: false });
    const birthDate = v.isoDate(body.birthDate ?? body.birth_date, { field: 'La fecha de nacimiento', notFuture: true, minYear: 1920 });
    const age = v.integer(body.age, { field: 'La edad', min: 4, max: 100 });
    const consentChange = wantsConsent(body);

    // Validar el consentimiento antes de modificar nada.
    const nextAge = birthDate ? ageOf({ birthDate, age }) : (age !== undefined ? age : ageOf(current));
    const consent = consentChange === true ? consentInput(body, nextAge) : null;

    let updated = await dbRepository.updateAthlete({
      athleteId: req.params.id, trainerId: req.user.id, name, age, birthDate
    });
    if (consentChange === true) {
      await dbRepository.createConsent({ athleteId: current.id, status: 'granted', recordedBy: req.user.id, ...consent });
      updated = { ...updated, consent: true };
    } else if (consentChange === false && current.consent) {
      await dbRepository.createConsent({ athleteId: current.id, status: 'revoked', recordedBy: req.user.id, notes: 'Revocado desde la ficha del atleta.' });
      updated = { ...updated, consent: false };
    }

    return res.json({ message: 'Datos del atleta actualizados exitosamente.', athlete: updated });
  } catch (err) {
    return fail(res, err, 'No se pudo actualizar el atleta.');
  }
}

/**
 * Elimina un atleta del sistema garantizando la pertenencia al entrenador
 * @route DELETE /api/athletes/:id
 */
async function deleteAthlete(req, res) {
  try {
    await ownedAthlete(req);
    await dbRepository.deleteAthlete({ athleteId: req.params.id, trainerId: req.user.id });
    return res.json({ message: 'Atleta eliminado exitosamente del registro.', id: Number(req.params.id) });
  } catch (err) {
    return fail(res, err, 'No se pudo eliminar el atleta.');
  }
}

/**
 * Consulta el estado y registro de consentimientos informados del atleta (CU-07 / HU-10)
 * @route GET /api/athletes/:id/consents
 */
async function getAthleteConsents(req, res) {
  try {
    const athlete = await ownedAthlete(req);
    const consents = await dbRepository.getConsentsByAthlete(athlete.id);
    const isValid = await dbRepository.isAthleteConsentValid(athlete.id);
    return res.json({ athleteId: athlete.id, hasValidConsent: isValid, consents });
  } catch (err) {
    return fail(res, err, 'No se pudo consultar el consentimiento.');
  }
}

/**
 * Registra, renueva o revoca el consentimiento informado del atleta (CU-07 / HU-10)
 * @route POST /api/athletes/:id/consents
 */
async function createAthleteConsent(req, res) {
  try {
    const athlete = await ownedAthlete(req);
    const body = req.body || {};
    const status = v.oneOf(body.status === undefined ? 'granted' : body.status, ['granted', 'revoked'], { field: 'El estado del consentimiento' });
    const details = status === 'granted'
      ? consentInput(body, ageOf(athlete))
      : { notes: v.text(body.notes, { field: 'Las observaciones', min: 0, max: 500, required: false }) || 'Consentimiento revocado.' };

    const consentEntry = await dbRepository.createConsent({
      athleteId: athlete.id, consentType: 'grabacion_biomecanica', status, recordedBy: req.user.id, ...details
    });

    return res.status(201).json({
      message: status === 'granted'
        ? 'Consentimiento informado registrado exitosamente.'
        : 'Consentimiento revocado. No se podrán subir ni analizar nuevos videos.',
      consent: consentEntry
    });
  } catch (err) {
    return fail(res, err, 'No se pudo registrar el consentimiento.');
  }
}

module.exports = {
  getAthletes,
  getAthleteById,
  createAthlete,
  updateAthlete,
  deleteAthlete,
  getAthleteConsents,
  createAthleteConsent
};
