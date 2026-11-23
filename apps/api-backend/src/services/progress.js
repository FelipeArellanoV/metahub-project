/**
 * =========================================================================================
 * PROYECTO METAHUB — SEGUIMIENTO LONGITUDINAL DE LA TÉCNICA DE CARRERA EN ATLETISMO ESCOLAR
 * Escuela de Ingeniería Civil en Informática — Universidad Católica de Temuco
 *
 * Memoria / Trabajo de Título:
 * Autores: Felipe Arellano Vargas & Sofía Henríquez Soto
 * Profesor Guía: Dr. Marcos Lévano
 *
 * Módulo: Progreso del Atleta (progress.js)
 * Descripción: Calcula XP, nivel y medallas del portal del atleta A PARTIR DE SESIONES REALES.
 *              Es una función pura (sin acceso a base de datos) para poder probarla de forma aislada.
 *
 * Reglas (transparentes y reproducibles):
 *   - XP = 100 por sesión registrada + 20 por cada punto de IPT ganado entre sesiones analizadas
 *          consecutivas (solo mejoras; una baja no resta XP).
 *   - Medallas: se obtienen únicamente si los datos guardados lo respaldan.
 * =========================================================================================
 */

const XP_PER_SESSION = 100;
const XP_PER_IPT_POINT_GAINED = 20;

// Umbrales de XP por nivel (ascendente)
const LEVELS = [
  { level: 1, label: 'Iniciación', minXp: 0 },
  { level: 2, label: 'Aprendiz', minXp: 300 },
  { level: 3, label: 'Velocista', minXp: 700 },
  { level: 4, label: 'Velocista Pro', minXp: 1200 },
  { level: 5, label: 'Élite Escolar', minXp: 2000 }
];

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Determina el nivel actual y el XP requerido para el siguiente
 */
function resolveLevel(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) current = l;
  }
  const next = LEVELS.find(l => l.minXp > current.minXp) || null;
  return {
    level: current.level,
    label: current.label,
    xp,
    xpFloor: current.minXp,
    xpNext: next ? next.minXp : null,
    nextLabel: next ? next.label : null
  };
}

/**
 * Calcula el progreso del atleta.
 * @param {Array<{sessionDate: string, iptScore: number|null}>} sessions - sesiones en cualquier orden
 * @param {object|null} latestAnalysis - resumen del análisis de la sesión más reciente (si existe)
 */
/** Versión principal del IPT de un análisis ("3.0-perfil" → 3). Sin análisis se asume la misma escala (null). */
function versionIpt(analysis) {
  if (!analysis || typeof analysis !== 'object') return null;
  const m = /^(\d+)/.exec(String(analysis.version || ''));
  return m ? Number(m[1]) : 1;
}

function computeProgress(sessions = [], latestAnalysis = null) {
  const ordered = [...sessions].sort((a, b) => {
    const da = new Date(a.sessionDate).getTime();
    const db = new Date(b.sessionDate).getTime();
    return da - db || (a.id || 0) - (b.id || 0);
  });

  const conIpt = ordered.filter(s => typeof s.iptScore === 'number' && Number.isFinite(s.iptScore));
  const analyzed = conIpt.map(s => s.iptScore);
  // Versión del IPT de cada sesión: v1, v2 y v3 usan escalas distintas y no se restan entre sí (ADR-024, ADR-026).
  const versiones = conIpt.map(s => versionIpt(s.analysis));
  const mismaEscala = versiones.length ? conIpt.filter((_, i) => versiones[i] === versiones[versiones.length - 1]).map(s => s.iptScore) : [];

  const sessionCount = ordered.length;
  const firstIpt = analyzed.length ? analyzed[0] : null;
  const latestIpt = analyzed.length ? analyzed[analyzed.length - 1] : null;
  const bestIpt = analyzed.length ? Math.max(...analyzed) : null;
  const deltaIpt = mismaEscala.length >= 2 ? round1(latestIpt - mismaEscala[0]) : null;
  // Diferencia con el análisis con IPT anterior de la misma versión: la misma que muestra el Inicio del entrenador.
  const deltaAnterior = mismaEscala.length >= 2 ? round1(latestIpt - mismaEscala[mismaEscala.length - 2]) : null;

  let gained = 0;
  for (let i = 1; i < analyzed.length; i++) {
    if (versiones[i] === versiones[i - 1] && analyzed[i] > analyzed[i - 1]) gained += analyzed[i] - analyzed[i - 1];
  }

  const xp = Math.round(sessionCount * XP_PER_SESSION + gained * XP_PER_IPT_POINT_GAINED);
  const levelInfo = resolveLevel(xp);

  // Simetría entre pasos alternos (IPT v2, ADR-023). La simetría por rótulos izquierda/derecha no se usa:
  // MediaPipe intercambia las piernas en vista lateral.
  const sectorSimetria = latestAnalysis?.version ? latestAnalysis?.desglose_sectores?.simetria_bilateral : null;
  const symmetry = sectorSimetria && Array.isArray(sectorSimetria.variables) && sectorSimetria.variables.length
    ? sectorSimetria.score : null;

  const medals = [
    {
      id: 'first_session',
      icon: '🏁',
      title: 'Primera sesión',
      detail: 'Registraste tu primera sesión de carrera',
      earned: sessionCount >= 1
    },
    {
      id: 'consistency',
      icon: '🔁',
      title: 'Constancia',
      detail: '5 sesiones registradas',
      earned: sessionCount >= 5
    },
    {
      id: 'ipt_75',
      icon: '🚀',
      title: 'Técnica en desarrollo',
      detail: 'IPT de 80 o más: a menos de 2 DE de la referencia',
      earned: bestIpt !== null && bestIpt >= 80
    },
    {
      id: 'ipt_90',
      icon: '🏆',
      title: 'Cerca de la referencia',
      detail: 'IPT de 90 o más: a menos de 1 DE de los velocistas de referencia',
      earned: bestIpt !== null && bestIpt >= 90
    },
    {
      id: 'improvement',
      icon: '📈',
      title: 'En ascenso',
      detail: 'Mejoraste 5 o más puntos de IPT',
      earned: deltaIpt !== null && deltaIpt >= 5
    },
    {
      id: 'symmetry',
      icon: '🎯',
      title: 'Simetría',
      detail: 'Pasos de ambas piernas parecidos (simetría de 90 pts o más)',
      earned: typeof symmetry === 'number' && symmetry >= 90
    }
  ];

  return {
    sessionCount,
    analyzedCount: analyzed.length,
    firstIpt: firstIpt === null ? null : round1(firstIpt),
    latestIpt: latestIpt === null ? null : round1(latestIpt),
    bestIpt: bestIpt === null ? null : round1(bestIpt),
    deltaIpt,
    deltaAnterior,
    ...levelInfo,
    medals
  };
}

module.exports = {
  XP_PER_SESSION,
  XP_PER_IPT_POINT_GAINED,
  LEVELS,
  resolveLevel,
  computeProgress
};
