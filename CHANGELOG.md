# Registro de cambios — MetaHub

Reconstruido el 2026-10-30 a partir del historial de git (rama `main`). Los mensajes originales se conservan entre paréntesis.

## [Sin publicar] 2026-11-17 — nuevo diseño visual (etapa 3: resto de pantallas) y funciones que fingían funcionar
### Cambiado
- Comparar: selectores de atleta, "Antes" y "Después"; tarjeta con el IPT antes y después; grilla de cambios por medición, y videos con el esqueleto. Se quitaron las frases de "Impacto", que afirmaban beneficios aunque la medición empeorara, y el veredicto entre comillas.
- Ejercicios: un solo diseño con el plan sugerido (mediciones, confianza plegable, hallazgos y ejercicios) y un catálogo con tarjetas y "Cómo hacerlo" plegable. Se reemplazó la paleta azul marino propia.
- Revisiones, Seguimiento, Clubes y Evolución: títulos cortos, el banner promocional pasa a una fila de cifras, las acciones de los formularios dejan de ser naranjas, y en Revisiones el formulario para vincular un ejercicio queda plegado.
- Laboratorio de captura: siempre en oscuro, con la paleta del sistema en vez del neón, sin emoji ni brillos, y pestañas "Cámara" y "Subir video".
- Ajustes: solo opciones reales (cuenta, tema, club, instalar la app y cerrar sesión).
- ADR-022: sistema visual y orden de las pantallas.

### Corregido
- Ajustes mostraba "Configuración guardada localmente" sin guardar nada, y tenía avisos de notificaciones sin efecto.
- Ejercicios: si la API fallaba, la asignación se guardaba en el navegador del entrenador y se informaba "asignado exitosamente". El plan completo también informaba éxito aunque fallara. Ahora se muestra el error real y se dice cuántos ejercicios se guardaron.
- Ejercicios: el modal de asignación ofrecía dos atletas inventados ("Martín San Martín" y "Javiera Soto", ids 1 y 2), y la dosis y las instrucciones editadas no se enviaban.
- Atletas: el formulario pedía una categoría que el backend descartaba. Ahora la categoría se calcula desde la edad (`services/categoria.js`) y los filtros funcionan.
- Laboratorio: "Validado UCT" decía lo contrario del análisis (`experimental_no_validado`). Ahora dice "Experimental · sin validación externa".

### Agregado
- `tests/categoria.test.mjs` (3 pruebas). El frontend pasa de 34 a 37 pruebas.
- `hooks/useInstallPrompt.js`: botón "Instalar" real en Ajustes cuando el navegador lo permite.

## [Sin publicar] 2026-11-17 — nuevo diseño visual (etapa 2: Inicio, Atletas, Grabar y Portal)
### Cambiado
- Inicio del entrenador: título "Tu equipo" con la fecha, selector de atleta y una tarjeta protagonista con el IPT del último análisis, la diferencia con la sesión anterior, la confianza del análisis, la flexión de rodilla, la simetría y el sector a trabajar. Debajo, "Requiere atención" (simetría bajo 60 %, análisis de confianza baja y consentimientos pendientes) y tres cifras del equipo. Se quitó el banner "Cada sesión cuenta una historia de progreso". La lógica está en `services/resumenEquipo.js` y reutiliza `extraerMetricasSesion`.
- Atletas: lista compacta con el IPT en grande, buscador de ancho completo y filtros en una fila desplazable en el celular; "Atletas de mis clubes" pasa al final. La ficha lateral muestra el nombre en grande y pestañas cortas (Resumen, Apoyo, Consentimiento).
- Grabar o subir: título "Grabar pasada" (entrenador) o "Subir video" (atleta), tres pasos de cómo grabar y el consentimiento como etiqueta junto al selector, en vez del banner de formatos.
- Portal del atleta: indicador semicircular del IPT con la acción "Subir video de carrera", estado (consentimiento, sesiones, nivel y XP), sesiones con el sector a trabajar, plan sugerido por el último análisis y medallas con su avance.

### Corregido
- Atletas: si faltaba la edad se mostraba "15 años", y si faltaba la categoría, "Sub-16". Ahora dice "Sin registrar" y no se cuenta en ningún filtro de categoría.
- Portal del atleta: las medallas salían sin nombre ni descripción (se leían `name`/`description` en vez de `title`/`detail`); el nivel usaba un campo inexistente, y si faltaba el club se mostraba "MetaHub Track Academy".

### Agregado
- `tests/resumen-equipo.test.mjs`: 6 pruebas del último análisis y de los avisos del Inicio. El frontend pasa de 28 a 34 pruebas.

