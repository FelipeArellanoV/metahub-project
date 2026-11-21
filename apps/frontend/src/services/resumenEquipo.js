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
  const anterior = lista.slice(lista.indexOf(ultima) + 1).find(s => iptDeSesion(s) != null) || null;
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
  }
  return avisos.sort((x, y) => (x.tono === y.tono ? 0 : x.tono === 'alto' ? -1 : 1));
}
