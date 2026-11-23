// Lógica pura del Inicio del entrenador: último análisis y avisos del equipo.
// Solo usa datos guardados; si falta un valor devuelve null en vez de inventarlo.
// El "último análisis" es el mismo que ve el atleta en su Portal (services/analisisSesion.js).
import { iptDeSesion, resumenDeAnalisis, ultimaSesionConAnalisis } from './analisisSesion.js';

/** Puntaje del sector de simetría (pasos alternos) bajo el cual se marca un aviso. */
export const SIMETRIA_BAJA = 60;

/**
 * Último análisis de un atleta y su comparación con el análisis con IPT anterior.
 * `sessions` llega de la API ordenado de la más reciente a la más antigua.
 * Si el último análisis no tiene IPT (por ejemplo, un trote o pies tapados), se informa con su motivo.
 */
export function ultimoAnalisis(sessions) {
  const ultima = ultimaSesionConAnalisis(sessions);
  if (!ultima) return null;
  const r = resumenDeAnalisis(ultima);
  const lista = sessions || [];
  // Solo se compara con un análisis de la misma versión del IPT: v1, v2 y v3 tienen escalas distintas.
  const version = s => { const m = /^(\d+)/.exec(String(s?.analysis?.version || '')); return s?.analysis ? (m ? Number(m[1]) : 1) : null; };
  const anterior = lista.slice(lista.indexOf(ultima) + 1)
    .find(s => iptDeSesion(s) != null && version(s) === version(ultima)) || null;
  const rAnt = anterior ? resumenDeAnalisis(anterior) : null;
  const dif = (x, y) => (Number.isFinite(x) && Number.isFinite(y) ? Math.round((x - y) * 10) / 10 : null);
  return {
    session: ultima,
    anterior,
    ipt: r.ipt,
    motivoSinIpt: r.motivoSinIpt,
    ic95: r.ic95,
    deltaIpt: rAnt ? dif(r.ipt, rAnt.ipt) : null,
    flexionRodilla: r.rodillaRecobro,
    simetria: r.simetriaPasos,
    simetriaAnterior: rAnt ? rAnt.simetriaPasos : null,
    sectorPrioritario: r.sectorPrioritario,
    confianza: r.confianza,
    hallazgos: r.hallazgos
  };
}

/**
 * Avisos para "Requiere atención". Primero los de tono 'alto' (hallazgos en la técnica),
 * luego los 'medio' (calidad del video, video sin IPT y trámites).
 * @param athletes lista del roster
 * @param ficha atleta seleccionado ({ athlete, sessions }) o null
 */
export function avisosEquipo(athletes, ficha) {
  const avisos = [];
  const resumen = ficha ? ultimoAnalisis(ficha.sessions) : null;
  const base = resumen ? { athleteId: ficha.athlete.id, nombre: ficha.athlete.name } : null;
  if (resumen && resumen.hallazgos.some(h => h.tipo === 'simetria')) {
    avisos.push({ ...base, tono: 'alto', tipo: 'simetria', texto: 'Diferencia entre piernas fuera de la referencia en el último análisis' });
  } else if (resumen && resumen.simetria != null && resumen.simetria < SIMETRIA_BAJA) {
    avisos.push({ ...base, tono: 'alto', tipo: 'simetria', texto: `Simetría entre pasos de ${Math.round(resumen.simetria)} pts en el último análisis` });
  }
  const otros = resumen ? resumen.hallazgos.filter(h => h.tipo !== 'simetria') : [];
  if (otros.length) {
    avisos.push({ ...base, tono: 'alto', tipo: 'hallazgo',
      texto: otros.length === 1 ? otros[0].titulo : `${otros.length} variables fuera de la referencia en el último análisis` });
  }
  if (resumen && resumen.confianza === 'baja') {
    avisos.push({ ...base, tono: 'medio', tipo: 'confianza', texto: 'Último análisis con confianza baja: conviene repetir la toma' });
  } else if (resumen && resumen.ipt == null) {
    avisos.push({ ...base, tono: 'medio', tipo: 'sin_ipt', texto: 'Último video sin IPT: revisa el motivo y repite la toma' });
  }
  for (const a of athletes || []) {
    if (a.canEdit && !a.consent) {
      avisos.push({ athleteId: a.id, nombre: a.name, tono: 'medio', tipo: 'consentimiento', texto: 'Falta el consentimiento del apoderado' });
    }
    if (!a.canEdit) continue;
    const n = num => (Number.isInteger(num) && num > 0 ? num : 0);
    if (n(a.overdueTasks)) {
      avisos.push({ athleteId: a.id, nombre: a.name, tono: 'alto', tipo: 'vencidos',
        texto: n(a.overdueTasks) === 1 ? '1 ejercicio asignado venció sin completarse' : `${a.overdueTasks} ejercicios asignados vencieron sin completarse` });
    }
    if (n(a.pendingReviews)) {
      avisos.push({ athleteId: a.id, nombre: a.name, tono: 'medio', tipo: 'revision',
        texto: n(a.pendingReviews) === 1 ? '1 sesión analizada espera tu revisión' : `${a.pendingReviews} sesiones analizadas esperan tu revisión` });
    }
  }
  return avisos.sort((x, y) => (x.tono === y.tono ? 0 : x.tono === 'alto' ? -1 : 1));
}

/** Totales del equipo a cargo para el resumen del Inicio. Solo cuenta atletas propios. */
export function totalesEquipo(athletes) {
  const propios = (athletes || []).filter(a => a.canEdit);
  const suma = k => propios.reduce((t, a) => t + (Number.isInteger(a[k]) ? a[k] : 0), 0);
  const hace30 = Date.now() - 30 * 24 * 3600 * 1000;
  return {
    atletas: propios.length,
    revisiones: suma('pendingReviews'),
    vencidos: suma('overdueTasks'),
    enCola: suma('queuedVideos'),
    activos30d: propios.filter(a => a.lastAnalysisAt && new Date(a.lastAnalysisAt).getTime() >= hace30).length
  };
}
