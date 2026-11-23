// Lógica pura de los gráficos del IPT y del informe de sesión (ADR-024, ADR-025).
// Solo lee datos guardados: lo que falta queda en null y la vista lo dice, nunca se rellena.

/** Textos del servicio de visión con punto decimal ("4.1 ± 8.6 °") a la forma chilena ("4,1 ± 8,6 °"). */
export const decimalesCl = t => (typeof t === 'string' ? t.replace(/(\d)\.(\d)/g, '$1,$2') : t);

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Lectura del IPT v3, derivada de la escala (cada 10 puntos = 1 DE). */
export function lecturaIpt(ipt) {
  const v = num(ipt);
  if (v == null) return null;
  if (v >= 90) return { tono: 'ok', texto: 'Cercano a la referencia', detalle: 'menos de 1 DE' };
  if (v >= 80) return { tono: 'warn', texto: 'Desviación moderada', detalle: 'entre 1 y 2 DE' };
  return { tono: 'bad', texto: 'Desviación marcada', detalle: 'más de 2 DE' };
}

/** Banda de una variable del perfil según su |z|. */
export function bandaZ(z) {
  const v = num(z);
  if (v == null) return null;
  const a = Math.abs(v);
  return a < 1 ? 'ok' : a < 2 ? 'warn' : 'bad';
}

/** Versión principal del IPT de un análisis ("3.0-perfil" → 3). Los análisis antiguos sin versión son 1. */
export function versionIpt(analysis) {
  if (!analysis || typeof analysis !== 'object') return null;
  const m = /^(\d+)/.exec(String(analysis.version || ''));
  return m ? Number(m[1]) : 1;
}

const ic = v => (Array.isArray(v) && v.length === 2 && num(v[0]) != null && num(v[1]) != null ? [v[0], v[1]] : null);

/**
 * Serie para el gráfico de evolución, de la sesión más antigua a la más reciente.
 * Solo entran sesiones con IPT v3: el v1 y el v2 usan otra escala y no son comparables (ADR-024).
 * Acepta sesiones con `analysis` completo (entrenador, revisiones) o con `ic95`/`iptVersion` (portal).
 */
export function serieEvolucion(sessions) {
  const puntos = [];
  let otrasVersiones = 0;
  for (const s of sessions || []) {
    const ipt = num(s?.iptScore) ?? num(s?.analysis?.ipt_score);
    if (ipt == null) continue;
    const version = s.analysis ? versionIpt(s.analysis) : num(s.iptVersion);
    if (version !== 3) { otrasVersiones += 1; continue; }
    puntos.push({
      id: s.id,
      fecha: s.sessionDate,
      ipt,
      ic95: ic(s.analysis ? s.analysis.ic95 : s.ic95),
      provisional: Boolean(s.analysis ? s.analysis.provisional : s.provisional)
    });
  }
  puntos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  return { puntos, otrasVersiones };
}

/**
 * Cambio entre dos puntos de la serie. Según ADR-024, un cambio solo se considera real si los IC 95 %
 * no se superponen. Mientras no exista el cambio mínimo detectable (test-retest), ese es el criterio.
 */
export function cambioEntre(anterior, actual) {
  if (!anterior || !actual) return null;
  const delta = Math.round((actual.ipt - anterior.ipt) * 10) / 10;
  if (!anterior.ic95 || !actual.ic95) return { delta, criterio: 'sin_ic' };
  const separados = actual.ic95[0] > anterior.ic95[1] || actual.ic95[1] < anterior.ic95[0];
  return { delta, criterio: separados ? (delta > 0 ? 'mejora_real' : 'baja_real') : 'dentro_de_la_variabilidad' };
}

export const TEXTO_CAMBIO = {
  mejora_real: 'Mejora real: los intervalos de confianza no se superponen.',
  baja_real: 'Baja real: los intervalos de confianza no se superponen.',
  dentro_de_la_variabilidad: 'Los intervalos se superponen: la diferencia puede deberse a la variabilidad entre pasos.',
  sin_ic: 'Falta el intervalo de confianza de una de las sesiones: no se puede saber si el cambio es real.'
};

/**
 * Perfil por variable del IPT v3 (equivalente al MAP de Baker 2009), ordenado de mayor a menor |z|.
 * Devuelve [] si el análisis no es v3 o no trae perfil.
 */
export function perfilDeAnalisis(analysis) {
  if (versionIpt(analysis) !== 3 || !Array.isArray(analysis.perfil)) return [];
  return analysis.perfil
    .filter(p => p && num(p.z) != null)
    .map(p => ({
      variable: p.variable,
      etiqueta: p.etiqueta || p.variable,
      valor: num(p.valor),
      referencia: decimalesCl(p.referencia) || null,
      z: p.z,
      aporte: num(p.aporte_puntos) ?? Math.round(10 * Math.abs(p.z) * 10) / 10,
      banda: bandaZ(p.z)
    }))
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z));
}

/** Puntaje por fase (contacto, despegue, recobro) y simetría, si están evaluados. */
export function fasesDeAnalisis(analysis) {
  const d = analysis?.desglose_sectores;
  if (versionIpt(analysis) !== 3 || !d) return [];
  return [d.sector_contacto, d.sector_1_propulsion, d.sector_2_recobro, d.simetria_bilateral]
    .filter(f => f && f.nombre)
    .map(f => ({ nombre: f.nombre, score: num(f.score), aparte: f.ponderacion === 'no entra al IPT' }));
}

/**
 * Escala del eje z del gráfico de perfil: al menos ±3 DE, y más si alguna variable se sale.
 * Redondea hacia arriba al entero, para que las marcas queden en DE enteras.
 */
export function limiteZ(perfil) {
  const max = Math.max(3, ...perfil.map(p => Math.abs(p.z)));
  return Math.ceil(max);
}

/** Dominio vertical del gráfico de evolución: incluye las bandas de 80 y 90 y todos los IC. */
export function dominioEvolucion(puntos) {
  const valores = puntos.flatMap(p => (p.ic95 ? [p.ipt, ...p.ic95] : [p.ipt]));
  const min = Math.min(75, ...valores), max = Math.max(95, ...valores);
  return [Math.max(0, Math.floor(min / 5) * 5), Math.min(100, Math.ceil(max / 5) * 5)];
}
