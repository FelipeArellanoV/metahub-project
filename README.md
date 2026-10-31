# MetaHub Project

**Plataforma Web Progresiva para el Seguimiento Longitudinal de la Técnica de Carrera en Atletismo Escolar**

Trabajo de Título — Universidad Católica de Temuco, Ingeniería Civil en Informática
*Estudiantes:* Felipe Arellano Vargas y Sofía Henríquez Soto · *Profesor guía:* Marcos Levano

## Descripción

MetaHub permite registrar videos de carrera (vista lateral), estimar la postura con MediaPipe PoseLandmarker, calcular ángulos de rodilla y cadera, un índice de simetría y un índice compuesto (IPT), y guardar las sesiones para comparar la evolución de cada atleta en el tiempo.

## Arquitectura

| Servicio | Tecnología | Puerto | Responsabilidad |
|---|---|---|---|
| `frontend` | React + Vite (PWA), Nginx | 80 | Interfaz de entrenador, atleta y club; reproductor con esqueleto |
| `api-backend` | Node.js + Express | 3000 | Autenticación JWT, roles, atletas, sesiones, consentimientos, carga y análisis de videos |
| `cv-service` | Python + FastAPI + MediaPipe + OpenCV | 8000 | Estimación de pose y métricas biomecánicas |
| `db` | PostgreSQL + TimescaleDB | 5432 | Persistencia |

Las decisiones de arquitectura están en [`docs/adr/`](docs/adr) (ADR-001 a ADR-012). El historial de cambios está en [`CHANGELOG.md`](CHANGELOG.md).

## Puesta en marcha

```bash
cp .env.example .env            # y reemplace JWT_SECRET y la clave de la base de datos
docker-compose up --build        # levanta los cuatro servicios
```

`JWT_SECRET` es obligatorio (el compose no arranca sin él); `POSTGRES_USER` y `POSTGRES_PASSWORD` tienen valores por defecto solo para desarrollo. Sin PostgreSQL la API usa un archivo JSON (`apps/api-backend/data/database.json`) con datos de demostración; **la carga de videos requiere PostgreSQL**.

## Flujo de análisis

1. El entrenador (o el alumno, en su propia ficha) sube un video MP4, WebM o MOV de hasta 50 MB. Se exige consentimiento registrado (error 403 si falta).
2. La API guarda el video y crea la sesión (estado `uploaded`).
3. El análisis envía el video al `cv-service`, que muestrea cuadros, estima la pose y calcula las métricas.
4. Los ángulos se calculan en píxeles (independientes de la proporción del video). Solo se usan puntos con visibilidad y presencia ≥ 0,4 y dentro del encuadre; se descartan además rodillas con ángulo menor a 30°, que son fisiológicamente imposibles. El resultado informa `valid_rate_pct` y `low_confidence`.
5. La API guarda el IPT y el análisis en la sesión (estado `completed`) y la trayectoria de pose para superponer el esqueleto.

## Pruebas

| Suite | Comando |
|---|---|
| API (integración) | `cd apps/api-backend && node tests/run_tests.js` |
| API (permisos, flujo de video) | `cd apps/api-backend && node --test tests/*.test.js` (`auth.test.js` requiere `supertest`) |
| Geometría de pose | `cd apps/frontend && node --test tests/pose-geometry.test.mjs` |
| Métricas | `cd apps/cv-service && python test_metrics.py` |
| Servicio de visión (integración) | `cd apps/cv-service && python test_integration.py` |
| Rendimiento | `python analysis/medir_rendimiento_cv.py VIDEO 5` |
| Carga | `python analysis/prueba_carga_cv.py http://localhost:8000 VIDEO 1,3,5` |

El CI (`.github/workflows/ci.yml`) ejecuta estas suites.

## Estado y limitaciones

- **Implementado:** autenticación y roles, atletas y sesiones, consentimientos, carga y análisis de video, pose real, ángulos, simetría, IPT, filtro de calidad, reproductor con esqueleto.
- **Pendiente:** detección de eventos de zancada (T-10), validación del error frente a Kinovea (T-07), prueba de usabilidad (T-15), respuesta asíncrona 202 con sondeo (ADR-004), uso de la hypertable de TimescaleDB (ADR-006).
- **Experimental / diferido (ADR-010):** asistente de recomendaciones, rutinas, planificación, reportes, prioridad de apoyo y portal del alumno. No forman parte del núcleo validable.
- **Modo simulación** de la captura en vivo: genera datos de demostración, **no son mediciones**.
- El índice de simetría y el IPT **no están validados**: la simetría compara ángulos simultáneos de ambas rodillas y no distingue asimetría de fase normal.
- Las métricas **no están validadas** frente a una referencia manual. No usar para decisiones deportivas o médicas.

## Datos y privacidad

El sistema trata datos de menores de edad (leyes 19.628 y 21.719). No suba videos de personas sin consentimiento registrado. Los datos de `database.json` son de demostración.
