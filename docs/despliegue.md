# Despliegue de MetaHub en producción

Guía paso a paso para publicar MetaHub en un servidor propio, con HTTPS, respaldos diarios
y configuración separada de desarrollo.

## 1. Qué se despliega

```
Internet ──443/80──▶ caddy (HTTPS, Let's Encrypt)
                        │
                        ▼
                     frontend (nginx: SPA React + PWA, reenvía /api)
                        │
                        ▼
                     api-backend (Node.js, cola de análisis de video) ──▶ cv-service (MediaPipe)
                        │
                        ▼
                     db (PostgreSQL + TimescaleDB) ◀── backup (pg_dump diario)
                        ▲
                     db-migrate (aplica el esquema en cada despliegue y termina)
```

| Archivo | Uso |
|---|---|
| `docker-compose.yml` + `.env` | **Desarrollo** local (`http://localhost`). Valores cómodos por defecto. |
| `docker-compose.prod.yml` + `.env.production` | **Producción**. Sin valores por defecto: si falta una variable crítica, no arranca. |
| `deploy/caddy/Caddyfile` | HTTPS automático y cabecera HSTS. |
| `deploy/backup/backup.sh` | Respaldo diario verificado, con retención. |

Diferencias de producción respecto de desarrollo:

- Solo Caddy publica puertos (80 y 443). La base de datos, la API y el servicio de visión no son
  accesibles desde fuera. La base y el servicio de visión están en una red interna sin salida a Internet.
- La API corre con `NODE_ENV=production`: exige `JWT_SECRET` fuerte, `DATABASE_URL` y
  `CORS_ORIGINS` con `https://` explícito. Sin eso, se niega a arrancar.
- La API corre sin privilegios de root (`user: node`) y el servicio de visión con un usuario propio.
- Modo demo, cuentas de demostración y video de muestra deshabilitados.
- `RETENTION_DAYS` es obligatorio: la institución debe fijar cuánto tiempo se conservan los
  videos de menores antes de purgarlos.
- Cada servicio tiene *healthcheck*. Además, la API espera a que la base esté sana, las migraciones
  hayan terminado y el servicio de visión responda.

## 2. Requisitos

- Servidor Linux (Ubuntu 22.04/24.04 o similar) con **4 vCPU y 8 GB de RAM** como mínimo
  recomendado. El análisis con MediaPipe es intensivo en CPU.
- Disco: unos 20 GB más el espacio para videos (hasta 50 MB por video) y respaldos.
- Docker Engine 24 o superior con el plugin Compose v2 (`docker compose version`).
- Un nombre de dominio (p. ej. `metahub.ejemplo.cl`) con un registro **A** (y AAAA si hay IPv6)
  que apunte a la IP pública del servidor.
- Puertos **80 y 443** abiertos hacia el servidor. Let's Encrypt necesita el 80 para validar el dominio.

## 3. Preparar el servidor

```bash
# Docker (script oficial)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER      # cierre y vuelva a abrir la sesión

# Cortafuegos: solo SSH, HTTP y HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp             # HTTP/3
sudo ufw enable

# Código
sudo mkdir -p /srv/metahub && sudo chown $USER /srv/metahub
git clone <URL-del-repositorio> /srv/metahub/app
cd /srv/metahub/app

# Carpeta de respaldos (fuera del repositorio)
mkdir -p /srv/metahub/respaldos && chmod 700 /srv/metahub/respaldos
```

> Docker publica puertos saltándose `ufw`. Por eso `docker-compose.prod.yml` no publica la base
> ni la API: no basta con el cortafuegos.

## 4. Configurar las variables

