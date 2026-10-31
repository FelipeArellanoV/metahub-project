# Registro de cambios — MetaHub

Reconstruido el 2026-10-30 a partir del historial de git (rama `main`). Los mensajes originales se conservan entre paréntesis.

## [Etapa 3] 2026-10-05 a 2026-10-30
### Agregado
- Detector de contactos de zancada por máximo local del tobillo, con cadencia, tiempo de zancada y simetría por ciclo; 6 pruebas y campo `stride_analysis` en la respuesta del servicio. Primera versión, sin apoyo medio ni despegue y sin validar (T-10 parcial).
- Política de retención: purga de videos vencidos con plazo explícito (`RETENTION_DAYS`, sin valor por defecto), programada a diario y como script con simulación previa; 4 pruebas contra PostgreSQL real. Ver ADR-015 (T-12).
- Pruebas de las consultas SQL del panel del entrenador contra PostgreSQL real (alcance propio y de club) y job de CI con TimescaleDB (`tests/panel-entrenador-pg.test.js`, T-13).
- Pruebas del panel del entrenador: lista, ficha, permisos y progreso (`tests/panel-entrenador.test.js`, 6 pruebas), ejecutadas por el CI (T-13).
- Lógica de comparación de sesiones separada de la vista (`metricasSesion.js`) y 6 pruebas automatizadas; el CI las ejecuta (T-06).
- IPT con entradas robustas (percentiles 95 y 5), estado experimental explícito, advertencia de umbral y análisis de sensibilidad (`analysis/sensibilidad_ipt.py`). Ver ADR-014.
- Simetría de sesión por pierna (rango de movimiento de rodilla), independiente de la fase de la zancada; se declara no evaluable con pocas muestras y se excluye del IPT en ese caso. Ver ADR-013 (T-10, primera versión).
- Pipeline real de MediaPipe PoseLandmarker con análisis de video completo, submuestreo configurable y esqueleto sobre el video (`91b96c7`, `8b6394b`). Ver ADR-005.
- Carga de video con validación de formato y tamaño, idempotencia, consentimiento obligatorio y permisos por rol (`8b6394b`).
- Fecha de nacimiento con edad dinámica y tabla de consentimientos (`2683a4e`).
- Seguimiento y sincronización alumno–entrenador (`bfd71c5`).
- Persistencia real, roles independientes y grabación de pasadas (`f96e679`).
- Cámara en vivo, tres fases e índice IPT (`636bc65`).
- Pruebas: permisos de video (5) y geometría de pose (5) (`8b6394b`).
- Filtro de calidad en el servicio de visión: solo puntos con visibilidad/presencia ≥ 0,4 y dentro del encuadre, descarte de rodillas < 30°, `valid_rate_pct` y `low_confidence` (2026-10-30). Ver ADR-011.
- Corrección de la proporción de imagen: ángulos calculados en píxeles, y `image_width`/`image_height` en `/api/cv/metrics` (2026-10-30). Ver ADR-012.
- Pruebas de integración del servicio de visión (9) y del flujo de video T-05 (6, `apps/api-backend/tests/video-pipeline.test.js`) (2026-10-30).
- `analysis/medir_rendimiento_cv.py` (rendimiento) y `analysis/prueba_carga_cv.py` (carga) (2026-10-30).
- CI ampliado a las 9 suites; README reescrito (2026-10-30).
- `JWT_SECRET` obligatorio en `docker-compose.yml` (se retira el valor por defecto) y `.env.example` (2026-10-30).
- `analysis/validar_kinovea.py` (MAE, RMSE, Bland-Altman, ICC) y planillas de anotación en `analysis/kinovea/` (2026-10-30).
### Cambiado
- Conexión del frontend con la API y CRUD de atletas (`5500fad`).
- Rediseño visual y temas claro/oscuro (`4965d6f`, `8b6394b`).
### Fuera de alcance (diferido, ver ADR-010)
- Asistente IA basado en reglas y vistas complementarias (`216e5c0`, `4965d6f`).
### Eliminado
- `RESUMEN_CAMBIOS_METAHUB_UCT.txt` (`7b1b39b`) y `CHANGELOG.md` (`baacae4`); este archivo lo reemplaza.

## [Etapa 2] 2026-09-25 a 2026-10-01
### Agregado
- Estructura inicial de `frontend`, `cv-service` y `api-backend` (`b1a19d4`).
- PWA React, API con autenticación JWT e inicio de sesión de entrenador (`7bf3b10`, `93b90fe`).
- Endpoints de atletas y sesiones, con pruebas (`57f4e42`).
- Esquema PostgreSQL con hypertable TimescaleDB, T-09 (`6b5e204`).
- Docker Compose, T-08 (`1306e7d`).
- bcrypt costo 12, JWT 15 min, motor biomecánico, CI y documentación (`539284a`).
- Navegación y vistas responsivas (`12f67c9`).
