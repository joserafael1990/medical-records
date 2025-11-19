#!/bin/bash
# Script para verificar qué variables faltan en producción de Doppler
# Uso: ./scripts/check-doppler-production.sh

set -e

PROJECT_NAME="cortex"
CONFIG_PROD="production"

echo "🔍 Verificando variables de producción en Doppler"
echo "=================================================="
echo ""

# Verificar que Doppler esté instalado
if ! command -v doppler &> /dev/null; then
    echo "❌ Doppler no está instalado"
    exit 1
fi

# Lista de variables críticas requeridas
REQUIRED_VARS=(
    "ENVIRONMENT"
    "APP_ENV"
    "DEBUG"
    "LOG_LEVEL"
    "ENABLE_ENCRYPTION"
    "SECRET_KEY"
    "JWT_SECRET_KEY"
    "MEDICAL_ENCRYPTION_KEY"
    "DATABASE_URL"
    "CORS_ORIGINS"
    "ALLOWED_HOSTS"
    "SENTRY_ENVIRONMENT"
    "REACT_APP_SENTRY_ENVIRONMENT"
    "WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_NO_CONFIRMED"
    "WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_CONFIRMED"
    "WHATSAPP_TEMPLATE_LANGUAGE"
)

# Obtener variables existentes en producción
EXISTING_VARS=$(doppler secrets --project "$PROJECT_NAME" --config "$CONFIG_PROD" --json 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo "")

if [ -z "$EXISTING_VARS" ]; then
    echo "❌ No se pudieron obtener variables de producción"
    echo "   Verifica que el config '$CONFIG_PROD' exista:"
    echo "   doppler configs --project $PROJECT_NAME"
    exit 1
fi

echo "📋 Variables requeridas vs existentes:"
echo ""

MISSING_VARS=()
EXISTING_COUNT=0

for var in "${REQUIRED_VARS[@]}"; do
    if echo "$EXISTING_VARS" | grep -q "^${var}$"; then
        # Verificar el valor
        VALUE=$(doppler secrets get "$var" --project "$PROJECT_NAME" --config "$CONFIG_PROD" --plain 2>/dev/null || echo "")
        if [ -z "$VALUE" ] || [ "$VALUE" = "" ]; then
            echo "⚠️  $var: existe pero está vacía"
            MISSING_VARS+=("$var")
        else
            echo "✅ $var: configurada"
            ((EXISTING_COUNT++))
        fi
    else
        echo "❌ $var: FALTA"
        MISSING_VARS+=("$var")
    fi
done

echo ""
echo "📊 Resumen:"
echo "  ✅ Configuradas: $EXISTING_COUNT/${#REQUIRED_VARS[@]}"
echo "  ❌ Faltantes: ${#MISSING_VARS[@]}"
echo ""

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "🔴 Variables que faltan:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "💡 Ejecuta: ./scripts/setup-doppler-production.sh para ver cómo configurarlas"
else
    echo "✅ Todas las variables críticas están configuradas"
fi

echo ""
echo "📝 Para ver todas las variables:"
echo "  doppler secrets --project $PROJECT_NAME --config $CONFIG_PROD"

