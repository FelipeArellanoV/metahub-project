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

/**
 * Consulta la lista de atletas escolares asociados al entrenador en sesión
 * @route GET /api/athletes
 */
async function getAthletes(req, res) {
  try {
    const trainerId = req.user.id;
    const athletes = await dbRepository.getAthletesByTrainer(trainerId);
    return res.json({ athletes });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * Consulta los datos de un atleta específico por su ID
 * @route GET /api/athletes/:id
 */
async function getAthleteById(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;
    const athlete = await dbRepository.getAthleteByIdForTrainer(athleteId, trainerId);
    
    if (!athlete) {
      return res.status(404).json({ error: 'Atleta no encontrado en el sistema.' });
    }

    return res.json({ athlete });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * Registra un nuevo atleta escolar vinculado al entrenador
 * @route POST /api/athletes
 */
async function createAthlete(req, res) {
  try {
    const { name, age, birthDate, birth_date } = req.body || {};
    const trainerId = req.user.id;
    const finalBirthDate = birthDate || birth_date || null;
    const organizationName = req.body?.organizationName ?? req.body?.school;
    if (organizationName !== undefined && (typeof organizationName !== 'string' || !organizationName.trim() || organizationName.length > 160)) {
      return res.status(400).json({ error: 'Indica el club o establecimiento del atleta (máximo 160 caracteres).' });
    }

    const rawAccount = req.body?.account;
    const email = req.body?.email || rawAccount?.email;
    const password = req.body?.password || rawAccount?.password;
    const consent = req.body?.consent !== undefined 
      ? Boolean(req.body.consent) 
      : (req.body?.consentStatus === 'vigente');

    if (!name || (age === undefined && !finalBirthDate)) {
      return res.status(400).json({
        error: 'El nombre completo y la fecha de nacimiento (o edad) del atleta son campos obligatorios.'
      });
    }

    // Cuenta de acceso opcional: ambos campos deben venir juntos
    let account = null;
    if (email || password) {
      if (!email || !password) {
        return res.status(400).json({
          error: 'Para crear la cuenta del atleta se requieren correo y contraseña temporal.'
        });
      }
      if (password.length < 6) {
        return res.status(400).json({
          error: 'La contraseña temporal debe contener al menos 6 caracteres.'
        });
      }
      account = { email: String(email).trim().toLowerCase(), password };
    }

    const newAthlete = await dbRepository.createAthlete({
      name: name.trim(),
      age: age !== undefined ? parseInt(age, 10) : undefined,
      birthDate: finalBirthDate,
      consent: Boolean(consent),
      trainerId,
      organizationName: (organizationName || '').trim(),
      account
    });

    return res.status(201).json({
      message: 'Atleta escolar registrado exitosamente.',
      athlete: newAthlete
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * Actualiza la información (nombre, edad, fecha de nacimiento o consentimiento) de un atleta
 * @route PUT /api/athletes/:id
 */
async function updateAthlete(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;
    const { name, age, birthDate, birth_date, consent } = req.body || {};
    const finalBirthDate = birthDate !== undefined ? birthDate : (birth_date !== undefined ? birth_date : undefined);

    const updated = await dbRepository.updateAthlete({
      athleteId,
      trainerId,
      name: name ? name.trim() : undefined,
      age: age !== undefined ? parseInt(age, 10) : undefined,
      birthDate: finalBirthDate,
      consent: consent !== undefined ? Boolean(consent) : undefined
    });

    return res.json({
      message: 'Datos del atleta actualizados exitosamente.',
      athlete: updated
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * Elimina un atleta del sistema garantizando la pertenencia al entrenador
 * @route DELETE /api/athletes/:id
 */
async function deleteAthlete(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;

    await dbRepository.deleteAthlete({
      athleteId,
      trainerId
    });

    return res.json({
      message: 'Atleta eliminado exitosamente del registro.',
      id: Number(athleteId)
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * Consulta el estado y registro de consentimientos informados del atleta (CU-07 / HU-10)
 * @route GET /api/athletes/:id/consents
 */
async function getAthleteConsents(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;
    await dbRepository.getAthleteByIdForTrainer(athleteId, trainerId);

    const consents = await dbRepository.getConsentsByAthlete(athleteId);
    const isValid = await dbRepository.isAthleteConsentValid(athleteId);

    return res.json({
      athleteId: Number(athleteId),
      hasValidConsent: isValid,
      consents
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * Registra o renueva un consentimiento parental para el atleta (CU-07 / HU-10)
 * @route POST /api/athletes/:id/consents
 */
async function createAthleteConsent(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;
    await dbRepository.getAthleteByIdForTrainer(athleteId, trainerId);

    const { status = 'granted', notes = '', expiresAt = null } = req.body || {};

    const consentEntry = await dbRepository.createConsent({
      athleteId,
      consentType: 'grabacion_biomecanica',
      status,
      expiresAt,
      notes
    });

    return res.status(201).json({
      message: 'Consentimiento informado registrado exitosamente.',
      consent: consentEntry
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
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
