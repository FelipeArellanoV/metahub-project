#!/bin/sh
# Verificación rápida de un despliegue de MetaHub en producción.
#   sh deploy/verificar-despliegue.sh metahub.ejemplo.cl
# Revisa HTTPS, redirección, cabeceras de seguridad, salud de la API, que los servicios internos
# no estén expuestos, y el estado de los contenedores y los respaldos (si se ejecuta en el servidor).
set -u
DOMAIN="${1:?Uso: sh deploy/verificar-despliegue.sh <dominio>}"
OK=0; FAIL=0
pass() { echo "  OK    $1"; OK=$((OK + 1)); }
fail() { echo "  FALLA $1"; FAIL=$((FAIL + 1)); }
check() { if eval "$2" >/dev/null 2>&1; then pass "$1"; else fail "$1"; fi; }

echo "== HTTPS y cabeceras ($DOMAIN)"
HEADERS=$(curl -sSI --max-time 15 "https://$DOMAIN/" 2>/dev/null || true)
check "https://$DOMAIN responde 200" "echo \"\$HEADERS\" | head -1 | grep -q ' 200'"
check "HSTS activo" "echo \"\$HEADERS\" | grep -qi '^strict-transport-security:'"
check "Content-Security-Policy" "echo \"\$HEADERS\" | grep -qi '^content-security-policy:'"
check "X-Frame-Options DENY" "echo \"\$HEADERS\" | grep -qi '^x-frame-options: *deny'"
check "http:// redirige a https://" "curl -sSI --max-time 15 http://$DOMAIN/ | grep -qi '^location: https://'"
check "Certificado válido (sin -k)" "curl -sS --max-time 15 -o /dev/null https://$DOMAIN/"

echo "== Aplicación"
check "API /api/health = ok" "curl -sS --max-time 15 https://$DOMAIN/api/health | grep -q '\"ok\"'"
check "Servicio de visión alcanzable vía API" "curl -sS --max-time 15 https://$DOMAIN/api/cv/health | grep -q '\"ok\"'"
check "PWA: manifest" "curl -sS --max-time 15 https://$DOMAIN/manifest.webmanifest | grep -q '\"short_name\"'"
check "PWA: service worker versionado" "curl -sS --max-time 15 https://$DOMAIN/sw.js | grep -q \"const VERSION = '[0-9]\""
check "Análisis sin sesión rechazado (401)" "curl -s --max-time 15 -o /dev/null -w '%{http_code}' -X POST https://$DOMAIN/api/cv/process-video | grep -q 401"
check "CORS rechaza otro origen (403)" "curl -s --max-time 15 -o /dev/null -w '%{http_code}' -H 'Origin: https://atacante.example' https://$DOMAIN/api/health | grep -q 403"

echo "== Puertos internos no expuestos"
for port in 3000 5432 8000; do
  check "puerto $port cerrado desde fuera" "! curl -s --max-time 4 -o /dev/null http://$DOMAIN:$port/"
done

if command -v docker >/dev/null 2>&1 && [ -f docker-compose.prod.yml ]; then
  echo "== Contenedores (en el servidor)"
  C="docker compose -f docker-compose.prod.yml --env-file .env.production"
  for s in db api-backend cv-service frontend caddy backup; do
    check "$s healthy" "$C ps $s --format '{{.Health}}' | grep -q healthy"
  done
  check "db-migrate terminó sin errores" "$C ps -a db-migrate --format '{{.State}} {{.ExitCode}}' | grep -q 'exited 0'"
  BACKUP_DIR=$(grep '^BACKUP_DIR=' .env.production | cut -d= -f2-)
  check "respaldo de menos de 26 h en $BACKUP_DIR" "find \"$BACKUP_DIR\" -name 'metahub-*.dump' -mmin -1560 | grep -q ."
fi

echo
echo "Resultado: $OK correctas, $FAIL con falla."
[ "$FAIL" -eq 0 ]
