// Inicio del entrenador: último análisis y avisos, solo con datos guardados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ultimoAnalisis, avisosEquipo, SIMETRIA_BAJA } from '../src/services/resumenEquipo.js';

const sesion = (id, ipt, sm = {}, extra = {}) => ({
  id, sessionDate: '2026-11-14T23:00:00Z', iptScore: ipt,
  analysis: ipt == null ? null : { summary_metrics: sm, ...extra }
});

// Datos con la forma real de la API (sesiones #3 y #2 de la base de desarrollo).
const s3 = sesion(3, 60.8, { min_knee_flexion: 95.24, avg_symmetry_score: 42.54, symmetry_valid: true },
  { sector_prioritario: 'Sector 3: Simetría / Contacto', recomendaciones: { confianza: { nivel: 'baja' } } });
const s2 = sesion(2, 60.6, { min_knee_flexion: 90.04, avg_symmetry_score: 89.92, symmetry_valid: true });

test('el último análisis es la sesión más reciente con IPT y se compara con la anterior', () => {
  const r = ultimoAnalisis([s3, s2]);
  assert.equal(r.session.id, 3);
  assert.equal(r.ipt, 60.8);
  assert.equal(r.deltaIpt, 0.2);
  assert.equal(r.flexionRodilla, 95.24);
  assert.equal(r.simetria, 42.54);
  assert.equal(r.simetriaAnterior, 89.92);
  assert.equal(r.sectorPrioritario, 'Sector 3: Simetría / Contacto');
  assert.equal(r.confianza, 'baja');
});

test('ignora sesiones pendientes de análisis y no inventa diferencia sin sesión anterior', () => {
  const r = ultimoAnalisis([sesion(9, null), s2]);
  assert.equal(r.session.id, 2);
  assert.equal(r.deltaIpt, null);
  assert.equal(r.simetriaAnterior, null);
  assert.equal(ultimoAnalisis([sesion(9, null)]), null);
  assert.equal(ultimoAnalisis([]), null);
  assert.equal(ultimoAnalisis(undefined), null);
});

test('una simetría marcada como no válida no se muestra', () => {
  const r = ultimoAnalisis([sesion(4, 70, { avg_symmetry_score: 30, symmetry_valid: false })]);
  assert.equal(r.simetria, null);
});

test('avisos: simetría baja primero, luego confianza baja y consentimientos pendientes', () => {
  const athletes = [
    { id: 2, name: 'Atleta Prueba UI', canEdit: true, consent: true },
    { id: 3, name: 'Segundo Atleta UI', canEdit: true, consent: false },
    { id: 7, name: 'Atleta de otro entrenador', canEdit: false, consent: false }
  ];
  const avisos = avisosEquipo(athletes, { athlete: athletes[0], sessions: [s3, s2] });
  assert.deepEqual(avisos.map(a => [a.nombre, a.tipo, a.tono]), [
    ['Atleta Prueba UI', 'simetria', 'alto'],
    ['Atleta Prueba UI', 'confianza', 'medio'],
    ['Segundo Atleta UI', 'consentimiento', 'medio']
  ]);
  assert.equal(avisos[0].texto, 'Simetría bajó de 89.9% a 42.5%');
});

test('sin ficha seleccionada solo avisa los consentimientos de atletas propios', () => {
  const avisos = avisosEquipo([{ id: 3, name: 'B', canEdit: true, consent: false }], null);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].tipo, 'consentimiento');
  assert.deepEqual(avisosEquipo([], null), []);
});

test(`una simetría de ${SIMETRIA_BAJA}% o más no genera aviso`, () => {
  const ok = sesion(5, 80, { avg_symmetry_score: SIMETRIA_BAJA, symmetry_valid: true });
  assert.deepEqual(avisosEquipo([], { athlete: { id: 1, name: 'A' }, sessions: [ok] }), []);
});
