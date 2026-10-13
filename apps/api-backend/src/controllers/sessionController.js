/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 * 
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 * 
 * Módulo: Controlador de Sesiones de Carrera (sessionController.js)
 * Descripción: Gestiona el registro y consulta de sesiones de carrera en terreno,
 *              vinculándolas con el atleta y preparando la captura para el análisis biomecánico.
 * =========================================================================================
 */

const dbRepository = require('../db/repository');

/**
 * Registra una nueva sesión de carrera para un atleta
 * @route POST /api/sessions
 */
async function createSession(req, res) {
  try {
    const { athleteId, videoUrl, notes } = req.body || {};
    const trainerId = req.user.id;

    if (!athleteId) {
      return res.status(400).json({ error: 'El identificador del atleta (athleteId) es obligatorio.' });
    }

    const session = await dbRepository.createSession({
      athleteId,
      trainerId,
      videoUrl: videoUrl || '',
      notes: notes || ''
    });

    return res.status(201).json({
      message: 'Sesión de carrera creada exitosamente.',
      session
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * Consulta el historial de sesiones de carrera asociadas a un atleta escolar
 * @route GET /api/athletes/:athleteId/sessions
 */
async function getAthleteSessions(req, res) {
  try {
    const athleteId = req.params.athleteId;
    const trainerId = req.user.id;

    const sessions = await dbRepository.getSessionsByAthlete(athleteId, trainerId);
    return res.json({ sessions });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

/**
 * Consulta la totalidad de sesiones registradas por el entrenador en sesión
 * @route GET /api/sessions
 */
async function getAllSessions(req, res) {
  try {
    const trainerId = req.user.id;
    const sessions = await dbRepository.getSessionsByTrainer(trainerId);
    return res.json({ sessions });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

module.exports = {
  createSession,
  getAthleteSessions,
  getAllSessions
};
