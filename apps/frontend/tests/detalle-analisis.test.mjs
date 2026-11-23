// Detalle del análisis (ADR-026): solo datos guardados, nada inventado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tablaVariables, datosSprint, calidadToma, explicacion, motivosConfianza, diferenciasEntre, perfilComparado,
  valoresPorPaso, resumenAtleta, focoDelAtleta, GLOSARIO, FASES_VARIABLES
} from '../src/services/detalleAnalisis.js';

const comp = (valor, z, extra = {}) => ({ etiqueta: 'X', unidad: '°', referencia: { media: 30, de: 5 }, valor, z, estado: 'dentro_de_referencia', ...extra });
const analisis = (rodMin, ic, extra = {}) => ({
  version: '3.0-perfil', ipt_score: 85, variables_usadas: ['rodilla_min_balanceo', 'rodilla_contacto'],
  comparacion_referencia: {
    rodilla_min_balanceo: comp(rodMin, (rodMin - 31.6) / 5.6, { etiqueta: 'Rodilla mínima en el recobro', definicion: 'Ángulo 1.5' }),
    rodilla_contacto: comp(152, 0),
    tiempo_apoyo_s: { etiqueta: 'Tiempo de apoyo', unidad: 's', estado: 'no_comparable', motivo: 'Se necesitan 240 c/s.' },
    frecuencia_paso_hz: comp(4.5, -0.4, { etiqueta: 'Frecuencia de paso', unidad: 'Hz' })
  },
  perfil: [{ variable: 'rodilla_min_balanceo', etiqueta: 'Rodilla mínima en el recobro', valor: rodMin, z: (rodMin - 31.6) / 5.6 },
    { variable: 'rodilla_contacto', etiqueta: 'Rodilla al contacto', valor: 152, z: 0 }],
  cinematica_eventos: {
    fs_muestreo: 120, conteo_pasos: 12,
    regularidad: { regular: true, cv_tiempo_paso_pct: 1.8, motivos: [] },
    apoyo_estable: { estable: false, motivo: 'Apoyo poco claro.' },
    es_sprint: { es_sprint: true },
    variables: {
      rodilla_min_balanceo: { n: 12, media: rodMin, de: 1.2, cv_pct: 3, ic95: ic },
      frecuencia_paso_hz: { n: 11, media: 4.4, media_global: 4.5, de: 0.1, ic95: [4.4, 4.6] },
      tiempo_apoyo_s: { n: 12, media: 0.12, de: 0.01 }
    },
    pasos: [{ t_contacto: 0.2, rodilla_min_balanceo: rodMin - 1, pierna: 'A' }, { t_contacto: 0.42, rodilla_min_balanceo: rodMin + 1, pierna: 'B' }, { t_contacto: 0.64 }]
  },
  video_info: { detection_rate_pct: 72.5, fps: 30, duration_seconds: 4.2, resolution: '1080x1920' },
  ...extra
});

test('la tabla agrupa por fase en orden, con la estadística por paso y si entra al IPT', () => {
  const t = tablaVariables(analisis(45, [44, 46]));
  assert.deepEqual(t.map(f => f.fase), ['Contacto', 'Recobro', 'Ritmo']);
  const rec = t.find(f => f.fase === 'Recobro').filas[0];
  assert.equal(rec.media, 45); assert.equal(rec.de, 1.2); assert.equal(rec.n, 12); assert.deepEqual(rec.ic95, [44, 46]);
  assert.equal(rec.enIpt, true); assert.equal(rec.refMedia, 30); assert.equal(rec.definicion, 'Ángulo 1,5');
  const ritmo = t.find(f => f.fase === 'Ritmo').filas;
  assert.equal(ritmo.find(f => f.variable === 'frecuencia_paso_hz').media, 4.5, 'usa la media global de la frecuencia');
  assert.equal(ritmo.find(f => f.variable === 'tiempo_apoyo_s').estado, 'no_comparable');
  assert.deepEqual(tablaVariables({ version: '2.0' }), []);
});

