# ADR 007: Vista sagital con cámara fija

* **Estado:** Aprobado
* **Fecha:** 2026-10-30

## Contexto
La estimación de ángulos 2D depende del plano de captura. Una cámara en movimiento o en ángulo introduce error.

## Decisión
Captura en plano sagital, perpendicular a la carrera, con trípode fijo a la altura de la cadera, a 3 a 5 m, cuerpo completo en el encuadre y 60 fps recomendados (mínimo 30).

## Consecuencias
- Reduce el error de proyección en los ángulos de rodilla y cadera.
- Limita el uso a capturas preparadas; no cubre video casual.
- **Pendiente:** el rechazo automático de capturas fuera de estas condiciones no está implementado; hoy solo se informa `detection_rate_pct`.
