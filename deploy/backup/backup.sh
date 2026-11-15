#!/bin/sh
# Respaldo diario de la base de datos de MetaHub (formato personalizado de pg_dump).
#
# Variables (docker-compose.prod.yml): PGHOST, PGUSER, PGPASSWORD, PGDATABASE,
# BACKUP_HOUR_UTC (0-23) y BACKUP_KEEP_DAYS (días que se conservan).
# Opcional: BACKUP_PING_URL, una URL de monitoreo (p. ej. healthchecks.io) que se llama tras cada
# respaldo correcto y con /fail si falla. Si deja de recibir avisos, el servicio de monitoreo alerta.
# Hace un respaldo al arrancar si no hay uno de las últimas 24 h, y luego uno al día.
# Restaurar: ver docs/despliegue.md, sección "Restaurar un respaldo".
set -eu

DIR=/backups
: "${BACKUP_HOUR_UTC:?falta BACKUP_HOUR_UTC}"
: "${BACKUP_KEEP_DAYS:?falta BACKUP_KEEP_DAYS}"
case "$BACKUP_HOUR_UTC" in ''|*[!0-9]*) echo "BACKUP_HOUR_UTC inválido"; exit 1;; esac
case "$BACKUP_KEEP_DAYS" in ''|*[!0-9]*) echo "BACKUP_KEEP_DAYS inválido"; exit 1;; esac
[ "$BACKUP_HOUR_UTC" -le 23 ] || { echo "BACKUP_HOUR_UTC debe estar entre 0 y 23"; exit 1; }
[ "$BACKUP_KEEP_DAYS" -ge 1 ] || { echo "BACKUP_KEEP_DAYS debe ser al menos 1"; exit 1; }
mkdir -p "$DIR"
umask 077   # los respaldos contienen datos personales de menores: solo lectura para el dueño

ping() {
  [ -n "${BACKUP_PING_URL:-}" ] || return 0
  wget -q -T 10 -O /dev/null "$BACKUP_PING_URL$1" 2>/dev/null || echo "[respaldo] aviso: no se pudo notificar al monitoreo"
}

backup() {
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  target="$DIR/metahub-$stamp.dump"
  echo "[respaldo] iniciando $target"
  if pg_dump --format=custom --compress=6 --no-owner --file="$target.partial"; then
    # Verificación: el archivo debe poder listarse con pg_restore.
    if pg_restore --list "$target.partial" >/dev/null; then
      mv "$target.partial" "$target"
      echo "[respaldo] listo: $target ($(du -h "$target" | cut -f1))"
      ping ""
    else
      echo "[respaldo] ERROR: el archivo generado no es válido"; rm -f "$target.partial"; ping /fail; return 1
    fi
  else
    echo "[respaldo] ERROR: pg_dump falló"; rm -f "$target.partial"; ping /fail; return 1
  fi
  # Retención: elimina respaldos más antiguos que BACKUP_KEEP_DAYS.
  find "$DIR" -name 'metahub-*.dump' -mtime +"$BACKUP_KEEP_DAYS" -print -delete | sed 's/^/[respaldo] eliminado por antigüedad: /'
}

seconds_until_next_run() {
  now=$(date -u +%s)
  today=$(date -u +%Y-%m-%d)
  next=$(date -u -d "$today $BACKUP_HOUR_UTC:00:00" +%s 2>/dev/null || date -u -D '%Y-%m-%d %H:%M:%S' -d "$today $BACKUP_HOUR_UTC:00:00" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  echo $((next - now))
}

# docker stop envía TERM: salir de inmediato en vez de esperar a que termine el sleep.
trap 'echo "[respaldo] detenido"; exit 0' TERM INT

if ! find "$DIR" -name 'metahub-*.dump' -mmin -1440 | grep -q .; then
  backup || true
fi

while true; do
  wait_s=$(seconds_until_next_run)
  echo "[respaldo] próximo respaldo en $((wait_s / 3600)) h $(((wait_s % 3600) / 60)) min"
  sleep "$wait_s" &
  wait $!
  backup || echo "[respaldo] se reintentará en el próximo ciclo"
done