test('datos del sprint y calidad de la toma salen de lo medido', () => {
  const d = datosSprint(analisis(45, null));
  assert.equal(d.frecuencia.media, 4.5); assert.equal(d.apoyo.media, 0.12); assert.equal(d.vuelo, null); assert.equal(d.pasos, 12);
  assert.equal(datosSprint({}), null);
  const c = calidadToma(analisis(45, null));
  const por = Object.fromEntries(c.items.map(i => [i.clave, i]));
  assert.equal(por.muestreo.ok, true); assert.equal(por.pasos.ok, true); assert.equal(por.regularidad.valor, 'CV 1,8 %');
  assert.equal(por.apoyo.ok, false); assert.equal(por.apoyo.detalle, 'Apoyo poco claro.');
  assert.equal(por.deteccion.ok, false);
  assert.equal(c.resumen.fps, 30);
  assert.equal(calidadToma({}), null);
});

test('explicación y motivos de confianza solo si existen', () => {
  assert.equal(explicacion({}), null);
  const e = explicacion({ prescripcion_completa: { sector: 'Sector 2: Recobro', causa_biomecanica: 'z 1.5', cue_verbal: 'Rodilla arriba', error_evitar: 'Sentarse' } });
  assert.deepEqual(e, { sector: 'Recobro', causa: 'z 1,5', cue: 'Rodilla arriba', evitar: 'Sentarse' });
  assert.deepEqual(motivosConfianza({ recomendaciones: { confianza: { nivel: 'media', motivos: ['Poca luz', ''] } } }), ['Poca luz']);
  assert.deepEqual(motivosConfianza({}), []);
});

test('un cambio por variable es real solo si los IC no se superponen', () => {
  const d = diferenciasEntre(analisis(50, [49, 51]), analisis(40, [39, 41]));
  const rec = d.find(x => x.variable === 'rodilla_min_balanceo');
  assert.equal(rec.delta, -10); assert.equal(rec.real, true); assert.equal(rec.seAcerca, true);
  const d2 = diferenciasEntre(analisis(45, [44, 46]), analisis(45.5, [44.5, 46.5]));
  assert.equal(d2.find(x => x.variable === 'rodilla_min_balanceo').real, false);
  const d3 = diferenciasEntre(analisis(45, null), analisis(40, null));
  assert.equal(d3.find(x => x.variable === 'rodilla_min_balanceo').real, null);
});

test('perfil comparado, valores por paso y foco del atleta', () => {
  const p = perfilComparado(analisis(50, null), analisis(40, null));
  assert.equal(p[0].variable, 'rodilla_min_balanceo');
  assert.ok(p[0].zAntes > p[0].zDespues);
  assert.deepEqual(valoresPorPaso(analisis(45, null), 'rodilla_min_balanceo').map(x => [x.i, x.valor, x.pierna]), [[1, 44, 'A'], [2, 46, 'B']]);
  const f = focoDelAtleta(analisis(45, null));
  assert.equal(f.variable, 'rodilla_min_balanceo'); assert.equal(f.sentido, 'mayor'); assert.ok(f.simple);
  assert.equal(focoDelAtleta(analisis(32, null)), null, 'sin variables a 1 DE o más, no hay foco');
});

test('resumen del atleta con mejor IPT, tendencia y variable recurrente', () => {
  const s = (id, fecha, ipt, ic, rod) => ({ id, sessionDate: fecha, iptScore: ipt, analysis: { ...analisis(rod, null), ipt_score: ipt, ic95: ic } });
  const r = resumenAtleta([s(3, '2026-11-20', 88, [87, 89], 40), s(2, '2026-11-10', 90, [89.5, 90.5], 42), s(1, '2026-11-01', 80, [79, 81], 50)]);
  assert.equal(r.mejor.ipt, 90); assert.equal(r.ultimo.ipt, 88); assert.equal(r.tendencia, 'baja');
  assert.equal(r.recurrente.variable, 'rodilla_min_balanceo'); assert.equal(r.recurrente.veces, 3);
  assert.equal(resumenAtleta([]).tendencia, null);
});

test('el glosario cubre todas las variables de la tabla', () => {
  for (const { claves } of FASES_VARIABLES) for (const k of claves) assert.ok(GLOSARIO[k]?.simple, k);
});
