# ADR 005: Submuestreo configurable de cuadros

* **Estado:** Aprobado (implementado; medición preliminar con un video)
* **Fecha:** 2026-10-30

## Contexto
Procesar todos los cuadros de un video es costoso, y analizar solo los primeros cuadros ignora la mayor parte de la pasada.

## Decisión
El servicio de visión acepta `sample_stride` (1 a 60), `max_frames`, `scan_full_video` y `max_samples`. En análisis completo el paso efectivo es `max(sample_stride, ceil(fps/15), ceil(total_cuadros/max_samples))`. Se rechazan videos de más de 300 s en análisis completo (HTTP 413).

## Consecuencias
- Antes: solo los primeros 150 cuadros leídos con paso 3 (unos 5 s a 30 fps). Ahora: el video completo, acotado a un máximo de muestras.
- A mayor paso, menor resolución temporal; puede perderse el instante exacto de un evento de zancada.
- **Medición preliminar (video 4K, 12,6 s, 25 fps, 5 repeticiones):** modo anterior 6,45 s de mediana y 48 % del video cubierto; análisis completo 12,66 s y 100 % cubierto (`analysis/medir_rendimiento_cv.py`).
- **Pendiente:** p95 con más clips (10, 20 y 30 s) y el efecto del paso sobre el error angular (Etapa 4).
