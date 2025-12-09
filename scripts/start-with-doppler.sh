#!/bin/bash
# Script helper para iniciar el proyecto con Doppler
# Uso: ./scripts/start-with-doppler.sh [dev|prod] [compose-command]

set -e

CONFIG=${1:-dev}
COMPOSE_CMD=${2:-up}

if [ "$CONFIG" != "dev" ] && [ "$CONFIG" != "prod" ]; then
    echo "❌ Error: Config debe ser 'dev' o 'prod'"
    echo "   Uso: ./scripts/start-with-doppler.sh [dev|prod] [up|down|build|...]"
    exit 1
fi

# Verificar que Doppler está instalado
if ! command -v doppler &> /dev/null; then
    echo "❌ Error: Doppler CLI no está instalado"
    echo "   Instala con: brew install dopplerhq/cli/doppler"
    exit 1
fi

# Verificar que está autenticado
if ! doppler me &> /dev/null; then
    echo "❌ Error: No estás autenticado en Doppler"
    echo "   Autentica con: doppler login"
    exit 1
fi

echo "🚀 Iniciando con Doppler (config: $CONFIG)..."
echo ""

# Usar Doppler para inyectar variables y ejecutar docker compose
doppler run --project cortex --config "$CONFIG" -- \
    docker compose -f compose.dev.yaml $COMPOSE_CMD "${@:3}"

