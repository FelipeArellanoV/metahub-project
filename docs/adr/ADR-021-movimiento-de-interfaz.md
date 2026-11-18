# ADR-021: Movimiento de la interfaz con Framer Motion

Estado: aceptada (2026-11-17). Describe el trabajo de interfaz del 2026-11-13, que ya está en
`c472599`, y la carga diferida agregada el 2026-11-17.

## Contexto
La SPA cambiaba de pantalla y de estado de golpe:

- Los listados mostraban "Cargando…" y, mientras cargaban, mensajes falsos de vacío ("No hay
  videos cargados", filtros con "(0)", "menos de 2 sesiones").
- El avance del análisis de un video (en cola → analizando → listo / falló) era solo un texto.
  En el celular no se notaba cuándo cambiaba.
- `styles.css` tenía 15 `transition: all` y `motion.css` animaba colores, bordes y sombras. Eso
  obliga al navegador a repintar en cada cuadro y se nota en celulares de gama baja.
- Se animaba el ancho de las barras (`width` en `<progress>` y en las barras del IPT), lo que
  recalcula el diseño de la página en cada cuadro.

## Decisión

### 1. Framer Motion 11.18.2 con versión fija
- Se usa Framer Motion, fijado en `11.18.2` en `package.json` (sin `^`), para que una
  actualización no cambie las animaciones sin revisarlas.
- Alternativas descartadas:
  - **Solo CSS:** no resuelve las salidas animadas de componentes que se desmontan (drawer,
    modales, elementos de la cola) ni la reordenación de grillas al filtrar.
  - **React Spring u otra librería:** sin ventaja clara para estos casos, y Framer Motion
    resuelve `AnimatePresence` y `layout` sin código propio.

### 2. Piezas comunes en un solo lugar
- `apps/frontend/src/components/Motion.jsx` reúne:
  - `MotionProvider`: configuración global y carga diferida.
  - Variantes compartidas: `pageVariants`, `cardVariants`, `listItemVariants` y `staggerVariants`.
  - Esqueletos de carga: `Skeleton` y `SkeletonList`.
  - Indicadores de avance: `AnalysisProgress` y `SteppedProgress`.
- La lógica de los indicadores (qué tramo está listo, en curso o con error, el valor de
  `aria-valuenow` y la lectura de textos como "2/4: …") está en `components/progressState.js`,
  sin React, y se prueba con `node:test` en `tests/progress-state.test.mjs`.
- Los estilos de esas piezas están en `motion-ui.css`.

### 3. Reglas de movimiento
1. **Solo `opacity` y `transform`** (`x`, `y`, `scale`, `scaleX`). Nunca `width`, `height`,
   colores, bordes ni sombras: esos los resuelve el compositor sin repintar ni recalcular el
   diseño. Las barras de avance usan `scaleX` con `transform-origin: left`.
2. **Movimiento reducido:** `MotionConfig reducedMotion="user"`. Con `prefers-reduced-motion`
   activo, Framer Motion omite los desplazamientos y deja solo los fundidos. Las animaciones en
   bucle (el brillo de la barra de análisis) no se montan, y el tramo en curso queda relleno a
   medias y fijo.
3. **Duraciones cortas:** de 0,1 a 0,5 s, casi todas con curva de salida (`EASE_OUT`). La
   excepción es el brillo en bucle de los indicadores de avance (de 1,1 a 1,9 s por pasada). Las
   animaciones no retrasan ninguna acción: los botones responden de inmediato.
4. **Accesibilidad:** los indicadores tienen `role="progressbar"` con `aria-valuetext`. Los
   esqueletos se anuncian como un único "Cargando…" (`role="status"`) y no como bloques vacíos.
5. **Sin cambios de funcionalidad:** el movimiento cambia cómo aparece algo, no qué se muestra.
   La excepción es que se quitaron los mensajes falsos de vacío durante la carga.
6. **Se revisa en 390×844**, en tema claro, en tema oscuro y con movimiento reducido.

### 4. No usar `layoutId` en overlays que salen
- Las pestañas del drawer de la ficha del atleta tenían un subrayado con `layoutId`. Al cerrar
  el drawer, dentro de un `AnimatePresence`, el `layoutId` impedía terminar la salida: el drawer
  quedaba montado, invisible y encima de la pantalla, y bloqueaba todos los toques.
- Regla: **no usar `layoutId` dentro de drawers, modales ni nada que salga con
  `AnimatePresence`.** Para reordenar elementos dentro de una grilla se usa
  `layout="position"`, que no tiene este problema.

### 5. Carga diferida (`LazyMotion`)
- `MotionProvider` envuelve la app en `LazyMotion strict` y carga las funciones de animación
  (`domMax`) desde `components/motionFeatures.js` en un chunk aparte. Los componentes usan `m`,
  que `Motion.jsx` exporta con el nombre `motion`.
- Se usa `domMax` y no el más liviano `domAnimation` porque Athletes, Drills, SessionReviews y
  UploadVideo usan `layout="position"`.
- Con `strict`, renderizar el `motion` de `framer-motion` directamente lanza un error. **Siempre
  se importa `motion` desde `Motion.jsx`.** `AnimatePresence` sí se importa desde
  `framer-motion`.
- Resultado: el bundle principal bajó de 534,9 kB (159,6 kB con gzip) a 440,9 kB (129,9 kB),
  y el chunk de animaciones pesa 96,2 kB (31,0 kB) y llega después. Mientras carga, los
  elementos se ven en su estado final, sin animación.

## Consecuencias
- La interfaz indica qué está pasando: carga, avance del análisis y cambios de filtro. En el
  celular se nota cuándo un video pasa de "En cola" a "Listo".
- Los cambios de color al pasar el cursor ahora son instantáneos, porque ya no se animan.
- Una dependencia más (Framer Motion), con versión fija. Para actualizarla hay que revisar las
  pantallas en 390×844 y correr `npm test`.
- Quien agregue una animación nueva debe seguir las reglas de la sección 3 y, si es un overlay,
  la sección 4.
- Pendiente de verificar en un celular real: fluidez en gama baja y la PWA instalada (iOS y
  Android).

## Verificación
- Frontend: 28 pruebas con `node:test`, 9 de ellas de `progress-state.test.mjs`, y el build.
- Login con el build de producción en 390×844, en tema claro, en tema oscuro y con movimiento
  reducido: sin desborde horizontal y sin errores de consola con `LazyMotion strict`.