```bash
cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

Todas son obligatorias:

| Variable | Ejemplo | Cómo obtenerla |
|---|---|---|
| `DOMAIN` | `metahub.ejemplo.cl` | El dominio del paso 2 (sin `https://`). |
| `ACME_EMAIL` | `ti@ejemplo.cl` | Correo que recibe los avisos de Let's Encrypt. |
| `POSTGRES_USER` | `metahub` | Libre. |
| `POSTGRES_PASSWORD` | — | `openssl rand -base64 32 \| tr -d '/+=' \| cut -c1-32` |
| `POSTGRES_DB` | `metahub` | Libre. |
| `JWT_SECRET` | — | `openssl rand -hex 32` (mínimo 32 caracteres). |
| `RETENTION_DAYS` | `365` | Plazo de conservación de videos que fije la institución. |
| `BACKUP_DIR` | `/srv/metahub/respaldos` | Ruta absoluta del paso 3. |
| `BACKUP_HOUR_UTC` | `7` | Hora UTC del respaldo diario (7 UTC = 03:00–04:00 en Chile continental). |
| `BACKUP_KEEP_DAYS` | `14` | Días que se conservan los respaldos. |

Opcionales: `VIDEO_QUEUE_CONCURRENCY` (videos analizados en paralelo, por defecto 1) y
`CV_CPUS` (núcleos máximos del servicio de visión, por defecto 2).

Compruebe que no falte nada (este comando **no** levanta nada):

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production config -q && echo "Configuración completa"
```

Si falta una variable, verá un mensaje como
`required variable JWT_SECRET is missing a value: Defina JWT_SECRET (openssl rand -hex 32)`.

> Use siempre `--env-file .env.production`. Sin esa opción, Compose leería el `.env` de desarrollo.

## 5. Primer arranque

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production ps
```

Espere a que todos los servicios aparezcan como `healthy`. `db-migrate` aparece como
`exited (0)`, y eso es lo correcto. El primer arranque tarda unos minutos: hay que compilar
las imágenes y Caddy debe obtener el certificado.

Verificación:

```bash
curl -I https://$DOMINIO/                  # 200, con Strict-Transport-Security
curl https://$DOMINIO/api/health           # {"status":"ok",...}
curl -I http://$DOMINIO/                   # 308 hacia https://
```

Verificación completa automática (HTTPS, cabeceras, salud, puertos cerrados, contenedores
y respaldos; ejecútela en el servidor, dentro de la carpeta del proyecto):

```bash
sh deploy/verificar-despliegue.sh $DOMINIO
```

Luego abra `https://<dominio>` en un celular, registre la cuenta de entrenador y use
**Agregar a la pantalla de inicio** para instalar la PWA.

Si el certificado no se emite, revise `docker compose ... logs caddy`. Las causas habituales son
un DNS que todavía no apunta al servidor o el puerto 80 cerrado.

## 6. Actualizar a una nueva versión

```bash
cd /srv/metahub/app
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

- `db-migrate` vuelve a aplicar `apps/api-backend/src/db/schema.sql`. Todas las migraciones son
  idempotentes y no borran datos.
- Los videos en análisis no se pierden. Si la API se reinicia a mitad de un análisis, la cola lo
  retoma tras 12 minutos, hasta 3 intentos.
- Los navegadores reciben la interfaz nueva en la siguiente carga, porque cada compilación usa
  un caché nuevo del service worker.

Antes de una actualización grande, haga un respaldo manual (sección 7).

## 7. Respaldos

El servicio `backup`:

- hace un respaldo al arrancar si no hay uno de las últimas 24 horas, y luego uno diario a
  `BACKUP_HOUR_UTC`;
- verifica cada archivo con `pg_restore --list` antes de darlo por bueno;
- borra los respaldos con más de `BACKUP_KEEP_DAYS` días;
- deja los archivos con permisos `600`, porque contienen datos personales de menores;
- se marca como *unhealthy* si no hay un respaldo de menos de 26 horas.

Archivos: `$BACKUP_DIR/metahub-AAAAMMDDTHHMMSSZ.dump`.

**Alerta si los respaldos se detienen (recomendado).** Cree un chequeo gratuito en
[healthchecks.io](https://healthchecks.io) con periodo de 1 día y gracia de 2 horas, y copie su URL
en `BACKUP_PING_URL`. El servicio `backup` la llama después de cada respaldo correcto, y llama a
`…/fail` si uno falla. Si deja de recibir avisos, le llega un correo.

**Respaldo manual:**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec backup \
  sh -c 'pg_dump --format=custom --file=/backups/metahub-manual-$(date -u +%Y%m%dT%H%M%SZ).dump'
```

