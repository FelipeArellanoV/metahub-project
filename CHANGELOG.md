# Changelog — MetaHub Project

Todas las modificaciones destacadas en este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-09-29

### Añadido
- **Autenticación & Seguridad RNF03:** Implementación de `bcryptjs` con costo de salting 12 y firmas `jsonwebtoken` oficiales con expiración estricta de 15 minutos.
- **Protección de Roles:** Asignación segura del rol `entrenador` en el registro público para prevenir escalado de privilegios no autorizado a `admin`.
- **CRUD Completo de Atletas (T-04):** Endpoints REST para crear, consultar, actualizar (`PUT`) y eliminar (`DELETE`) atletas con aislamiento estricto por `trainerId`.
- **Gestión de Sesiones de Carrera:** Endpoints `POST /api/sessions` y `GET /api/athletes/:athleteId/sessions`.
- **PostgreSQL & TimescaleDB (T-09):** Esquema DDL `schema.sql` con creación de la Hypertable `biomechanical_metrics` particionada por tiempo y adaptador `pgClient.js`.
- **Servicio de Visión por Computador (T-01 a T-03):** Motor biomecánico en FastAPI (Python) con MediaPipe BlazePose para cálculo de ángulos articulares (rodilla, cadera) y métrica de simetría de zancada.
- **Orquestación Docker (T-08):** Archivos `Dockerfile` optimizados para `api-backend`, `frontend` y `cv-service`, junto con `docker-compose.yml` unificado.
- **Integración Continua (T-14):** Pipeline de GitHub Actions `.github/workflows/ci.yml`.
- **Registros de Decisiones de Arquitectura (ADR):** `docs/adr/ADR-001-architecture-overview.md` y `docs/adr/ADR-002-jwt-bcrypt-security.md`.

### Corregido
- Paquete apt en `cv-service/Dockerfile` actualizado de `libgl1-mesa-glx` a `libgl1` y `libglib2.0-0` para compatibilidad con Debian Bookworm/python:3.10-slim.
- Alineación de puerto de backend a `3000` por defecto.
- Eliminación de credenciales precargadas en el formulario de inicio de sesión en React.
