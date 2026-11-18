// Lógica de los indicadores de avance del análisis (AnalysisProgress y SteppedProgress).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYSIS_STEPS, analysisStepState, analysisAriaValue, parseStepText, steppedState, fillScale
} from '../src/components/progressState.js';

const tramos = status => ANALYSIS_STEPS.map((_, i) => analysisStepState(status, i));

test('el indicador del análisis tiene tres tramos: En cola, Analizando y Listo', () => {
  assert.deepEqual(ANALYSIS_STEPS.map(s => s.key), ['queued', 'processing', 'completed']);
  assert.deepEqual(ANALYSIS_STEPS.map(s => s.label), ['En cola', 'Analizando', 'Listo']);
});

test('cada estado de la cola marca los tramos que corresponden', () => {
  assert.deepEqual(tramos('queued'), ['active', 'idle', 'idle']);
  assert.deepEqual(tramos('processing'), ['done', 'active', 'idle']);
  assert.deepEqual(tramos('completed'), ['done', 'done', 'done']);
  assert.deepEqual(tramos('failed'), ['error', 'error', 'idle']);
});

test('los estados antiguos o desconocidos se tratan como en cola', () => {
  assert.deepEqual(tramos('uploaded'), tramos('queued'));
  assert.deepEqual(tramos(undefined), tramos('queued'));
  assert.deepEqual(tramos('raro'), tramos('queued'));
});

test('aria-valuenow avanza de 1 a 3 y vale 0 si el análisis falló', () => {
  assert.equal(analysisAriaValue('queued'), 1);
  assert.equal(analysisAriaValue('uploaded'), 1);
  assert.equal(analysisAriaValue('processing'), 2);
  assert.equal(analysisAriaValue('completed'), 3);
  assert.equal(analysisAriaValue('failed'), 0);
});

test('interpreta textos de avance numerados como "2/4: Detectando pose"', () => {
  assert.deepEqual(parseStepText('2/4: Detectando pose'), { current: 2, steps: 4, detail: 'Detectando pose', numbered: true });
  assert.deepEqual(parseStepText('3 / 5 Calculando IPT'), { current: 3, steps: 5, detail: 'Calculando IPT', numbered: true });
  // El texto real que usa el laboratorio de captura.
  assert.deepEqual(parseStepText('1/1: Enviando el video y esperando el análisis de MediaPipe…'),
    { current: 1, steps: 1, detail: 'Enviando el video y esperando el análisis de MediaPipe…', numbered: true });
});

test('un texto sin numerar se muestra completo como paso 1 del total indicado', () => {
  assert.deepEqual(parseStepText('Preparando…'), { current: 1, steps: 4, detail: 'Preparando…', numbered: false });
  assert.deepEqual(parseStepText('Preparando…', 3), { current: 1, steps: 3, detail: 'Preparando…', numbered: false });
  assert.deepEqual(parseStepText(''), { current: 1, steps: 4, detail: '', numbered: false });
  assert.deepEqual(parseStepText(undefined), { current: 1, steps: 4, detail: '', numbered: false });
});

test('un paso fuera de rango se acota para no dejar el indicador vacío o desbordado', () => {
  assert.equal(parseStepText('0/4: Inicio').current, 1);
  assert.equal(parseStepText('7/4: Fin').current, 4);
  assert.equal(parseStepText('1/0: Nada').numbered, false, 'cero pasos no es un avance válido');
  assert.equal(parseStepText('1/0: Nada').steps, 4);
});

test('los tramos de un avance por pasos: anteriores listos, el actual en curso, el resto en espera', () => {
  assert.deepEqual([0, 1, 2, 3].map(i => steppedState(i, 3)), ['done', 'done', 'active', 'idle']);
  assert.deepEqual([0, 1, 2, 3].map(i => steppedState(i, 1)), ['active', 'idle', 'idle', 'idle']);
  assert.deepEqual([0, 1, 2, 3].map(i => steppedState(i, 4)), ['done', 'done', 'done', 'active']);
});

test('el relleno de cada tramo respeta el movimiento reducido', () => {
  assert.equal(fillScale('done', false), 1);
  assert.equal(fillScale('error', false), 1);
  assert.equal(fillScale('idle', false), 0);
  assert.equal(fillScale('active', false), 0.35, 'con movimiento: relleno corto y el brillo lo recorre');
  assert.equal(fillScale('active', true), 0.5, 'sin movimiento: relleno fijo a medias, sin brillo');
});
