/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 *
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 *
 * Módulo: Controlador del Portal del Atleta (portalController.js)
 * Descripción: Entrega al atleta SOLO sus propios datos. La identidad proviene exclusivamente
 *              del JWT firmado (req.user.id); ningún identificador de atleta se acepta desde
 *              el cliente, por lo que un atleta no puede consultar a otro.
 * =========================================================================================
 */

const dbRepository = require('../db/repository');
const { computeProgress } = require('../services/progress');
const { obtener: obtenerPerfil } = require('../services/perfilDeportivo');

/** Versión principal del IPT de un análisis ("3.0-perfil" → 3); los análisis sin versión son la 1. */
function versionIpt(analysis) {
  if (!analysis || typeof analysis !== 'object') return null;
  const m = /^(\d+)/.exec(String(analysis.version || ''));
  return m ? Number(m[1]) : 1;
}

/**
 * Datos completos del portal del atleta autenticado
 * @route GET /api/portal/me
 */
async function getMyPortal(req, res) {
  try {
    const athlete = await dbRepository.getAthleteByUserId(req.user.id);
    if (!athlete) {
      return res.status(404).json({
        error: 'Tu cuenta no tiene una ficha de atleta vinculada. Consulta con tu entrenador.'
      });
    }

    // Sesiones más recientes primero
    const sessions = await dbRepository.getSessionsForAthlete(athlete.id);
    const latestWithAnalysis = sessions.find(s => s.analysis);
    const latestAnalysis = latestWithAnalysis ? latestWithAnalysis.analysis : null;

    const progress = computeProgress(sessions, latestAnalysis);

    return res.json({
      athlete: {
        id: athlete.id,
        name: athlete.name,
        age: athlete.age,
        consent: athlete.consent,
        trainerName: athlete.trainerName || null,
        sportProfile: await obtenerPerfil(athlete.id)
      },
      progress,
      sessions: sessions.map(s => ({
        id: s.id,
        sessionDate: s.sessionDate,
        iptScore: s.iptScore,
        sectorPrioritario: s.analysis && s.iptScore != null ? s.analysis.sector_prioritario || null : null,
        analizada: Boolean(s.analysis),
        badge: s.analysis ? s.analysis.badge || null : null,
        // Para el gráfico de evolución (ADR-025): solo el IPT v3 es comparable entre sesiones.
        iptVersion: versionIpt(s.analysis),
        ic95: s.analysis && Array.isArray(s.analysis.ic95) && s.analysis.ic95.length === 2 ? s.analysis.ic95 : null,
        provisional: Boolean(s.analysis && s.analysis.provisional)
      })),
      latestAnalysis
    });
  } catch (err) {
    const status = err.statusCode || 500;
    return res.status(status).json({ error: err.message });
  }
}

module.exports = {
  getMyPortal
};
