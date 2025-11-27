#!/bin/bash
# Script para configurar variables de producción en prd
# Uso: ./scripts/configurar-prd-production.sh
# IMPORTANTE: Este script usa el config 'prd' (NO usar 'prd_production' o 'production')

set -e

PROJECT="cortex"
CONFIG="prd"  # IMPORTANTE: Usar 'prd' para producción (NO usar 'prd_production' o 'production')

echo "🔐 Configurando variables de producción en $CONFIG"
echo "=================================================="
echo ""

# Variables de ambiente críticas
echo "📝 Configurando variables de ambiente..."
doppler secrets set DEBUG=false --project "$PROJECT" --config "$CONFIG"
doppler secrets set LOG_LEVEL=info --project "$PROJECT" --config "$CONFIG"
doppler secrets set ENABLE_ENCRYPTION=true --project "$PROJECT" --config "$CONFIG"
echo "✅ Variables de ambiente configuradas"
echo ""

# Generar claves secretas NUEVAS
echo "🔑 Generando claves secretas NUEVAS..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
doppler secrets set SECRET_KEY="$SECRET_KEY" --project "$PROJECT" --config "$CONFIG"
echo "✅ SECRET_KEY generada y configurada"

JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
doppler secrets set JWT_SECRET_KEY="$JWT_SECRET_KEY" --project "$PROJECT" --config "$CONFIG"
echo "✅ JWT_SECRET_KEY generada y configurada"

MEDICAL_ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
doppler secrets set MEDICAL_ENCRYPTION_KEY="$MEDICAL_ENCRYPTION_KEY" --project "$PROJECT" --config "$CONFIG"
echo "✅ MEDICAL_ENCRYPTION_KEY generada y configurada"
echo ""

# Sentry para producción
echo "📊 Configurando Sentry..."
doppler secrets set SENTRY_ENVIRONMENT=production --project "$PROJECT" --config "$CONFIG"
doppler secrets set REACT_APP_SENTRY_ENVIRONMENT=production --project "$PROJECT" --config "$CONFIG"
echo "✅ Sentry configurado"
echo ""

# Variables nuevas de WhatsApp
echo "📱 Configurando variables de WhatsApp..."
doppler secrets set WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_NO_CONFIRMED=appointment_reminder_no_confirmed --project "$PROJECT" --config "$CONFIG"
doppler secrets set WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_CONFIRMED=appointment_reminder_confirmed --project "$PROJECT" --config "$CONFIG"
doppler secrets set WHATSAPP_TEMPLATE_LANGUAGE=es --project "$PROJECT" --config "$CONFIG"
echo "✅ Variables de WhatsApp configuradas"
echo ""

echo "✅ ¡Configuración completada!"
echo ""
echo "📋 Variables que aún necesitas configurar manualmente:"
echo "  - DATABASE_URL (base de datos de producción)"
echo "  - CORS_ORIGINS (tu dominio de producción)"
echo "  - ALLOWED_HOSTS (tu dominio de producción)"
echo ""
echo "🔍 Verificar todas las variables:"
echo "  doppler secrets --project $PROJECT --config $CONFIG"
echo ""



