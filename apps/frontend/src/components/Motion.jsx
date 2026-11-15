/**
 * Movimiento de la interfaz (Framer Motion).
 *
 * Reglas para todo lo que se anima aquí:
 *  - Solo opacity y transform (x, y, scale, scaleX). Nada de width, height, color ni sombras.
 *  - MotionConfig reducedMotion="user": con prefers-reduced-motion activo, Framer omite las
 *    animaciones de transform y deja solo los fundidos de opacidad. Las animaciones en bucle
 *    (barra de análisis) se detienen por completo.
 *  - Nada aquí cambia qué se muestra ni el comportamiento: solo cómo aparece.
 */
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion';
import { normalizeStatus, statusInfo } from '../services/videoValidation.js';

export const EASE_OUT = [0.22, 1, 0.36, 1];

export function MotionProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.32, ease: EASE_OUT }}>
      {children}
    </MotionConfig>
  );
}

/** Entrada de pantalla: fundido y desplazamiento corto hacia arriba.
 *  Escalona a los hijos con variants={cardVariants} (tarjetas de cada pantalla). */
export const pageVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE_OUT, staggerChildren: 0.06, delayChildren: 0.04 } }
};

/** Contenedor que escalona la entrada de sus hijos (tarjetas, campos). */
export function staggerVariants(stagger = 0.06, delay = 0) {
  return {
    initial: {},
    animate: { transition: { staggerChildren: stagger, delayChildren: delay } }
  };
}

/** Entrada de una tarjeta o bloque dentro de un contenedor escalonado. */
export const cardVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.18 } }
};

/** Elemento de una lista que puede crecer con el tiempo (cola de videos). custom = índice. */
export const listItemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: i => ({ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT, delay: Math.min(i || 0, 6) * 0.05 } }),
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.18 } }
};

/** Bloque gris con brillo que recorre su ancho mientras carga el contenido real. */
export function Skeleton({ width = '100%', height = 14, radius = 8, className = '' }) {
  return <span aria-hidden="true" className={'mh-skeleton ' + className} style={{ width, height, borderRadius: radius }} />;
}

/**
 * Lista de esqueletos para un listado que aún no llega.
 * El lector de pantalla oye un único "Cargando…" en vez de bloques vacíos.
 */
export function SkeletonList({ rows = 3, label = 'Cargando…' }) {
  return (
    <div className="mh-skeleton-list" role="status" aria-live="polite" aria-busy="true">
      <span className="mh-visually-hidden">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div className="mh-skeleton-row" key={i}>
          <div className="mh-skeleton-row-head">
            <Skeleton width={`${62 - i * 9}%`} height={16} />
            <Skeleton width={74} height={24} radius={999} />
          </div>
          <Skeleton width="78%" height={11} />
          <Skeleton width="46%" height={11} />
        </div>
      ))}
    </div>
  );
}

const STEPS = [
  { key: 'queued', label: 'En cola' },
  { key: 'processing', label: 'Analizando' },
  { key: 'completed', label: 'Listo' }
];

/** Qué tramos están completos y cuál está en curso para cada estado de la cola. */
function stepState(status, index) {
  switch (status) {
    case 'queued': return index === 0 ? 'active' : 'idle';
    case 'processing': return index === 0 ? 'done' : index === 1 ? 'active' : 'idle';
    case 'completed': return 'done';
    case 'failed': return index < 2 ? 'error' : 'idle';
    default: return 'idle';
  }
}

/**
 * Indicador del avance del análisis de un video: En cola → Analizando → Listo.
 * El tramo en curso muestra un brillo que lo recorre (transform); los completos se
 * rellenan con scaleX. Con movimiento reducido el tramo en curso queda relleno a medias, fijo.
 */
export function AnalysisProgress({ status, filename }) {
  const reduce = useReducedMotion();
  const state = normalizeStatus(status);
  const info = statusInfo(state);
  return (
    <div
      className={'mh-analysis mh-analysis-' + state}
      role="progressbar"
      aria-label={'Estado del análisis' + (filename ? ' de ' + filename : '')}
      aria-valuemin={0}
      aria-valuemax={3}
      aria-valuenow={state === 'completed' ? 3 : state === 'processing' ? 2 : state === 'queued' ? 1 : 0}
      aria-valuetext={info.label}
    >
      <div className="mh-analysis-track">
        {STEPS.map((step, i) => {
          const s = stepState(state, i);
          return (
            <span key={step.key} className={'mh-analysis-seg mh-seg-' + s}>
              <motion.span
                className="mh-analysis-fill"
                initial={false}
                animate={{ scaleX: s === 'done' || s === 'error' ? 1 : s === 'active' ? (reduce ? 0.5 : 0.35) : 0 }}
                transition={{ duration: 0.5, ease: EASE_OUT, delay: s === 'done' ? i * 0.08 : 0 }}
              />
              {s === 'active' && !reduce && (
                <motion.span
                  className="mh-analysis-shine"
                  initial={{ x: '-100%' }}
                  animate={{ x: '250%' }}
                  transition={{ duration: state === 'processing' ? 1.15 : 1.9, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.15 }}
                />
              )}
            </span>
          );
        })}
      </div>
      <div className="mh-analysis-labels" aria-hidden="true">
        {STEPS.map((step, i) => (
          <span key={step.key} className={'mh-label-' + stepState(state, i)}>{step.label}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Avance por pasos numerados ("2/4: …"): tramos completos rellenos, el actual con brillo.
 * Mismo lenguaje visual que AnalysisProgress, para procesos de duración incierta.
 */
export function SteppedProgress({ text, total = 4, label = 'Progreso del análisis' }) {
  const reduce = useReducedMotion();
  const match = /^(\d+)\s*\/\s*(\d+)\s*:?\s*(.*)$/.exec(text || '');
  const current = match ? Number(match[1]) : 1;
  const steps = match ? Number(match[2]) : total;
  const detail = match ? match[3] : text;
  return (
    <div className="mh-stepped" role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuemax={steps} aria-valuenow={current} aria-valuetext={detail}>
      <div className="mh-analysis-track" style={{ gridTemplateColumns: `repeat(${steps}, 1fr)` }}>
        {Array.from({ length: steps }, (_, i) => {
          const state = i + 1 < current ? 'done' : i + 1 === current ? 'active' : 'idle';
          return (
            <span key={i} className={'mh-analysis-seg mh-seg-' + state}>
              <motion.span className="mh-analysis-fill" initial={false}
                animate={{ scaleX: state === 'done' ? 1 : state === 'active' ? (reduce ? 0.5 : 0.35) : 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT }} />
              {state === 'active' && !reduce && (
                <motion.span className="mh-analysis-shine" initial={{ x: '-100%' }} animate={{ x: '250%' }}
                  transition={{ duration: 1.1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.1 }} />
              )}
            </span>
          );
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.strong key={detail} className="mh-stepped-label"
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
          {match ? `Paso ${current} de ${steps} · ` : ''}{detail}
        </motion.strong>
      </AnimatePresence>
    </div>
  );
}

export { motion };
