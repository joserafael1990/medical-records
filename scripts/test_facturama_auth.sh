#!/bin/bash
# Lee las credenciales directamente de .env.clean (evita read interactivo).

ENV_FILE="$(dirname "$0")/../.env.clean"
USER_NAME=$(grep '^FACTURAMA_API_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
PASS=$(grep '^FACTURAMA_API_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')

if [ -z "$USER_NAME" ] || [ -z "$PASS" ]; then
    echo "❌ No encontré credenciales en $ENV_FILE"
    exit 1
fi

echo "Usuario:          $USER_NAME"
echo "Password length:  ${#PASS} caracteres"
echo

TOKEN=$(printf '%s:%s' "$USER_NAME" "$PASS" | base64 | tr -d '\n')
echo "Token base64:     $TOKEN"
echo

BASE="https://apisandbox.facturama.mx"
ENDPOINT="/api-lite/csds"

run() {
    local label="$1"; shift
    local tmp; tmp=$(mktemp)
    local code
    code=$(curl -s -o "$tmp" -w "%{http_code}" "$@")
    local body
    body=$(head -c 200 "$tmp" | tr -d '\n')
    printf "%-50s HTTP %s  %s\n" "$label" "$code" "$body"
    rm -f "$tmp"
}

echo "=== Variante clave con auth EXPLÍCITA ==="
run "Authorization Basic <token> + UA" \
    -H "Authorization: Basic $TOKEN" \
    -H "User-Agent: $USER_NAME" \
    -H "Accept: application/json" \
    "$BASE$ENDPOINT"

run "Control: /api-lite/2/cfdis (debería 200)" \
    -H "Authorization: Basic $TOKEN" \
    "$BASE/api-lite/2/cfdis"

run "POST vacío a /api-lite/csds" \
    -X POST \
    -H "Authorization: Basic $TOKEN" \
    -H "User-Agent: $USER_NAME" \
    -H "Content-Type: application/json" \
    -d "{}" \
    "$BASE$ENDPOINT"

run "POST vacío a /api-lite/4/cfdis" \
    -X POST \
    -H "Authorization: Basic $TOKEN" \
    -H "User-Agent: $USER_NAME" \
    -H "Content-Type: application/json" \
    -d "{}" \
    "$BASE/api-lite/4/cfdis"
