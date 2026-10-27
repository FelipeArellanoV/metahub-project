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

const ANALYSIS_KEYS = [
  'ipt_score', 'categoria', 'badge', 'diagnostico', 'desglose_sectores',
  'sector_prioritario', 'drill_prescrito', 'prescripcion_completa'
];
const MAX_ANALYSIS_BYTES = 32 * 1024;

/**
 * Extrae del resultado del servicio CV solo el resumen necesario (sin los cuadros del video).
 * Retorna null si no hay un IPT válido.
 */
function buildAnalysisSummary(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const ipt = raw.ipt_evaluation && typeof raw.ipt_evaluation === 'object' ? raw.ipt_evaluation : null;
  if (!ipt) return null;

  const summary = {};
  for (const key of ANALYSIS_KEYS) {
    if (ipt[key] !== undefined) summary[key] = ipt[key];
  }
  if (raw.summary_metrics && typeof raw.summary_metrics === 'object') {
    summary.summary_metrics = raw.summary_metrics;
  }
  if (raw.video_info && typeof raw.video_info === 'object') {
    const { duration_seconds, fps, detection_rate_pct } = raw.video_info;
    summary.video_info = { duration_seconds, fps, detection_rate_pct };
  }

  if (Buffer.byteLength(JSON.stringify(summary), 'utf8') > MAX_ANALYSIS_BYTES) return null;
  return summary;
}

/**
 * Registra una nueva sesión de carrera para un atleta
 * @route POST /api/sessions
 * Cuerpo: { athleteId, videoUrl?, notes?, analysis? } donde 'analysis' es la respuesta del servicio CV.
 */
async function createSession(req, res) {
  try {
    const { athleteId, videoUrl, notes, analysis } = req.body || {};
    const trainerId = req.user.id;

    if (!athleteId) {
      return res.status(400).json({ error: 'El identificador del atleta (athleteId) es obligatorio.' });
    }

    let iptScore = null;
    let summary = null;
    if (analysis !== undefined && analysis !== null) {
      summary = buildAnalysisSummary(analysis);
      const score = summary ? Number(summary.ipt_score) : NaN;
      if (!summary || !Number.isFinite(score) || score < 0 || score > 100) {
        return res.status(400).json({
          error: 'El análisis enviado no contiene un IPT válido (0 a 100).'
        });
      }
      iptScore = Math.round(score * 10) / 10;
    }

    const session = await dbRepository.createSession({
      athleteId,
      trainerId,
      videoUrl: videoUrl || '',
      notes: notes || '',
      iptScore,
      analysis: summary
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
  buildAnalysisSummary,
  createSession,
  getAthleteSessions,
  getAllSessions
};
