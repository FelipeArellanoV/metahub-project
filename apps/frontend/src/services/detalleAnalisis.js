// Lectura detallada de un análisis guardado (ADR-026): variables por fase con su estadística, datos del sprint,
// calidad de la toma, explicación de la prescripción, comparación entre sesiones y resumen del atleta.
// Solo lee lo que el servicio de visión guardó; lo que falta queda en null y la vista lo dice.
import { decimalesCl, perfilDeAnalisis, serieEvolucion, cambioEntre } from './informeIpt.js';

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const obj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

/** Variables cinemáticas agrupadas por fase, en el orden en que ocurren en el paso. */
export const FASES_VARIABLES = [
  { fase: 'Contacto', claves: ['rodilla_contacto', 'muslo_contacto', 'distancia_relativa_contacto', 'muslo_contralateral_contacto'] },
  { fase: 'Despegue', claves: ['rodilla_despegue', 'muslo_despegue', 'distancia_relativa_despegue'] },
  { fase: 'Recobro', claves: ['rodilla_min_balanceo', 'muslo_max_elevacion'] },
  { fase: 'Ritmo', claves: ['frecuencia_paso_hz', 'tiempo_apoyo_s', 'tiempo_vuelo_s'] }
];

/** Explicación en lenguaje simple de cada variable, para atletas y familias. */
export const GLOSARIO = {
  rodilla_contacto: { nombre: 'Rodilla al contacto', simple: 'Qué tan estirada llega la pierna cuando el pie toca el suelo.' },
  muslo_contacto: { nombre: 'Muslo al contacto', simple: 'Cuánto va el muslo hacia adelante en el momento en que el pie toca el suelo.' },
  distancia_relativa_contacto: { nombre: 'Pie por delante de la cadera', simple: 'A qué distancia por delante del cuerpo apoyas el pie. Apoyar muy adelante frena.' },
  muslo_contralateral_contacto: { nombre: 'Pierna libre al apoyar', simple: 'Dónde va la otra pierna cuando un pie toca el suelo: adelantada ayuda a encadenar el siguiente paso.' },
  rodilla_despegue: { nombre: 'Rodilla al despegue', simple: 'Qué tan estirada queda la pierna al empujar el suelo, justo antes de despegar.' },
  muslo_despegue: { nombre: 'Muslo al despegue', simple: 'Cuánto queda el muslo hacia atrás al terminar el empuje.' },
  distancia_relativa_despegue: { nombre: 'Pie por detrás de la cadera', simple: 'Cuán atrás queda el pie al despegar: muestra el recorrido del empuje.' },
  rodilla_min_balanceo: { nombre: 'Rodilla en el recobro', simple: 'Qué tan doblada llevas la pierna al traerla hacia adelante. Más doblada = pierna más corta y rápida.' },
  muslo_max_elevacion: { nombre: 'Elevación del muslo', simple: 'Hasta dónde sube la rodilla adelante antes de bajar a apoyar.' },
  frecuencia_paso_hz: { nombre: 'Frecuencia de paso', simple: 'Cuántos pasos das por segundo.' },
  tiempo_apoyo_s: { nombre: 'Tiempo de apoyo', simple: 'Cuánto tiempo pasa el pie en el suelo en cada paso.' },
  tiempo_vuelo_s: { nombre: 'Tiempo de vuelo', simple: 'Cuánto tiempo pasas en el aire entre un apoyo y el siguiente.' }
};

export const ESTADO_VARIABLE = {
  dentro_de_referencia: { tono: 'ok', texto: 'Dentro de la referencia' },
  dentro_del_error_del_metodo: { tono: 'warn', texto: 'Fuera de 2 DE, dentro del error del método' },
  alteracion: { tono: 'bad', texto: 'Fuera de la referencia' },
  no_comparable: { tono: 'muted', texto: 'No comparable' },
  insuficiente: { tono: 'muted', texto: 'Pasos insuficientes' }
};

