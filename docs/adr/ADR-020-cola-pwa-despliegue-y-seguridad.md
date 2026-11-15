# ADR-020: Entrada única PWA, cola de análisis, despliegue de producción y endurecimiento de seguridad

Estado: aceptada (2026-11-13). Complementa ADR-015 (retención) y ADR-018 (funcionamiento real).

## Contexto
Antes de operar con atletas escolares reales, MetaHub tenía cinco problemas:

1. **Varias entradas.** Convivían tres páginas estáticas con datos simulados (`index.html`,
   `preview.html` y `mobile.html`) y la SPA React (`app.html`). La raíz mostraba un prototipo,
   no la aplicación.
2. **Análisis bloqueante.** La subida esperaba el análisis de MediaPipe en la misma petición
   (hasta 10 minutos). En el celular, un bloqueo de pantalla o un cambio de red cortaba la
   espera y el usuario no sabía qué había pasado.
3. **Sin configuración de producción.** No había HTTPS, respaldos ni separación entre
   desarrollo y producción. Los secretos tenían valores por defecto.
4. **Fallas de seguridad.**
   - Las contraseñas `password123` y `123456` abrían cualquier cuenta.
   - CORS aceptaba cualquier origen (`*`).
   - No había límites de tasa.
   - Los errores internos se devolvían al cliente.
   - Cualquiera podía enviar videos al servicio de visión sin iniciar sesión.
5. **Consentimiento de menores débil.**
   - Se podía marcar como vigente sin identificar al apoderado (el formulario enviaba
     "Apoderado no registrado").
   - `PUT /athletes/:id` cambiaba el consentimiento sin dejar registro formal.
   - Un consentimiento vencido no bloqueaba la subida.
   - La interfaz no permitía registrar ni revocar un consentimiento después de crear la ficha.

## Decisión

### 1. Entrada única y PWA
- `apps/frontend/index.html` monta la SPA. Los prototipos pasan a `apps/frontend/legacy/` (no se
  compilan) y `/app.html`, `/preview.html` y `/mobile.html` redirigen con 301 a `/`.
- Manifest con íconos normales y *maskable*, `display: fullscreen` con respaldo `standalone`, y
  `viewport-fit=cover` para pantallas con muesca.
- El service worker guarda en caché **solo la interfaz**: navegación con red primero y respaldo
  sin conexión, y caché primero para `/assets/*`. **Nunca guarda `/api/*`**, porque son datos
  personales que deben estar al día. Cada compilación inyecta un identificador de versión en
  `sw.js` y descarta el caché anterior.

### 2. Cola de análisis en PostgreSQL
- La subida guarda el archivo y responde `201 {status:'queued'}` sin esperar el análisis.
- Un trabajador dentro del proceso de la API (`services/videoQueue.js`) toma trabajos con
  `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)`. Varias réplicas nunca toman el
  mismo video.
- Estados: `queued` → `processing` → `completed` | `failed`. `uploaded` se conserva solo por
  compatibilidad y se muestra como "en cola".
- Los fallos **transitorios** (servicio de visión caído, tiempo agotado, 5xx) vuelven a la cola
  con espera de 30 s, 60 s y 120 s, hasta 3 intentos. Los fallos **del video** (4xx del servicio
  de visión, IPT inválido) pasan directo a `failed` con el motivo visible. El reintento manual
  reinicia los intentos.
- Un `processing` sin terminar por más de 12 minutos (caída del proceso) se retoma. Si ya agotó
  sus intentos, se marca `failed`.
- El trabajo se autoriza con la identidad de quien lo pidió (`requested_by`). Vínculo y
  consentimiento se revalidan **al procesar**, no solo al subir.
- El cliente valida formato, peso (50 MB) y duración (5 min) antes de enviar, muestra el progreso
  real (XMLHttpRequest) y consulta el estado cada 4 s solo mientras haya trabajos pendientes.

*Alternativas descartadas.* Redis/BullMQ agregaría un servicio más para una carga de pocos videos
por hora, y PostgreSQL ya garantiza la durabilidad. Un worker en un proceso aparte sería más
aislado, pero hoy no se justifica: el análisis pesado ocurre en `cv-service`, no en la API.

### 3. Despliegue
- `docker-compose.yml` sirve para desarrollo. `docker-compose.prod.yml` + `.env.production`
  sirven para producción. En producción, las variables críticas usan `${VAR:?mensaje}` (sin
  valor por defecto) y la API valida su propia configuración al arrancar
  (`assertProductionConfig`).
- Caddy obtiene y renueva los certificados de Let's Encrypt y agrega HSTS. Solo Caddy publica
  puertos. La base y el servicio de visión están en una red `internal`.
- `db-migrate` aplica `schema.sql` (todas las migraciones son idempotentes) antes de iniciar
  la API.