## [Sin publicar] 2026-11-17 — nuevo diseño visual (etapa 1: base y navegación)
### Cambiado
- Estilo de app deportiva: tema oscuro por defecto (el claro sigue disponible en Ajustes), títulos grandes en Barlow Condensed, cifras protagonistas, tarjetas lisas sin sombra, botones tipo píldora y un único acento naranja para la acción principal. Todo vive en `src/sport-theme.css`, que redefine las variables antiguas para que las pantallas existentes adopten la paleta.
- Navegación: el menú lateral pasa de 12 enlaces sueltos a 4 grupos (Equipo, Análisis, Entrenamiento, Organización) con nombres en español. En el celular, barra inferior de 5 pestañas con "Grabar" (entrenador) o "Subir" (atleta) al centro y un menú "Más" agrupado.
- El selector Claro/Oscuro sale del encabezado de cada pantalla y del inicio de sesión, y pasa a Ajustes › Apariencia.
- Se quitaron los emoji del selector de rol del inicio de sesión y los degradados de los banners, del portal del atleta y de la pantalla de grabación.

### Corregido
- Portal del atleta: la nota "Fórmula IPT" tenía fondo blanco fijo y quedaba ilegible en tema oscuro.
- Grabar o subir: las opciones "Grabar con la cámara" y "Elegir video" tenían fondo blanco fijo en tema oscuro.

## [Sin publicar] 2026-11-17 — movimiento: carga diferida, pruebas y ADR-021
### Cambiado
- Framer Motion se carga con `LazyMotion` (`domMax` en un chunk aparte). El bundle principal baja de 534,9 kB a 440,9 kB (de 159,6 a 129,9 kB con gzip) y desaparece el aviso de Vite por chunks de más de 500 kB. Los componentes usan `m`, exportado como `motion` desde `components/Motion.jsx`.
- La lógica de los indicadores de avance se separa de `Motion.jsx` en `components/progressState.js`. Un texto de pasos fuera de rango ("0/4", "7/4") ahora se acota en vez de dejar el indicador vacío o con todos los tramos llenos.

### Agregado
- `tests/progress-state.test.mjs`: 9 pruebas de los indicadores de avance (tramos por estado de la cola, `aria-valuenow`, lectura de "2/4: …" y relleno con movimiento reducido). El frontend pasa de 19 a 28 pruebas.
- ADR-021: decisión de usar Framer Motion, reglas de movimiento, el problema de `layoutId` en overlays y la carga diferida.

### Corregido
- Mis atletas: el botón para cerrar la ficha era solo un ícono, sin nombre para lectores de pantalla. Ahora se anuncia como "Cerrar ficha".

## [Sin publicar] 2026-11-14 — sin datos inventados en la interfaz
### Cambiado
- Comparar: el "monito" animado con `Math.sin`/`Math.cos` y la "fase ilustrada" se reemplazan por `PoseComparison`. Este componente muestra el esqueleto que MediaPipe detectó en el video de cada sesión, sincronizado, con avance cuadro a cuadro y velocidad. Bajo los videos quedan las mediciones guardadas de cada sesión, y "Sin medición" ya no lleva la unidad pegada. El selector de atletas ya no muestra "Edad 15" cuando la ficha no tiene edad.
- Laboratorio de captura, cámara: antes la cámara nunca se encendía (`startCamera()` no se llamaba), sobre el visor se dibujaba un esqueleto inventado con ángulos, simetría y "fase" falsos, y había un "asistente IA" con avisos y voz basados en esos números. Al detener aparecía un "informe biomecánico" fijo (158.4°, "Skipping A…"). Todo eso se elimina. Ahora:
  - El botón "Activar cámara" abre la cámara real, con la trasera por defecto y cambio frontal/trasera.
  - Se graba con `MediaRecorder` (MP4 en iOS, WebM en el resto), con un máximo de 120 s.
  - Al detener, la grabación se sube a la misma cola de análisis que "Grabar o subir carrera", con progreso, reintento sin duplicar (mismo `requestId`) y enlace al avance.
  - Se exige consentimiento registrado del atleta.
  - El indicador de nivel usa el giroscopio real. Si no hay lectura, dice "Sin lectura de inclinación"; en iOS se pide el permiso al activar la cámara.
- Laboratorio de captura, subida: el "ONLINE ✓" fijo pasa a ser el estado real de `/api/cv/health`. Los pasos con temporizador ("2/4… 3/4…") no reflejaban el avance real y se reemplazan por un único estado. Las coordenadas sin dato muestran "—" en vez de valores de relleno (0.5598, 178.1°…). El error del servicio de visión muestra su mensaje.

