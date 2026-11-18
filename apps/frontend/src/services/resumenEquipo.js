// Lógica pura del Inicio del entrenador: último análisis y avisos del equipo.
// Solo usa datos guardados; si falta un valor devuelve null en vez de inventarlo.
import { extraerMetricasSesion } from './metricasSesion.js';

/** Umbral bajo el cual la simetría se marca como aviso (porcentaje). */
export const SIMETRIA_BAJA = 60;

const conIpt = s => Number.isFinite(s?.iptScore ?? s?.analysis?.ipt_score);

/**
 * Último análisis con IPT de un atleta y su comparación con el anterior.
 * `sessions` llega de la API ordenado de la más reciente a la más antigua.
 */
export function ultimoAnalisis(sessions) {
  const puntuadas = (sessions || []).filter(conIpt);
  const ultima = puntuadas[0];
  if (!ultima) return null;
  const anterior = puntuadas[1] || null;
  const m = extraerMetricasSesion(ultima);
  const prev = anterior ? extraerMetricasSesion(anterior) : null;
  const a = ultima.analysis || {};
  const simetriaValida = a.summary_metrics?.symmetry_valid !== false;
  const dif = (x, y) => (Number.isFinite(x) && Number.isFinite(y) ? Math.round((x - y) * 10) / 10 : null);
  return {
    session: ultima,
    anterior,
    ipt: m.ipt,
    deltaIpt: prev ? dif(m.ipt, prev.ipt) : null,
    flexionRodilla: Number.isFinite(m.kneeAngle) ? m.kneeAngle : null,
    simetria: simetriaValida && Number.isFinite(m.symmetry) ? m.symmetry : null,
    simetriaAnterior: prev && Number.isFinite(prev.symmetry) ? prev.symmetry : null,
    sectorPrioritario: typeof a.sector_prioritario === 'string' ? a.sector_prioritario : null,
    confianza: a.recomendaciones?.confianza?.nivel || null
  };
}

/**
 * Avisos para "Requiere atención". Primero los de tono 'alto' (riesgo en la técnica),
 * luego los 'medio' (trámites o calidad del video).
 * @param athletes lista del roster
 * @param ficha atleta seleccionado ({ athlete, sessions }) o null
 */
export function avisosEquipo(athletes, ficha) {
  const avisos = [];
  const resumen = ficha ? ultimoAnalisis(ficha.sessions) : null;
  if (resumen && resumen.simetria != null && resumen.simetria < SIMETRIA_BAJA) {
    const fmt = v => v.toFixed(1) + '%';
    avisos.push({
      athleteId: ficha.athlete.id, nombre: ficha.athlete.name, tono: 'alto', tipo: 'simetria',
      texto: resumen.simetriaAnterior != null
        ? `Simetría bajó de ${fmt(resumen.simetriaAnterior)} a ${fmt(resumen.simetria)}`
        : `Simetría de ${fmt(resumen.simetria)} en la última sesión`
    });
  }
  if (resumen && resumen.confianza === 'baja') {
    avisos.push({
      athleteId: ficha.athlete.id, nombre: ficha.athlete.name, tono: 'medio', tipo: 'confianza',
      texto: 'Último análisis con confianza baja: conviene repetir la toma'
    });
  }
  for (const a of athletes || []) {
    if (a.canEdit && !a.consent) {
      avisos.push({ athleteId: a.id, nombre: a.name, tono: 'medio', tipo: 'consentimiento', texto: 'Falta el consentimiento del apoderado' });
    }
  }
  return avisos.sort((x, y) => (x.tono === y.tono ? 0 : x.tono === 'alto' ? -1 : 1));
}
