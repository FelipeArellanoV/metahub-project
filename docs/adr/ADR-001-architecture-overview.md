# ADR 001: Arquitectura Multiservicio Desacoplada (Frontend, Backend API, CV Service, TimescaleDB)

* **Estado:** Aprobado
* **Fecha:** 2026-09-29

## Contexto
MetaHub es una plataforma PWA diseñada para el seguimiento longitudinal de métricas biomecánicas en atletas escolares. Requiere procesamiento en tiempo real / desacoplado de visión por computador y almacenamiento eficiente de series de tiempo.

## Decisión
Se adopta una arquitectura de microservicios contenerizados mediante Docker Compose:
1. **Frontend:** React + Vite (PWA) servido vía Nginx.
2. **API Backend:** Node.js + Express / HTTP para gestión transaccional, usuarios JWT y atletas.
3. **CV Service:** Python + FastAPI + MediaPipe BlazePose para procesamiento de visión por computador.
4. **Base de Datos:** PostgreSQL + extensión TimescaleDB (Hypertable) para métricas biomecánicas.

## Consecuencias
- **Positivas:** Desacoplamiento de tecnologías (Node.js para I/O rápido y Python para procesamiento numérico/pose ML). Escalabilidad independiente.
- **Riesgos:** Mayor complejidad de orquestación, resuelta mediante `docker-compose.yml`.
