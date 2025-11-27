#!/bin/bash
# Script para verificar qué variables faltan en producción
# Uso: ./scripts/verificar-variables-produccion.sh

PROJECT="cortex"
CONFIG_DEV="dev"  # IMPORTANTE: Usar solo 'dev' para desarrollo (NO usar 'dev_personal')
CONFIG_PROD="prd"  # IMPORTANTE: Usar 'prd' para producción (NO usar 'production' o 'prd_production')

echo "🔍 Verificando variables en producción vs desarrollo"
echo "=================================================="
echo ""

# Variables críticas que DEBEN estar en producción
CRITICAL_VARS=(
    "DATABASE_URL"
    "CORS_ORIGINS"
    "ALLOWED_HOSTS"
    "SENTRY_DSN_BACKEND"
    "REACT_APP_SENTRY_DSN"
    "META_WHATSAPP_PHONE_ID"
    "META_WHATSAPP_TOKEN"
    "META_WHATSAPP_API_VERSION"
)

echo "📋 Variables críticas que deben estar en producción:"
echo ""

for var in "${CRITICAL_VARS[@]}"; do
    # Verificar si existe en producción
    if doppler secrets get "$var" --project "$PROJECT" --config "$CONFIG_PROD" --plain 2>/dev/null | grep -q .; then
        echo "  ✅ $var - Configurada"
    else
        echo "  ❌ $var - FALTA"
        
        # Si existe en dev, mostrar el valor (sin mostrarlo completo por seguridad)
        if doppler secrets get "$var" --project "$PROJECT" --config "$CONFIG_DEV" --plain 2>/dev/null | grep -q .; then
            VALUE=$(doppler secrets get "$var" --project "$PROJECT" --config "$CONFIG_DEV" --plain 2>/dev/null)
            if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]] || [[ "$var" == *"TOKEN"* ]] || [[ "$var" == *"PASSWORD"* ]]; then
                echo "     💡 Existe en dev (valor oculto por seguridad)"
            else
                echo "     💡 Existe en dev: ${VALUE:0:50}..."
            fi
        else
            echo "     ⚠️  No existe en dev tampoco"
        fi
    fi
done

echo ""
echo "📝 Para copiar una variable de dev a prod:"
echo "   doppler secrets get VARIABLE_NAME --project $PROJECT --config $CONFIG_DEV --plain"
echo "   doppler secrets set VARIABLE_NAME=\"<valor>\" --project $PROJECT --config $CONFIG_PROD"
echo ""



