/**
 * Lógica pura de los indicadores de avance (AnalysisProgress y SteppedProgress de Motion.jsx).
 * Sin React ni Framer Motion, para poder probarla con node:test.
 */
import { normalizeStatus } from '../services/videoValidation.js';

export const ANALYSIS_STEPS = [
  { key: 'queued', label: 'En cola' },
  { key: 'processing', label: 'Analizando' },
  { key: 'completed', label: 'Listo' }
];

/** Estado de cada tramo ('idle' | 'active' | 'done' | 'error') según el estado de la cola. */
export function analysisStepState(status, index) {
  switch (normalizeStatus(status)) {
    case 'queued': return index === 0 ? 'active' : 'idle';
    case 'processing': return index === 0 ? 'done' : index === 1 ? 'active' : 'idle';
    case 'completed': return 'done';
    case 'failed': return index < 2 ? 'error' : 'idle';
    default: return 'idle';
  }
}

/** Valor de aria-valuenow (0 a 3) para el progressbar del análisis. */
export function analysisAriaValue(status) {
  switch (normalizeStatus(status)) {
    case 'completed': return 3;
    case 'processing': return 2;
    case 'queued': return 1;
    default: return 0;
  }
}

/**
 * Interpreta un texto de avance como "2/4: Detectando pose".
 * Si no tiene ese formato, el texto completo es el detalle y se asume el paso 1 de `total`.
 * El paso actual se acota a [1, steps] para que un texto raro no rompa el indicador.
 */
export function parseStepText(text, total = 4) {
  const match = /^(\d+)\s*\/\s*(\d+)\s*:?\s*(.*)$/.exec(text || '');
  if (!match || Number(match[2]) < 1) {
    return { current: 1, steps: Math.max(1, total), detail: text || '', numbered: false };
  }
  const steps = Number(match[2]);
  const current = Math.min(Math.max(Number(match[1]), 1), steps);
  return { current, steps, detail: match[3], numbered: true };
}

/** Estado del tramo `index` (base 0) cuando va en el paso `current` (base 1). */
export function steppedState(index, current) {
  return index + 1 < current ? 'done' : index + 1 === current ? 'active' : 'idle';
}

/** Cuánto se rellena un tramo (scaleX). El tramo en curso queda a medias si hay movimiento reducido. */
export function fillScale(state, reduce) {
  if (state === 'done' || state === 'error') return 1;
  if (state === 'active') return reduce ? 0.5 : 0.35;
  return 0;
}