- `backup` ejecuta `pg_dump` a diario, verifica el resultado con `pg_restore --list`, aplica la
  retención y deja permisos 600. Avisa opcionalmente a un monitoreo externo (`BACKUP_PING_URL`).
- Todos los servicios tienen healthcheck. Los contenedores de la API y del servicio de visión
  corren sin privilegios de root.
- `RETENTION_DAYS` es obligatorio en producción. Coherente con ADR-015, la institución debe
  fijar el plazo.

### 4. Seguridad
- Se eliminó la contraseña maestra. Las contraseñas nuevas exigen entre 8 y 128 caracteres.
  Si el correo no existe, el login compara igual contra un hash de relleno, para no revelar
  qué cuentas existen por el tiempo de respuesta.
- Límites de tasa en memoria (`services/rateLimit.js`):

  | Qué | Límite |
  |---|---|
  | Inicio de sesión por IP y correo | 5 cada 15 min |
  | Inicio de sesión por IP | 30 cada 15 min |
  | Registro por IP | 10 por hora |
  | Subidas por usuario | 20 por hora |
  | Análisis directo por usuario | 10 cada 10 min |

  La IP del cliente se obtiene contando los proxies propios (`TRUST_PROXY_HOPS`), de modo que
  un `X-Forwarded-For` falsificado no la cambia.
- Validación centralizada (`services/validation.js`) de textos, correos, fechas, enteros,
  teléfonos y enumeraciones. El cuerpo JSON se limita a 2 MiB.
- CORS solo para orígenes explícitos y el mismo origen. Cabeceras de seguridad en la API, y CSP
  y `Permissions-Policy` (cámara solo para este origen) en nginx.
- Toda respuesta 5xx usa un mensaje genérico. El detalle queda en el registro del servidor,
  y lo mismo aplica al servicio de visión y al error guardado de un análisis.
- `/api/cv/*` pasa por la API con JWT de entrenador, límite de tasa y de tamaño. El servicio de
  visión ya no se publica.
- JWT con algoritmo fijo HS256 y comparación de firmas en tiempo constante.

### 5. Consentimiento de menores
- Para menores (o edad desconocida) es obligatorio el nombre real del apoderado o tutor. Se
  rechazan valores de relleno. Un atleta mayor de edad puede consentir por sí mismo.
- Cada registro guarda el apoderado, la relación, el teléfono, el vencimiento y quién lo
  registró. La revocación queda fechada. Crear una ficha o hacer `PUT` con `consent:true` crea
  ese registro formal; no hay otra vía.
- Un consentimiento vigente exige la marca de la ficha **y** que el último registro formal no
  esté revocado ni vencido. Esto se comprueba al subir, al reintentar y al procesar cada
  trabajo de la cola.
- La ficha del atleta tiene un panel para registrar, renovar y revocar el consentimiento, con
  su historial.

## Consecuencias
- El usuario puede cerrar la pantalla tras subir. El resultado aparece en el historial cuando
  la cola termina.
- Hay que aplicar la migración `007_video_queue_consent.sql` en las bases existentes. En
  producción lo hace `db-migrate`.
- Los límites de tasa son por instancia. Con más de una réplica de la API habría que moverlos
  a un almacén compartido.
- **Riesgo aceptado:** el JWT se guarda en `localStorage`, legible por JavaScript si hubiera un
  XSS. Se mitiga con una CSP estricta (`script-src 'self'`, sin scripts en línea), tokens de
  15 minutos y React, que escapa el contenido. Migrar a cookies `HttpOnly` con protección CSRF
  queda como mejora futura, porque obliga a cambiar todas las llamadas del cliente.
- **Pendiente de verificar fuera del entorno de desarrollo:**
  - Emisión real del certificado.
  - Instalación de la PWA en iOS y Android físicos.
  - Grabación con la cámara nativa (`.MOV` de iPhone).
  - Subida desde una red móvil.

  `deploy/verificar-despliegue.sh` automatiza las comprobaciones del servidor.

## Verificación
- Backend:
  - Integración: 19 pruebas.
  - `node:test`: 55 pruebas, entre ellas seguridad y la cola con dobles.
  - Jest: 7 pruebas.
  - Contra PostgreSQL real: 15 pruebas (cola con SKIP LOCKED, reintentos, recuperación de
    trabajos abandonados y consentimiento vencido).
- Frontend: 19 pruebas.
- Navegador en 360×640 y 390×844, en 16 rutas:
  - Sin desborde horizontal.
  - PWA instalable y la interfaz carga sin conexión.
  - Subida real: respuesta en menos de 0,5 s y video en "Listo" con IPT en unos 4 s.
- Respaldo generado y restaurado en una base vacía, con conteos idénticos.
