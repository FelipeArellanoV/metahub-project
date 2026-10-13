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
    const { name, age, consent } = req.body || {};
    const trainerId = req.user.id;

    if (!name || age === undefined) {
      return res.status(400).json({
        error: 'El nombre completo y la edad del atleta son campos obligatorios.'
      });
    }

    const newAthlete = await dbRepository.createAthlete({
      name: name.trim(),
      age: parseInt(age, 10),
      consent: Boolean(consent),
      trainerId
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
 * Actualiza la información (nombre, edad o consentimiento) de un atleta
 * @route PUT /api/athletes/:id
 */
async function updateAthlete(req, res) {
  try {
    const athleteId = req.params.id;
    const trainerId = req.user.id;
    const { name, age, consent } = req.body || {};

    const updated = await dbRepository.updateAthlete({
      athleteId,
      trainerId,
      name: name ? name.trim() : undefined,
      age: age !== undefined ? parseInt(age, 10) : undefined,
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

module.exports = {
  getAthletes,
  getAthleteById,
  createAthlete,
  updateAthlete,
  deleteAthlete
};
