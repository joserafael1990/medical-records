#!/bin/bash
# Script para copiar variables de dev a prd_production que pueden ser las mismas
# Uso: ./scripts/copiar-variables-dev-a-prod.sh

set -e

PROJECT="cortex"
CONFIG_DEV="dev"  # IMPORTANTE: Usar solo 'dev' para desarrollo (NO usar 'dev_personal')
CONFIG_PROD="prd"  # IMPORTANTE: Usar 'prd' para producción (NO usar 'production' o 'prd_production')

echo "📋 Copiando variables de dev a producción"
echo "=========================================="
echo ""
echo "⚠️  Este script copia variables que pueden ser las mismas en dev y prod"
echo "   (Sentry DSN, WhatsApp credentials, etc.)"
echo ""
read -p "¿Continuar? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo "❌ Cancelado"
    exit 0
fi

# Variables que pueden copiarse de dev a prod (mismos valores)
VARS_TO_COPY=(
    "SENTRY_DSN_BACKEND"
    "REACT_APP_SENTRY_DSN"
    "META_WHATSAPP_PHONE_ID"
    "META_WHATSAPP_TOKEN"
    "META_WHATSAPP_API_VERSION"
    "WHATSAPP_PROVIDER"
)

echo ""
echo "📝 Copiando variables..."
echo ""

for var in "${VARS_TO_COPY[@]}"; do
    # Verificar si ya existe en prod
    if doppler secrets get "$var" --project "$PROJECT" --config "$CONFIG_PROD" --plain 2>/dev/null | grep -q .; then
        echo "  ⏭️  $var - Ya existe en producción, omitiendo"
    else
        # Obtener valor de dev
        VALUE=$(doppler secrets get "$var" --project "$PROJECT" --config "$CONFIG_DEV" --plain 2>/dev/null || echo "")
        
        if [ -z "$VALUE" ]; then
            echo "  ⚠️  $var - No existe en dev, omitiendo"
        else
            # Copiar a prod
            doppler secrets set "$var=$VALUE" --project "$PROJECT" --config "$CONFIG_PROD" > /dev/null 2>&1
            echo "  ✅ $var - Copiada"
        fi
    fi
done

echo ""
echo "✅ Variables copiadas"
echo ""
echo "📋 Variables que DEBES configurar manualmente con valores de producción:"
echo "  - DATABASE_URL (base de datos de producción)"
echo "  - CORS_ORIGINS (tu dominio de producción, ej: '[\"https://tu-dominio.com\"]')"
echo "  - ALLOWED_HOSTS (tu dominio de producción, ej: '[\"tu-dominio.com\"]')"
echo ""
echo "💡 Comandos para configurar:"
echo "  doppler secrets set DATABASE_URL=\"postgresql://user:pass@host:5432/db\" --project $PROJECT --config $CONFIG_PROD"
echo "  doppler secrets set CORS_ORIGINS='[\"https://tu-dominio.com\"]' --project $PROJECT --config $CONFIG_PROD"
echo "  doppler secrets set ALLOWED_HOSTS='[\"tu-dominio.com\"]' --project $PROJECT --config $CONFIG_PROD"
echo ""



