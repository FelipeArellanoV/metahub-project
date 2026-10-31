# ADR 010: Control de alcance: diferir el asistente de IA y las vistas complementarias

* **Estado:** Aceptada (aprobada por el profesor guía, Marcos Levano, el 2026-10-30, según comunicación a los autores)
* **Fecha:** 2026-10-30

## Contexto
La retroalimentación de la Etapa 2 señala que el asistente de IA se aparta del alcance de la Etapa 1 y pide priorizar el núcleo biomecánico. T-16 a T-18 suman 36 h de 192 h (18,75 %). El repositorio contiene además vistas fuera del núcleo (rutinas, planificación, reportes, prioridad de apoyo, clubes, portal del alumno).

## Decisión
1. El asistente de IA queda como extensión opcional y diferida; RF13 a RF15 pasan de "debe" a "podría".
2. Las vistas complementarias se consideran experimentales y no cuentan como avance del backlog.
3. No se inicia trabajo nuevo en ellas hasta validar las métricas del núcleo (MAE, ICC, rendimiento) y contar con aprobación expresa.
4. Un commit por tarea del backlog, con formato `tipo(ámbito): descripción`.

## Consecuencias
- El esfuerzo se redirige a T-10, T-01 y la validación.
- T-16 a T-18 siguen en el denominador del backlog (18) para no inflar el avance.
