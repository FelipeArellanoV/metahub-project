# ADR 009: Asistente de IA desacoplado del cálculo biomecánico

* **Estado:** Aprobado
* **Fecha:** 2026-10-30

## Contexto
El diseño de la Etapa 2 incluye un asistente que sugiere ejercicios. Las métricas biomecánicas deben ser verificables de forma independiente.

## Decisión
El cálculo de métricas no depende del asistente. El asistente solo consume resultados ya calculados y no escribe sobre ellos.

## Consecuencias
- Se puede validar el núcleo sin el asistente.
- **Estado real:** no existe ninguna llamada a un modelo de lenguaje. Solo hay reglas por umbral en `LiveCapture.jsx`. Ver ADR-010.
