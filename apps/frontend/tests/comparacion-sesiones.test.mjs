// T-06: lógica de comparación de sesiones (extracción de métricas y diferencias B - A).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {extraerMetricasSesion, compararSesiones, formatearMetrica} from '../src/services/metricasSesion.js';

const ses = (id, over = {}) => ({id, iptScore: 70, notes: 'Pasada ' + id, sessionDate: '2026-10-10T12:00:00Z',
  analysis: {summary_metrics: {min_knee_flexion: 55, peak_hip_extension: 170, avg_symmetry_score: 80, cadence_hz: 3, stride_length_m: 1.2, speed_ms: 3.6}}, ...over});

test('sin sesión no inventa mediciones y marca la sesión no disponible', () => {
  const m = extraerMetricasSesion(undefined);
  assert.equal(m.id, 'N/A');
  assert.equal(m.title, 'Sesión no disponible');
});

test('extrae IPT y métricas de una sesión real', () => {
  const m = extraerMetricasSesion(ses(7));
  assert.equal(m.id, 'SES-007');
  assert.equal(m.ipt, 70);
  assert.equal(m.symmetry, 80);
  assert.equal(m.cadenceHz, 3);
  assert.equal(m.cadencePpm, 180);
});

test('si falta el análisis los valores quedan como NaN y no como cero', () => {
  const m = extraerMetricasSesion({id: 3, analysis: null});
  assert.ok(Number.isNaN(m.symmetry));
  assert.ok(Number.isNaN(m.speedMs));
  assert.equal(formatearMetrica(m.symmetry, 1), 'Sin medición');
});

test('la diferencia se calcula como B menos A', () => {
  const a = extraerMetricasSesion(ses(1, {iptScore: 70}));
  const b = extraerMetricasSesion(ses(2, {iptScore: 78.5, analysis: {summary_metrics: {min_knee_flexion: 50, avg_symmetry_score: 90, cadence_hz: 3.3, stride_length_m: 1.3, speed_ms: 4.29}}}));
  const c = compararSesiones(a, b);
  assert.equal(c.ipt.diff, 8.5);
  assert.equal(c.symmetry.diff, 10);
  assert.ok(Math.abs(c.cadenceHz.diff - 0.3) < 1e-9);
  assert.ok(Math.abs(c.ipt.pct - (8.5 / 70) * 100) < 1e-9);
});

test('si una métrica falta en alguna sesión, la diferencia es null y no cero', () => {
  const a = extraerMetricasSesion(ses(1));
  const b = extraerMetricasSesion({id: 2, iptScore: 75, analysis: {summary_metrics: {}}});
  const c = compararSesiones(a, b);
  assert.equal(c.ipt.diff, 5);
  assert.equal(c.symmetry.diff, null);
  assert.equal(c.speedMs.pct, null);
});

test('el IPT de la sesión tiene prioridad sobre el del análisis y se tolera su ausencia', () => {
  assert.equal(extraerMetricasSesion(ses(1, {iptScore: 61, analysis: {ipt_score: 99, summary_metrics: {}}})).ipt, 61);
  assert.equal(extraerMetricasSesion({id: 4, analysis: {ipt_score: 99, summary_metrics: {}}}).ipt, 99);
  assert.ok(Number.isNaN(extraerMetricasSesion({id: 5}).ipt));
});