### Corregido
- API: un origen con punto final (`http://localhost.`) respondía "Origen no permitido". Ahora se compara sin el punto, y un dominio parecido (`localhost.atacante.example`) sigue rechazado. Hay una prueba nueva en `security.test.js`.
- Comparar en modo oscuro: el botón "Ocultar Esqueleto" quedaba con texto blanco sobre fondo casi blanco, porque en oscuro `--navy` es claro. Los controles del comparador también tenían fondo claro fijo.
- Comparar en el celular: el botón "Pausar" se cortaba.
- Mis atletas y Ejercicios: los filtros pasan a una segunda línea en vez de cortarse, y el buscador se adapta al ancho.
- Laboratorio de captura en tema claro: "Volver a Sesiones" era blanco sobre blanco.

## [Sin publicar] 2026-11-13
### Agregado
- Entrada única: la raíz `/` sirve la SPA React (`index.html`). Las páginas estáticas antiguas pasaron a `apps/frontend/legacy/` y `/app.html`, `/preview.html` y `/mobile.html` redirigen a `/`.
- PWA instalable: manifest con nombre e íconos (incluido *maskable*), pantalla completa en móvil, service worker con caché de la interfaz (nunca de `/api`) y funcionamiento sin conexión de la interfaz. Probada sin desborde horizontal en 360×640 y 390×844 en las 16 rutas.
- Subida de video para móvil: validación de formato, tamaño y duración antes de enviar, barra de progreso real y opción de cancelar.
- Cola de análisis en segundo plano (PostgreSQL, `FOR UPDATE SKIP LOCKED`) con estados *en cola*, *analizando*, *listo* y *falló*; reintento automático de fallos transitorios con espera creciente y reintento manual. La subida ya no espera al análisis. Migración `007_video_queue_consent.sql`.
- Despliegue de producción: `docker-compose.prod.yml` con Caddy (HTTPS/HSTS), migraciones idempotentes en cada despliegue, respaldo diario verificado con retención, healthcheck por servicio, variables obligatorias sin valores por defecto y guía en `docs/despliegue.md`.
- Pruebas: `security.test.js` (26), `video-pipeline.test.js` reescrita para la cola (14), `video-queue-pg.test.js` contra PostgreSQL (5) y `video-validation.test.mjs` (8). El CI las ejecuta, además de compilar el frontend.

- Panel de consentimiento en la ficha del atleta: registrar, renovar y revocar, con historial y teléfono del apoderado. Antes no había forma en la interfaz de registrar un consentimiento después de crear la ficha.
- Operación: aviso opcional a un monitoreo externo cuando los respaldos se detienen (`BACKUP_PING_URL`) y `deploy/verificar-despliegue.sh` para comprobar un despliegue. ADR-020.
- Scripts `npm test` y `npm run test:pg` (backend) y `npm test` (frontend). La suite de Jest `auth.test.js` vuelve a ejecutarse en el CI.
- Interfaz con movimiento (Framer Motion 11.18.2), sin cambios de funcionalidad. Se aplicó pantalla por pantalla a todas las pantallas de la SPA. Incluye la transición de entrada de pantalla en `Layout`, la entrada escalonada de tarjetas, esqueletos de carga y un indicador animado del avance del análisis (en cola → analizando → listo / falló). Solo se animan `opacity` y `transform`. Con `prefers-reduced-motion` quedan únicamente los fundidos y se detienen las animaciones en bucle. Revisado en 390×844, en tema claro y oscuro. Las piezas comunes están en `components/Motion.jsx` y `motion-ui.css`.
  - Inicio de sesión: indicador deslizante en el selector de rol, error con sacudida breve y botón con estado "Ingresando…" que evita envíos dobles.
  - Captura y análisis: mientras carga, la lista ya no dice "No hay videos cargados". La barra de subida usa `scaleX` en lugar de animar el ancho de `<progress>` y mantiene `role="progressbar"`.
  - Inicio (`ScopedRoster`, compartido con Sesiones, Prioridad, Ficha de progreso y Clubes): los mensajes "Cargando…" se reemplazan por esqueletos con la forma del panel. Los indicadores y la ficha entran escalonados y el valor del último IPT cambia con un fundido.
  - Mis atletas: esqueletos de tarjeta, grilla que se reordena con animación al filtrar, drawer y modal con entrada y salida, y pestañas del drawer con subrayado animado. Los filtros ya no muestran "(0)" mientras carga. Las pestañas no usan `layoutId`, porque dentro de un `AnimatePresence` que sale deja el drawer montado e invisible sobre la pantalla, bloqueando los toques.
  - Ejercicios: el catálogo se reordena con animación al filtrar, los hallazgos y ejercicios prescritos entran escalonados, y el modal de asignación tiene entrada y salida.
  - Comparar, Seguimiento, Revisiones, Clubes, Mi evolución, Portal del atleta y Ajustes: tarjetas con entrada escalonada (la escalona `Layout`) y esqueletos en lugar de los textos "Cargando…". En Comparar ya no aparece el aviso "menos de 2 sesiones" mientras cargan.
  - Laboratorio de captura: indicador por pasos ("Paso 2 de 4") en lugar del ícono girando, barras de sectores del IPT con `scaleX` en vez de `width`, cuenta regresiva con salto del número, y modales del asistente y del diagnóstico con entrada y salida.
  - CSS: los 15 `transition: all` de `styles.css` y las transiciones de color, borde y sombra de `motion.css` quedan solo en `transform`/`opacity`. Los cambios de color al pasar el cursor ahora son instantáneos.

