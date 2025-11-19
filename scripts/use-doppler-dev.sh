#!/bin/bash
# Script rápido para usar Doppler en desarrollo local
# Uso: ./scripts/use-doppler-dev.sh [up|down|build|...]

set -e

# Token de desarrollo
# IMPORTANTE: No hardcodear tokens. Usar variable de entorno DOPPLER_TOKEN
# Obtener el token desde variable de entorno (requerido)
if [ -z "$DOPPLER_TOKEN" ]; then
    echo "❌ Error: DOPPLER_TOKEN no está configurado"
    echo "   Por favor, configura la variable de entorno DOPPLER_TOKEN"
    echo "   Ejemplo: export DOPPLER_TOKEN='tu_token_aqui'"
    exit 1
fi

export DOPPLER_TOKEN

echo "🚀 Iniciando con Doppler (desarrollo local)..."
echo "   Proyecto: cortex"
echo "   Config: dev"
echo ""

# Ejecutar docker compose con Doppler
doppler run --project cortex --config dev -- \
    docker compose -f compose.doppler.yaml "${@:-up}"