/**
 * Tabla de variables por fase: media del atleta con su DE, CV, n e IC 95 % de los pasos; referencia,
 * z, estado y si entra al IPT. Vacía en análisis sin medición por paso (anteriores a ADR-023).
 */
export function tablaVariables(analysis) {
  const ce = obj(analysis?.cinematica_eventos);
  const comp = obj(analysis?.comparacion_referencia) || obj(ce?.comparacion) || {};
  const vars = obj(ce?.variables) || {};
  const usadas = new Set(Array.isArray(analysis?.variables_usadas) ? analysis.variables_usadas : []);
  const fases = [];
  for (const { fase, claves } of FASES_VARIABLES) {
    const filas = [];
    for (const k of claves) {
      const c = obj(comp[k]), v = obj(vars[k]);
      if (!c && !v) continue;
      const ref = obj(c?.referencia);
      filas.push({
        variable: k,
        etiqueta: c?.etiqueta || GLOSARIO[k]?.nombre || k,
        unidad: c?.unidad || (k.endsWith('_s') ? 's' : k.endsWith('_hz') ? 'Hz' : ''),
        definicion: c?.definicion ? decimalesCl(c.definicion) : null,
        media: num(v?.media_global) ?? num(v?.media) ?? num(c?.valor),
        de: num(v?.de), cv: num(v?.cv_pct), n: num(v?.n) ?? num(c?.n),
        ic95: Array.isArray(v?.ic95) && v.ic95.length === 2 ? v.ic95 : null,
        refMedia: num(ref?.media), refDe: num(ref?.de),
        z: num(c?.z),
        estado: c?.estado || null,
        motivo: c?.motivo ? decimalesCl(c.motivo) : null,
        errorMetodo: num(c?.error_metodo),
        enIpt: usadas.has(k),
        bilateral: obj(c?.bilateral) ? { a: num(c.bilateral.pierna_a), b: num(c.bilateral.pierna_b), z: num(c.bilateral.z) } : null
      });
    }
    if (filas.length) fases.push({ fase, filas });
  }
  return fases;
}

/** Datos del ritmo del sprint: frecuencia de paso y tiempos de apoyo y vuelo, con su referencia si la hay. */
export function datosSprint(analysis) {
  const filas = tablaVariables(analysis).find(f => f.fase === 'Ritmo')?.filas || [];
  const por = Object.fromEntries(filas.map(f => [f.variable, f]));
  const pasos = num(analysis?.cinematica_eventos?.conteo_pasos);
  const r = {
    frecuencia: por.frecuencia_paso_hz || null,
    apoyo: por.tiempo_apoyo_s || null,
    vuelo: por.tiempo_vuelo_s || null,
    pasos
  };
  return r.frecuencia || r.apoyo || r.vuelo || pasos != null ? r : null;
}

/**
 * Calidad de la toma: cada control con su resultado (ok / warn) y el motivo. Sirve para confiar en el número
 * o para saber qué corregir en la próxima grabación.
 */
