# ADR 004: Procesamiento asíncrono del análisis de video

* **Estado:** Aprobado (implementación parcial)
* **Fecha:** 2026-10-30

## Contexto
El análisis de video puede durar decenas de segundos o más. Bloquear la solicitud HTTP degrada la experiencia y ocupa la API.

## Decisión
Modelar el análisis como estados de la carga (`uploaded`, `processing`, `completed`, `failed`) con reclamo atómico para evitar análisis duplicados, e idempotencia en la carga mediante `requestId`. Diseño objetivo: responder 202 y consultar el estado por sondeo.

## Consecuencias
- Los estados, el reclamo atómico y la idempotencia **están implementados**.
- **Brecha:** la solicitud de análisis aún espera la respuesta del servicio de visión (tiempo límite de 600 s); no existe respuesta 202 ni endpoint de sondeo. Se cierra en la Etapa 4.