### Corregido
- Portal del atleta: la grilla en línea `1fr 340px` desbordaba hasta 537 px en un celular de 390 px. Ahora pasa a una columna bajo 1024 px.
- Laboratorio de captura: la pestaña "Subir Video (Extracción MediaPipe Real)" cortaba el texto por su alto fijo de 42 px.
- Modo oscuro: la cabecera, las pestañas y el pie de la ficha del atleta eran blancos con texto claro, y había colores fijos ilegibles en la página de atletas. En el celular, la ficha usa el alto visible (`100dvh`) para que el pie no quede bajo la barra del navegador.
- La vista previa de la cámara desbordaba horizontalmente en pantallas de 360 a 390 px.
- La pantalla de ejercicios pedía sesiones del atleta con id 1 aunque no perteneciera al entrenador.
- Las pruebas ya no sobrescriben `apps/api-backend/data/database.json`.
- El servicio de respaldo se detiene de inmediato con `docker stop`.
- `athleteVideoController.js` reescrito con formato legible, sin cambios de comportamiento.

### Seguridad
- Se eliminó una contraseña maestra: `password123` y `123456` abrían **cualquier** cuenta.
- Límites de tasa en inicio de sesión, registro, subida de videos y análisis directo (429 con `Retry-After`).
- Validación de entradas en registro, inicio de sesión, fichas de atleta y consentimientos. El cuerpo JSON se limita a 2 MiB y las contraseñas nuevas exigen 8 caracteres o más.
- CORS restringido a orígenes explícitos (antes `*`). Cabeceras de seguridad en la API y CSP en el frontend.
- Los errores 5xx ya no exponen mensajes internos. Lo mismo vale para el servicio de visión y para el error que se guarda de un análisis fallido.
- `/api/cv` exige sesión de entrenador y pasa por la API. Antes, cualquiera podía enviar videos al servicio de visión.
- JWT con algoritmo fijo (HS256). En producción, la API no arranca sin `JWT_SECRET` fuerte, `DATABASE_URL` y `CORS_ORIGINS`.
- Consentimiento de menores: exige el nombre del apoderado (no se aceptan valores de relleno) y guarda quién lo registró. `PUT` ya no permite marcar consentimiento sin ese registro. La revocación queda fechada. Un consentimiento vencido o revocado bloquea la subida y el análisis, también de videos ya en cola. Se corrigió un error 500 al consultar consentimientos de una ficha inexistente.

## [Etapa 3] 2026-10-05 a 2026-10-30
### Agregado
- Calidad del video y de los datos (ADR-019, 2026-11-11): chequeos de resolución, cuadros por segundo, duración, nitidez, luz, tamaño del atleta, encuadre, plano lateral, cobertura y rango de rodilla, oclusión y zancadas; una calidad insuficiente bloquea las recomendaciones e indica cómo regrabar.
- Evaluación con referencias (ADR-019, 2026-11-11): bloque `referencias` en las recomendaciones con comparabilidad por métrica, error del método del piloto y advertencia de no normativo; `concordancia.py` para calibrar umbrales con revisión ciega de profesionales (acuerdo, kappa, sensibilidad, especificidad).
- Funcionamiento real (ADR-018, 2026-11-11): el diagnóstico de la pantalla de ejercicios usa solo métricas medidas en el video (antes usaba valores por defecto); motor de recomendaciones con valor, referencia, fuente y estado de respaldo por hallazgo, banda de edad y nivel de confianza; no recomienda con análisis de baja confianza; trazabilidad del video (SHA-256); video de muestra, datos y acceso de demostración deshabilitados salvo configuración explícita; el listado de sesiones del entrenador devuelve el análisis; carpeta de videos fuera del control de versiones.
- Análisis multiarticular: ángulo de tobillo, inclinación de muslo, pierna y tronco, rango de movimiento y simetría por articulación (rodilla, cadera, tobillo) y simetría multiarticular en el sector 3 del IPT; 3 pruebas nuevas. Ver ADR-017 (2026-10-31).
- Respaldo y estado de cada parámetro del IPT (`referencias` en la respuesta), flexión de cadera informada pero no puntuada (corrige un término que nunca penalizaba), contexto de simetría con la visibilidad por pierna, y análisis de sensibilidad recalculado con la configuración real de la API (2026-10-31). Ver ADR-016.
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