export function calidadToma(analysis) {
  const ce = obj(analysis?.cinematica_eventos);
  const vi = obj(analysis?.video_info);
  if (!ce && !vi) return null;
  const items = [];
  const fs = num(ce?.fs_muestreo);
  if (fs != null) items.push({ clave: 'muestreo', etiqueta: 'Cuadros por segundo reales', valor: Math.round(fs) + ' c/s',
    ok: fs >= 100, detalle: fs >= 240 ? 'Permite medir también los tiempos de apoyo.' : fs >= 100 ? 'Suficiente para los ángulos; los tiempos de apoyo piden 240 c/s.' : 'Bajo: los instantes de contacto pierden precisión. Usa cámara lenta.' });
  const pasos = num(ce?.conteo_pasos);
  if (pasos != null) items.push({ clave: 'pasos', etiqueta: 'Pasos medidos', valor: String(pasos), ok: pasos >= 6,
    detalle: pasos >= 6 ? 'Suficientes para promediar.' : 'Pocos pasos: graba un tramo más largo (6 a 8 pasos visibles).' });
  const reg = obj(ce?.regularidad);
  if (reg) items.push({ clave: 'regularidad', etiqueta: 'Regularidad de los pasos',
    valor: num(reg.cv_tiempo_paso_pct) != null ? 'CV ' + decimalesCl(String(reg.cv_tiempo_paso_pct)) + ' %' : (reg.regular ? 'Regular' : 'Irregular'),
    ok: Boolean(reg.regular), detalle: reg.regular ? 'Ritmo constante entre pasos.' : (reg.motivos || []).join(' ') || 'Pasos irregulares: puede faltar un apoyo o haber cambios de ritmo.' });
  const apoyo = obj(ce?.apoyo_estable);
  if (apoyo) items.push({ clave: 'apoyo', etiqueta: 'Apoyo estable', valor: apoyo.estable ? 'Sí' : 'No', ok: Boolean(apoyo.estable),
    detalle: apoyo.estable ? 'Los contactos con el suelo se detectan con claridad.' : apoyo.motivo || 'Los contactos no se detectan con claridad.' });
  const sprint = obj(ce?.es_sprint);
  if (sprint) items.push({ clave: 'sprint', etiqueta: 'Es un sprint', valor: sprint.es_sprint ? 'Sí' : 'No', ok: Boolean(sprint.es_sprint),
    detalle: sprint.es_sprint ? 'Frecuencia de paso propia de máxima velocidad.' : sprint.motivo || 'El ritmo no corresponde a un sprint: la referencia no aplica.' });
  const det = num(vi?.detection_rate_pct);
  if (det != null) items.push({ clave: 'deteccion', etiqueta: 'Cuerpo detectado', valor: decimalesCl(String(det)) + ' %', ok: det >= 80,
    detalle: det >= 80 ? 'El esqueleto se detectó en casi todo el video.' : 'El cuerpo se pierde en parte del video: encuadra al atleta completo.' });
  if (!items.length) return null;
  return {
    items,
    resumen: { fps: num(vi?.fps), duracion: num(vi?.duration_seconds), resolucion: vi?.resolution || null, sentido: num(ce?.sentido_de_carrera?.sentido) }
  };
}

/** "Por qué" del análisis: causa probable, indicación verbal y error a evitar, si el análisis los trae. */
export function explicacion(analysis) {
  const p = obj(analysis?.prescripcion_completa);
  if (!p) return null;
  const r = {
    sector: typeof p.sector === 'string' ? p.sector.replace(/^Sector \d+:\s*/, '') : null,
    causa: typeof p.causa_biomecanica === 'string' ? decimalesCl(p.causa_biomecanica) : null,
    cue: typeof p.cue_verbal === 'string' ? p.cue_verbal : null,
    evitar: typeof p.error_evitar === 'string' ? p.error_evitar : null
  };
  return r.causa || r.cue || r.evitar ? r : null;
}

/** Motivos por los que la confianza del análisis no es alta. */
export function motivosConfianza(analysis) {
  const c = obj(analysis?.recomendaciones?.confianza);
  return c && Array.isArray(c.motivos) ? c.motivos.filter(m => typeof m === 'string' && m) : [];
}

/**
 * Diferencias por variable entre dos análisis. Un cambio se considera real si los IC 95 % de las medias por paso
 * no se superponen (el mismo criterio del IPT, ADR-024); sin IC no se califica.
 */
export function diferenciasEntre(analisisA, analisisB) {
  const filas = new Map();
  for (const f of tablaVariables(analisisA).flatMap(g => g.filas.map(x => ({ ...x, fase: g.fase })))) filas.set(f.variable, { a: f });
  for (const f of tablaVariables(analisisB).flatMap(g => g.filas.map(x => ({ ...x, fase: g.fase })))) {
    filas.set(f.variable, { ...(filas.get(f.variable) || {}), b: f });
  }
  const out = [];
  for (const [variable, { a, b }] of filas) {
    if (!a || !b || a.media == null || b.media == null) continue;
    const delta = Math.round((b.media - a.media) * 100) / 100;
    let real = null;
    if (a.ic95 && b.ic95) real = b.ic95[0] > a.ic95[1] || b.ic95[1] < a.ic95[0];
    // ¿Se acercó a la referencia? Solo si ambas tienen z.
    const mejora = a.z != null && b.z != null ? Math.abs(b.z) < Math.abs(a.z) : null;
    out.push({ variable, fase: a.fase, etiqueta: a.etiqueta, unidad: a.unidad, antes: a.media, despues: b.media, delta, real,
      zAntes: a.z, zDespues: b.z, seAcerca: mejora });
  }
  return out;
}