**Copia fuera del servidor (recomendado).** Un respaldo en el mismo disco no protege contra la
pérdida del servidor. Programe una copia diaria cifrada a otro lugar, por ejemplo con `rclone`
o `restic` sobre `$BACKUP_DIR`.

Los **videos** (volumen `metahub_athlete_videos`) no van en el `pg_dump`. Si también deben
respaldarse:

```bash
docker run --rm -v metahub_athlete_videos:/v:ro -v /srv/metahub/respaldos:/b alpine \
  tar czf /b/videos-$(date -u +%Y%m%d).tar.gz -C /v .
```

### Restaurar un respaldo

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
$C stop api-backend backup                          # nadie escribe mientras se restaura
$C exec db psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE metahub;" -c "CREATE DATABASE metahub;"
$C run --rm --entrypoint sh backup -c '
  psql -c "SELECT timescaledb_pre_restore();" &&
  pg_restore --no-owner -d "$PGDATABASE" /backups/metahub-AAAAMMDDTHHMMSSZ.dump;
  psql -c "SELECT timescaledb_post_restore();"'
$C up -d
```

(Cambie `metahub` por su `POSTGRES_DB` y elija el archivo que corresponda.)
Este procedimiento se probó con un respaldo real de la base de desarrollo: los conteos de
usuarios, atletas y videos coincidieron después de restaurar.

## 8. Operación diaria

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
$C ps                         # estado y healthchecks
$C logs -f api-backend        # API y cola de video ("[cola-video] ...")
$C logs --tail=100 cv-service
$C logs backup                # resultado de los respaldos
$C restart api-backend
```

Los registros rotan automáticamente (5 archivos de 10 MB por servicio).

**Videos atascados.** La cola reintenta sola los fallos transitorios (servicio de visión caído,
tiempo agotado) con esperas de 30 s, 60 s y 120 s. Los videos que fallan por su contenido
(formato, duración, cuerpo no visible) quedan en **Falló** y el usuario puede pulsar
**Reintentar análisis**.

## 9. Seguridad aplicada

- HTTPS obligatorio con HSTS (Caddy). Cabeceras CSP, `X-Frame-Options`, `nosniff`,
  `Referrer-Policy` y `Permissions-Policy` (cámara solo para este origen) desde nginx.
  La API agrega las suyas a cada respuesta.
- CORS restringido a `https://$DOMAIN`. Otros orígenes reciben 403.
- Límites de tasa en memoria:

  | Qué | Límite |
  |---|---|
  | Inicio de sesión | 5 intentos por IP y correo, y 30 por IP, cada 15 min |
  | Registro | 10 por IP por hora |
  | Subida de videos | 20 por usuario por hora |
  | Análisis directo del laboratorio | 10 por usuario cada 10 min |

  Se ajustan con `RATE_*` (ver `.env.example`). Son por instancia: si algún día se ejecutan
  varias réplicas de la API, hay que moverlos a un almacén compartido.
- El servicio de visión solo es accesible a través de la API, con sesión de entrenador.
- Los errores internos responden con un mensaje genérico. El detalle queda solo en los registros.
- Consentimiento de menores: no se puede marcar como vigente sin el nombre del apoderado o tutor.
  Toda revocación queda fechada, y un consentimiento vencido o revocado impide subir y analizar
  videos, incluidos los que ya estaban en cola.

## 10. Lista de verificación final

- [ ] `config -q` sin errores y `.env.production` con permisos `600`.
- [ ] `ps`: todos los servicios `healthy` y `db-migrate` `exited (0)`.
- [ ] `https://<dominio>` carga con candado y `http://` redirige.
- [ ] `/api/health` responde `ok`.
- [ ] Hay al menos un archivo en `BACKUP_DIR` y la restauración se probó una vez.
- [ ] Hay una copia de respaldos fuera del servidor y `BACKUP_PING_URL` configurado.
- [ ] `sh deploy/verificar-despliegue.sh <dominio>` termina sin fallas.
- [ ] La institución confirmó `RETENTION_DAYS`.
- [ ] Se instaló la PWA en un celular y se subió un video de prueba hasta verlo en **Listo**.
