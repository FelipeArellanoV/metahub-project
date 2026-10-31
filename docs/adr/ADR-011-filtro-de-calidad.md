# ADR 011: Filtro de calidad de muestras en el resumen biomecánico

* **Estado:** Aprobado (umbral de plausibilidad por calibrar)
* **Fecha:** 2026-10-30

## Contexto
Al analizar un video 4K de 12,6 s con el servicio de visión, el resumen de sesión incluyó cuadros con el cuerpo recortado por el encuadre: flexión mínima de rodilla de 0,24° y simetría mínima de 1,11. El umbral de visibilidad 0,4 solo se aplicaba al dibujar el esqueleto, no al calcular las métricas.

## Decisión
1. Las métricas solo usan puntos con visibilidad y presencia >= 0,4 y dentro del encuadre (`reliable_keypoints`). Un punto bajo el umbral se omite; no se interpola.
2. Se descarta la rodilla de una pierna cuyo ángulo interno es menor a 30° (`MIN_PLAUSIBLE_KNEE_DEG`), por ser fisiológicamente imposible. El filtro de visibilidad no bastó: la muestra más grave tenía puntos con confianza alta pero geometría imposible.
3. La respuesta informa `valid_frames`, `valid_rate_pct`, `implausible_knees_dropped` y `low_confidence` (cuadros válidos < 80 %).

## Consecuencias
- Medido sobre el mismo video: flexión mínima 0,24° -> 38,08°; simetría mínima 1,11 -> 30,60; IPT y tiempo de procesamiento sin cambios.
- El umbral de 30° es una propuesta; debe calibrarse con las sesiones de validación frente a Kinovea (Etapa 4).
- `low_confidence` se informa pero aún no excluye sesiones de las series longitudinales.
- No reemplaza la validación del error angular.
