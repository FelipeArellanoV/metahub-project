// Gráficos del IPT e informe de sesión (ADR-025): solo datos guardados, solo IPT v3 comparable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lecturaIpt, bandaZ, versionIpt, serieEvolucion, cambioEntre, perfilDeAnalisis, fasesDeAnalisis,
  limiteZ, dominioEvolucion
} from '../src/services/informeIpt.js';

const v3 = (ipt, ic95, extra = {}) => ({ version: '3.0-perfil', ipt_score: ipt, ic95, provisional: false, ...extra });
const ses = (id, fecha, ipt, analysis) => ({ id, sessionDate: fecha, iptScore: ipt, analysis });

test('la lectura sigue la escala: 90 y 80 son 1 y 2 DE', () => {
  assert.equal(lecturaIpt(90).tono, 'ok');
  assert.equal(lecturaIpt(89.9).tono, 'warn');
  assert.equal(lecturaIpt(80).tono, 'warn');
  assert.equal(lecturaIpt(79.9).tono, 'bad');
  assert.equal(lecturaIpt(null), null);
});

test('banda por |z| y versión del análisis', () => {
  assert.equal(bandaZ(-0.5), 'ok');
  assert.equal(bandaZ(1.5), 'warn');
  assert.equal(bandaZ(-2.4), 'bad');
  assert.equal(versionIpt({ version: '3.0-perfil' }), 3);
  assert.equal(versionIpt({ version: '2.0-referenciado' }), 2);
  assert.equal(versionIpt({ ipt_score: 70 }), 1);
  assert.equal(versionIpt(null), null);
});

test('la serie queda en orden cronológico y excluye IPT de otras versiones y sesiones sin IPT', () => {
  const { puntos, otrasVersiones } = serieEvolucion([
    ses(4, '2026-11-20T10:00:00Z', 88, v3(88, [87, 89])),
    ses(3, '2026-11-18T10:00:00Z', 70, { version: '2.0-referenciado', ipt_score: 70 }),
    ses(2, '2026-11-15T10:00:00Z', null, v3(null, null)),
    ses(1, '2026-11-10T10:00:00Z', 84, v3(84, null, { provisional: true }))
  ]);
  assert.deepEqual(puntos.map(p => p.id), [1, 4]);
  assert.equal(otrasVersiones, 1);
  assert.equal(puntos[0].ic95, null);
  assert.equal(puntos[0].provisional, true);
  assert.deepEqual(puntos[1].ic95, [87, 89]);
});

test('la serie acepta el formato del portal (ic95 e iptVersion en la sesión)', () => {
  const { puntos } = serieEvolucion([
    { id: 9, sessionDate: '2026-11-20', iptScore: 91, iptVersion: 3, ic95: [90, 92] },
    { id: 8, sessionDate: '2026-11-19', iptScore: 60, iptVersion: 2, ic95: null }
  ]);
  assert.deepEqual(puntos.map(p => p.id), [9]);
});

test('un cambio solo es real si los IC no se superponen', () => {
  const a = { ipt: 82, ic95: [81, 83] };
  assert.equal(cambioEntre(a, { ipt: 86, ic95: [85, 87] }).criterio, 'mejora_real');
  assert.equal(cambioEntre(a, { ipt: 78, ic95: [77, 79] }).criterio, 'baja_real');
  assert.equal(cambioEntre(a, { ipt: 83.5, ic95: [82.5, 84.5] }).criterio, 'dentro_de_la_variabilidad');
  assert.equal(cambioEntre(a, { ipt: 90, ic95: null }).criterio, 'sin_ic');
  assert.equal(cambioEntre(a, { ipt: 83.5, ic95: [82.5, 84.5] }).delta, 1.5);
  assert.equal(cambioEntre(null, a), null);
});

test('el perfil sale ordenado por |z| con su banda, y vacío si no es v3', () => {
  const perfil = perfilDeAnalisis(v3(85, null, { perfil: [
    { variable: 'a', etiqueta: 'Rodilla al contacto', valor: 160, referencia: '158 ± 5 °', z: 0.4, aporte_puntos: 4 },
    { variable: 'b', etiqueta: 'Rodilla mínima', valor: 45, referencia: '33 ± 5 °', z: -2.4 },
    { variable: 'c', etiqueta: 'Sin z', z: null }
  ] }));
  assert.deepEqual(perfil.map(p => p.variable), ['b', 'a']);
  assert.equal(perfil[0].banda, 'bad');
  assert.equal(perfil[0].aporte, 24);
  assert.equal(perfil[1].aporte, 4);
  assert.deepEqual(perfilDeAnalisis({ version: '2.0', perfil: [{ z: 1 }] }), []);
});

test('fases del análisis v3, con la simetría marcada como aparte', () => {
  const fases = fasesDeAnalisis(v3(85, null, { desglose_sectores: {
    sector_contacto: { nombre: 'Contacto', score: 92 },
    sector_1_propulsion: { nombre: 'Despegue', score: null },
    simetria_bilateral: { nombre: 'Simetría', score: 70, ponderacion: 'no entra al IPT' }
  } }));
  assert.deepEqual(fases.map(f => [f.nombre, f.score, f.aparte]), [['Contacto', 92, false], ['Despegue', null, false], ['Simetría', 70, true]]);
});

test('escalas de los gráficos', () => {
  assert.equal(limiteZ([{ z: 0.5 }]), 3);
  assert.equal(limiteZ([{ z: -3.4 }]), 4);
  assert.deepEqual(dominioEvolucion([{ ipt: 88, ic95: [86, 90] }]), [75, 95]);
  assert.deepEqual(dominioEvolucion([{ ipt: 62, ic95: [58, 66] }, { ipt: 97, ic95: null }]), [55, 100]);
});

test('las referencias se muestran con coma decimal', async () => {
  const { decimalesCl } = await import('../src/services/informeIpt.js');
  assert.equal(decimalesCl('4.1 ± 8.6 °'), '4,1 ± 8,6 °');
  assert.equal(decimalesCl('Sub-18. Fin'), 'Sub-18. Fin');
  assert.equal(decimalesCl(null), null);
});
