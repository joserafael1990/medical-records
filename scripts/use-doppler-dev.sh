#!/bin/bash
# Script rápido para usar Doppler en desarrollo local
# Uso: ./scripts/use-doppler-dev.sh [up|down|build|...]

set -e

# Verificar que Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo"
    echo "   Por favor, inicia Docker Desktop primero"
    exit 1
fi

# Verificar que Doppler está instalado y autenticado
if ! command -v doppler &> /dev/null; then
    echo "❌ Error: Doppler CLI no está instalado"
    echo "   Instala con: brew install dopplerhq/cli/doppler"
    exit 1
fi

# Verificar autenticación de Doppler
if ! doppler me &> /dev/null && [ -z "$DOPPLER_TOKEN" ]; then
    echo "❌ Error: No estás autenticado en Doppler"
    echo "   Opciones:"
    echo "   1. Autentícate con: doppler login"
    echo "   2. O configura: export DOPPLER_TOKEN='tu_token_aqui'"
    exit 1
fi

# Si DOPPLER_TOKEN está configurado, usarlo
if [ -n "$DOPPLER_TOKEN" ]; then
    export DOPPLER_TOKEN
    echo "✅ Usando DOPPLER_TOKEN configurado"
else
    echo "✅ Usando autenticación personal de Doppler"
fi

echo "🚀 Iniciando con Doppler (desarrollo local)..."
echo "   Proyecto: cortex"
echo "   Config: dev"
echo ""

# Ejecutar docker compose con Doppler
doppler run --project cortex --config dev -- \
    docker compose -f compose.dev.yaml "${@:-up}"

