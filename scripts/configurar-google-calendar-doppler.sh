#!/bin/bash
# Script para configurar variables de Google Calendar en Doppler
# Uso: ./scripts/configurar-google-calendar-doppler.sh

set -e

PROJECT="cortex"
CONFIG_DEV="dev"  # IMPORTANTE: Usar solo 'dev' para desarrollo (NO usar 'dev_personal')
CONFIG_PROD="prd"  # IMPORTANTE: Usar 'prd' para producción (NO usar 'production' o 'prd_production')

echo "📅 Configurando variables de Google Calendar en Doppler"
echo "========================================================"
echo ""

# Verificar que Doppler esté instalado
if ! command -v doppler &> /dev/null; then
    echo "❌ Doppler no está instalado. Instálalo desde: https://docs.doppler.com/docs/install-cli"
    exit 1
fi

# Verificar que estemos autenticados
if ! doppler me &> /dev/null; then
    echo "❌ No estás autenticado en Doppler. Ejecuta: doppler login"
    exit 1
fi

echo "✅ Doppler está instalado y autenticado"
echo ""

# Solicitar credenciales
echo "📝 Ingresa las credenciales de Google Cloud Console:"
echo ""

read -p "GOOGLE_CLIENT_ID: " GOOGLE_CLIENT_ID
read -sp "GOOGLE_CLIENT_SECRET: " GOOGLE_CLIENT_SECRET
echo ""
read -p "GOOGLE_REDIRECT_URI para desarrollo (default: http://localhost:8000/api/google-calendar/oauth/callback): " GOOGLE_REDIRECT_URI_DEV
GOOGLE_REDIRECT_URI_DEV=${GOOGLE_REDIRECT_URI_DEV:-"http://localhost:8000/api/google-calendar/oauth/callback"}

read -p "GOOGLE_REDIRECT_URI para producción (default: https://tu-dominio.com/api/google-calendar/oauth/callback): " GOOGLE_REDIRECT_URI_PROD
GOOGLE_REDIRECT_URI_PROD=${GOOGLE_REDIRECT_URI_PROD:-"https://tu-dominio.com/api/google-calendar/oauth/callback"}

echo ""
echo "🔐 Configurando variables en desarrollo..."
doppler secrets set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" --project "$PROJECT" --config "$CONFIG_DEV"
doppler secrets set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" --project "$PROJECT" --config "$CONFIG_DEV"
doppler secrets set GOOGLE_REDIRECT_URI="$GOOGLE_REDIRECT_URI_DEV" --project "$PROJECT" --config "$CONFIG_DEV"
echo "✅ Variables de desarrollo configuradas"
echo ""

echo "🔐 Configurando variables en producción..."
doppler secrets set GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" --project "$PROJECT" --config "$CONFIG_PROD"
doppler secrets set GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" --project "$PROJECT" --config "$CONFIG_PROD"
doppler secrets set GOOGLE_REDIRECT_URI="$GOOGLE_REDIRECT_URI_PROD" --project "$PROJECT" --config "$CONFIG_PROD"
echo "✅ Variables de producción configuradas"
echo ""

echo "🔍 Verificando variables configuradas..."
echo ""
echo "Desarrollo:"
doppler secrets get GOOGLE_CLIENT_ID --project "$PROJECT" --config "$CONFIG_DEV" --plain | sed 's/./*/g' | head -c 20 && echo "..."
doppler secrets get GOOGLE_REDIRECT_URI --project "$PROJECT" --config "$CONFIG_DEV" --plain
echo ""
echo "Producción:"
doppler secrets get GOOGLE_CLIENT_ID --project "$PROJECT" --config "$CONFIG_PROD" --plain | sed 's/./*/g' | head -c 20 && echo "..."
doppler secrets get GOOGLE_REDIRECT_URI --project "$PROJECT" --config "$CONFIG_PROD" --plain
echo ""

echo "✅ ¡Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verificar que las URIs de redirección coincidan con las configuradas en Google Cloud Console"
echo "   2. Reiniciar el backend para cargar las nuevas variables"
echo "   3. Probar la conexión desde el frontend"



