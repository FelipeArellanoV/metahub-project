import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compararProgreso,resumenPersonal} from '../src/services/progresoPersonal.js';

test('resume sesiones reales y encuentra el último IPT aunque haya sesiones sin puntaje', () => {
  const sesiones = [{id: 1, sessionDate: '2026-01-01', iptScore: 70, analizada: true},
    {id: 2, sessionDate: '2026-02-01', iptScore: null, analizada: false}];
  assert.deepEqual(resumenPersonal(sesiones), {total: 2, analizadas: 1, ultima: sesiones[0]});
  assert.deepEqual(resumenPersonal([]), {total: 0, analizadas: 0, ultima: null});
});

test('compara solo sesiones distintas con puntajes y versiones conocidas iguales', () => {
  const a = {id: 1, iptScore: 70, iptVersion: 3};
  assert.deepEqual(compararProgreso(a, {id: 2, iptScore: 73.4, iptVersion: 3}),
    {estado: 'comparable', inicial: 70, control: 73.4, delta: 3.4});
  assert.equal(compararProgreso(a, a).estado, 'seleccion');
  assert.equal(compararProgreso(a, {id: 2, iptScore: null, iptVersion: 3}).estado, 'sin_analisis');
  assert.equal(compararProgreso(a, {id: 2, iptScore: 80, iptVersion: 2}).estado, 'version_distinta');
  assert.equal(compararProgreso(a, {id: 2, iptScore: 80, iptVersion: null}).estado, 'sin_version');
});
