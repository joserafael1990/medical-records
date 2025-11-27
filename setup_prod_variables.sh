#!/bin/bash

# Script para configurar variables de producción en Doppler
# Uso: ./setup_prod_variables.sh

set -e

echo "🚀 Configurando variables de producción en Doppler..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Doppler CLI está instalado
if ! command -v doppler &> /dev/null; then
    echo -e "${RED}❌ Doppler CLI no está instalado${NC}"
    echo "Instala desde: https://docs.doppler.com/docs/install-cli"
    exit 1
fi

# Solicitar proyecto y config
read -p "Nombre del proyecto en Doppler: " PROJECT_NAME
read -p "Nombre del config de producción (default: production): " PROD_CONFIG
PROD_CONFIG=${PROD_CONFIG:-production}

echo ""
echo -e "${YELLOW}⚠️  Este script configurará las siguientes variables en Doppler:${NC}"
echo "   Proyecto: $PROJECT_NAME"
echo "   Config: $PROD_CONFIG"
echo ""
read -p "¿Continuar? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 1
fi

echo ""
echo "📝 Configurando variables de ambiente..."
doppler secrets set ENVIRONMENT=production --project "$PROJECT_NAME" --config "$PROD_CONFIG"
doppler secrets set APP_ENV=production --project "$PROJECT_NAME" --config "$PROD_CONFIG"
doppler secrets set DEBUG=false --project "$PROJECT_NAME" --config "$PROD_CONFIG"
doppler secrets set LOG_LEVEL=info --project "$PROJECT_NAME" --config "$PROD_CONFIG"
doppler secrets set ENABLE_ENCRYPTION=true --project "$PROJECT_NAME" --config "$PROD_CONFIG"

echo ""
echo "🔐 Generando claves secretas..."
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(64))")
MEDICAL_ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

doppler secrets set SECRET_KEY="$SECRET_KEY" --project "$PROJECT_NAME" --config "$PROD_CONFIG"
doppler secrets set JWT_SECRET_KEY="$JWT_SECRET_KEY" --project "$PROJECT_NAME" --config "$PROD_CONFIG"
doppler secrets set MEDICAL_ENCRYPTION_KEY="$MEDICAL_ENCRYPTION_KEY" --project "$PROJECT_NAME" --config "$PROD_CONFIG"

echo ""
echo -e "${GREEN}✅ Claves generadas y configuradas${NC}"
echo -e "${YELLOW}⚠️  IMPORTANTE: Guarda estas claves en un lugar seguro:${NC}"
echo "   SECRET_KEY: $SECRET_KEY"
echo "   JWT_SECRET_KEY: $JWT_SECRET_KEY"
echo "   MEDICAL_ENCRYPTION_KEY: $MEDICAL_ENCRYPTION_KEY"

echo ""
read -p "¿Configurar DATABASE_URL? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "DATABASE_URL de producción: " DB_URL
    doppler secrets set DATABASE_URL="$DB_URL" --project "$PROJECT_NAME" --config "$PROD_CONFIG"
fi

echo ""
read -p "¿Configurar CORS_ORIGINS? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Dominio de producción (ej: https://tu-dominio.com): " DOMAIN
    doppler secrets set CORS_ORIGINS="[\"$DOMAIN\"]" --project "$PROJECT_NAME" --config "$PROD_CONFIG"
    DOMAIN_HOST=$(echo "$DOMAIN" | sed 's|https\?://||' | sed 's|/.*||')
    doppler secrets set ALLOWED_HOSTS="[\"$DOMAIN_HOST\"]" --project "$PROJECT_NAME" --config "$PROD_CONFIG"
fi

echo ""
echo "📱 Configurando variables de WhatsApp (nuevas)..."
doppler secrets set WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_NO_CONFIRMED=appointment_reminder_no_confirmed --project "$PROJECT_NAME" --config "$PROD_CONFIG"
doppler secrets set WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_CONFIRMED=appointment_reminder_confirmed --project "$PROJECT_NAME" --config "$PROD_CONFIG"
doppler secrets set WHATSAPP_TEMPLATE_LANGUAGE=es --project "$PROJECT_NAME" --config "$PROD_CONFIG"

echo ""
read -p "¿Configurar Sentry? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "SENTRY_DSN_BACKEND: " SENTRY_BACKEND
    read -p "REACT_APP_SENTRY_DSN: " SENTRY_FRONTEND
    doppler secrets set SENTRY_DSN_BACKEND="$SENTRY_BACKEND" --project "$PROJECT_NAME" --config "$PROD_CONFIG"
    doppler secrets set SENTRY_ENVIRONMENT=production --project "$PROJECT_NAME" --config "$PROD_CONFIG"
    doppler secrets set REACT_APP_SENTRY_DSN="$SENTRY_FRONTEND" --project "$PROJECT_NAME" --config "$PROD_CONFIG"
    doppler secrets set REACT_APP_SENTRY_ENVIRONMENT=production --project "$PROJECT_NAME" --config "$PROD_CONFIG"
fi

echo ""
echo -e "${GREEN}✅ Variables de producción configuradas${NC}"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Verificar que todas las variables estén configuradas:"
echo "      doppler secrets --project $PROJECT_NAME --config $PROD_CONFIG"
echo ""
echo "   2. Verificar variables de WhatsApp Meta (si no están):"
echo "      - META_WHATSAPP_PHONE_ID"
echo "      - META_WHATSAPP_TOKEN"
echo "      - META_WHATSAPP_VERIFY_TOKEN"
echo ""
echo "   3. Probar la configuración en tu ambiente de producción"