/** Perfiles de dos análisis alineados por variable, para superponer sus barras z. */
export function perfilComparado(analisisA, analisisB) {
  const pa = perfilDeAnalisis(analisisA), pb = perfilDeAnalisis(analisisB);
  const porB = new Map(pb.map(p => [p.variable, p]));
  const vars = [...new Set([...pb.map(p => p.variable), ...pa.map(p => p.variable)])];
  const porA = new Map(pa.map(p => [p.variable, p]));
  return vars.map(v => ({ variable: v, etiqueta: (porB.get(v) || porA.get(v)).etiqueta,
    zAntes: porA.get(v)?.z ?? null, zDespues: porB.get(v)?.z ?? null }));
}

/** Valores por paso de una variable, para el gráfico de pasos. */
export function valoresPorPaso(analysis, variable) {
  const pasos = analysis?.cinematica_eventos?.pasos;
  if (!Array.isArray(pasos)) return [];
  return pasos.map((p, i) => ({ i: i + 1, valor: num(p?.[variable]), pierna: p?.pierna || null, t: num(p?.t_contacto) }))
    .filter(p => p.valor != null);
}

/**
 * Resumen técnico de un atleta a partir de sus sesiones: mejor y último IPT v3, tendencia según los IC,
 * variable que más se repite como la más alejada y fecha del último análisis.
 */
export function resumenAtleta(sessions) {
  const { puntos } = serieEvolucion(sessions);
  const conAnalisis = (sessions || []).filter(s => s?.analysis);
  const ultimaFecha = conAnalisis.map(s => new Date(s.sessionDate)).sort((a, b) => b - a)[0] || null;
  const cuenta = new Map();
  for (const s of conAnalisis) {
    const top = perfilDeAnalisis(s.analysis)[0];
    if (top && Math.abs(top.z) >= 1) cuenta.set(top.variable, { n: (cuenta.get(top.variable)?.n || 0) + 1, etiqueta: top.etiqueta });
  }
  const recurrente = [...cuenta.entries()].sort((a, b) => b[1].n - a[1].n)[0];
  const mejor = puntos.length ? puntos.reduce((m, p) => (p.ipt > m.ipt ? p : m)) : null;
  const cambio = puntos.length >= 2 ? cambioEntre(puntos.at(-2), puntos.at(-1)) : null;
  return {
    sesionesV3: puntos.length,
    ultimo: puntos.at(-1) || null,
    mejor,
    tendencia: cambio ? (cambio.criterio === 'mejora_real' ? 'sube' : cambio.criterio === 'baja_real' ? 'baja' : 'estable') : null,
    cambio,
    recurrente: recurrente ? { variable: recurrente[0], etiqueta: recurrente[1].etiqueta, veces: recurrente[1].n, de: conAnalisis.length } : null,
    ultimaFecha
  };
}

/** Foco para el atleta: la variable más alejada de la referencia (|z| ≥ 1), explicada en simple. */
export function focoDelAtleta(analysis) {
  const top = perfilDeAnalisis(analysis).find(p => Math.abs(p.z) >= 1);
  if (!top) return null;
  const g = GLOSARIO[top.variable];
  return { variable: top.variable, etiqueta: g?.nombre || top.etiqueta, simple: g?.simple || null, z: top.z, banda: top.banda,
    sentido: top.z > 0 ? 'mayor' : 'menor' };
}
