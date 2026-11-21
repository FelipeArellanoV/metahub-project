// Lectura común del análisis de una sesión (ADR-023). La usan el Inicio y Ejercicios del entrenador y el
// Portal del atleta, para que las dos vistas muestren el mismo "último análisis" con los mismos datos.

const tieneAnalisis = s => Boolean(s && s.analysis && typeof s.analysis === 'object');
const numero = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Sesión más reciente que ya tiene análisis (las sesiones llegan de la más reciente a la más antigua). */
export function ultimaSesionConAnalisis(sessions) {
  return (sessions || []).find(tieneAnalisis) || null;
}

/** IPT de una sesión: el guardado en la sesión o, si falta, el del análisis. */
export function iptDeSesion(s) {
  return numero(s?.iptScore) ?? numero(s?.analysis?.ipt_score);
}

/**
 * Datos del análisis que comparten ambas vistas. Nunca inventa: lo que falta queda en null.
 * - ipt y motivoSinIpt: un análisis puede no tener IPT (trote, pies tapados…) y entonces trae el motivo.
 * - rodillaRecobro: rodilla mínima en el recobro medida por paso; en análisis antiguos, la mínima del video.
 * - simetriaPasos: puntaje del sector de simetría por pasos alternos (pierna A y B). La simetría por rótulos
 *   izquierda/derecha de MediaPipe no se usa: no es fiable en vista lateral.
 */
export function resumenDeAnalisis(sesion) {
  const a = sesion?.analysis || {};
  const rec = a.recomendaciones && typeof a.recomendaciones === 'object' ? a.recomendaciones : null;
  const hallazgos = rec && rec.disponible ? (rec.hallazgos || []) : [];
  const recobro = a.cinematica_eventos?.variables?.rodilla_min_balanceo;
  const sectorSim = a.desglose_sectores?.simetria_bilateral;
  return {
    ipt: iptDeSesion(sesion),
    motivoSinIpt: iptDeSesion(sesion) == null ? (a.motivo || rec?.motivo_no_disponible || null) : null,
    version: a.version || null,
    ic95: Array.isArray(a.ic95) && a.ic95.length === 2 ? a.ic95 : null,
    sectorPrioritario: iptDeSesion(sesion) != null && typeof a.sector_prioritario === 'string' ? a.sector_prioritario : null,
    confianza: rec?.confianza?.nivel || null,
    hallazgos,
    recomendaciones: rec,
    rodillaRecobro: numero(recobro?.media) ?? numero(a.summary_metrics?.min_knee_flexion),
    simetriaPasos: a.version && Array.isArray(sectorSim?.variables) && sectorSim.variables.length ? numero(sectorSim.score) : null
  };
}
