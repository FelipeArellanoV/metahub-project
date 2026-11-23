// Perfil deportivo (ADR-026): validación del cuerpo, sin base de datos.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validar } = require('../src/services/perfilDeportivo');

test('acepta valores válidos y guarda vacíos como null', () => {
  assert.deepEqual(validar({ mainEvent: '100m', dominantLeg: 'derecha', heightCm: '172', bestMark: ' 12,45 s ' }),
    { mainEvent: '100m', dominantLeg: 'derecha', heightCm: 172, bestMark: '12,45 s' });
  assert.deepEqual(validar({}), { mainEvent: null, dominantLeg: null, heightCm: null, bestMark: null });
});

test('rechaza prueba, pierna o estatura no válidas', () => {
  assert.throws(() => validar({ mainEvent: 'maraton' }), /Prueba/);
  assert.throws(() => validar({ dominantLeg: 'ambas' }), /Pierna/);
  assert.throws(() => validar({ heightCm: 99 }), /estatura/);
  assert.throws(() => validar({ heightCm: 170.5 }), /estatura/);
});

test('el progreso no resta IPT de versiones distintas', () => {
  const { computeProgress } = require('../src/services/progress');
  const s = (id, fecha, ipt, version) => ({ id, sessionDate: fecha, iptScore: ipt, analysis: version ? { version } : {} });
  const p = computeProgress([s(1, '2026-11-01', 77.4, '3.0-perfil'), s(2, '2026-11-14', 60.8, '2.0-referenciado'), s(3, '2026-11-20', 89.8, '3.0-perfil')]);
  assert.equal(p.deltaAnterior, 12.4);
  assert.equal(p.deltaIpt, 12.4);
  const solo = computeProgress([s(2, '2026-11-14', 60.8, '2.0-referenciado'), s(3, '2026-11-20', 89.8, '3.0-perfil')]);
  assert.equal(solo.deltaAnterior, null);
});
