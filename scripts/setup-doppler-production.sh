#!/bin/bash
# Script para configurar variables de producción en Doppler
# Uso: ./scripts/setup-doppler-production.sh

set -e

PROJECT_NAME="cortex"
CONFIG_DEV="dev"  # IMPORTANTE: Usar solo 'dev' para desarrollo (NO usar 'dev_personal')
CONFIG_PROD="prd"  # IMPORTANTE: Usar 'prd' para producción (NO usar 'production')

echo "🔐 Configurando variables de producción en Doppler"
echo "=================================================="
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

# Verificar si existe el config de producción
if doppler configs --project "$PROJECT_NAME" --json 2>/dev/null | jq -e ".configs[] | select(.name == \"$CONFIG_PROD\")" &> /dev/null; then
    echo "✅ Config de producción '$CONFIG_PROD' ya existe"
else
    echo "📝 Creando config de producción '$CONFIG_PROD'..."
    # Crear config con environment (requerido por Doppler)
    doppler configs create "$CONFIG_PROD" --project "$PROJECT_NAME" --environment production 2>/dev/null || \
    doppler configs create "$CONFIG_PROD" --project "$PROJECT_NAME" 2>/dev/null || {
        echo "⚠️  No se pudo crear el config automáticamente"
        echo "💡 Créalo manualmente desde el dashboard: https://dashboard.doppler.com"
        echo "   O ejecuta: doppler configs create $CONFIG_PROD --project $PROJECT_NAME"
    }
    echo "✅ Config de producción creado o ya existe"
fi

echo ""
echo "📋 Variables que necesitas configurar en producción:"
echo "=================================================="
echo ""

# Variables críticas que DEBEN tener valores diferentes
echo "🔴 CRÍTICAS - Valores diferentes obligatorios:"
echo "  - ENVIRONMENT=production"
echo "  - APP_ENV=production"
echo "  - DEBUG=false"
echo "  - LOG_LEVEL=info"
echo "  - ENABLE_ENCRYPTION=true"
echo "  - DATABASE_URL=<tu-db-produccion>"
echo "  - CORS_ORIGINS=[\"https://tu-dominio.com\"]"
echo "  - ALLOWED_HOSTS=[\"tu-dominio.com\"]"
echo "  - SENTRY_ENVIRONMENT=production"
echo "  - REACT_APP_SENTRY_ENVIRONMENT=production"
echo ""

# Claves secretas que deben generarse
echo "🔐 Claves secretas - Generar NUEVAS para producción:"
echo "  - SECRET_KEY (generar nueva)"
echo "  - JWT_SECRET_KEY (generar nueva)"
echo "  - MEDICAL_ENCRYPTION_KEY (generar nueva)"
echo ""

# Variables nuevas que probablemente no están en DEV
echo "🆕 Variables NUEVAS que deben agregarse:"
echo "  - WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_NO_CONFIRMED"
echo "  - WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_CONFIRMED"
echo "  - WHATSAPP_TEMPLATE_LANGUAGE=es"
echo ""

# Verificar qué variables ya existen en PROD
echo "🔍 Verificando variables existentes en producción..."
echo ""

EXISTING_VARS=$(doppler secrets --project "$PROJECT_NAME" --config "$CONFIG_PROD" --json 2>/dev/null | jq -r '.[].name' 2>/dev/null || echo "")

if [ -z "$EXISTING_VARS" ]; then
    echo "⚠️  No hay variables configuradas en producción aún"
    echo ""
    echo "💡 Opción 1: Copiar variables de DEV a PROD (base)"
    read -p "¿Quieres copiar las variables de DEV a PROD como base? (s/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        echo "📋 Exportando variables de DEV..."
        DEV_VARS=$(doppler secrets download --project "$PROJECT_NAME" --config "$CONFIG_DEV" --no-file --format env 2>/dev/null || echo "")
        
        if [ -z "$DEV_VARS" ]; then
            echo "❌ No se pudieron obtener variables de DEV"
        else
            echo "✅ Variables de DEV exportadas"
            echo ""
            echo "⚠️  IMPORTANTE: Debes actualizar manualmente los valores críticos:"
            echo "   - ENVIRONMENT, APP_ENV, DEBUG, LOG_LEVEL"
            echo "   - ENABLE_ENCRYPTION"
            echo "   - DATABASE_URL"
            echo "   - CORS_ORIGINS, ALLOWED_HOSTS"
            echo "   - Generar nuevas claves secretas"
        fi
    fi
else
    echo "✅ Variables existentes en producción:"
    echo "$EXISTING_VARS" | while read -r var; do
        echo "  ✓ $var"
    done
    echo ""
fi

echo ""
echo "🔧 Comandos para configurar variables de producción:"
echo "=================================================="
echo ""

# Generar comandos para claves secretas
echo "# Generar y configurar claves secretas:"
echo "SECRET_KEY=\$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"
echo "doppler secrets set SECRET_KEY=\"\$SECRET_KEY\" --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""
echo "JWT_SECRET_KEY=\$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"
echo "doppler secrets set JWT_SECRET_KEY=\"\$JWT_SECRET_KEY\" --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""
echo "MEDICAL_ENCRYPTION_KEY=\$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
echo "doppler secrets set MEDICAL_ENCRYPTION_KEY=\"\$MEDICAL_ENCRYPTION_KEY\" --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""

# Comandos para variables de ambiente
echo "# Configurar variables de ambiente:"
echo "doppler secrets set ENVIRONMENT=production --project $PROJECT_NAME --config $CONFIG_PROD"
echo "doppler secrets set APP_ENV=production --project $PROJECT_NAME --config $CONFIG_PROD"
echo "doppler secrets set DEBUG=false --project $PROJECT_NAME --config $CONFIG_PROD"
echo "doppler secrets set LOG_LEVEL=info --project $PROJECT_NAME --config $CONFIG_PROD"
echo "doppler secrets set ENABLE_ENCRYPTION=true --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""

# Comandos para CORS y dominios
echo "# Configurar CORS y dominios (REEMPLAZA 'tu-dominio.com' con tu dominio real):"
echo "doppler secrets set CORS_ORIGINS='[\"https://tu-dominio.com\"]' --project $PROJECT_NAME --config $CONFIG_PROD"
echo "doppler secrets set ALLOWED_HOSTS='[\"tu-dominio.com\"]' --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""

# Comandos para base de datos
echo "# Configurar base de datos de producción (REEMPLAZA con tus credenciales reales):"
echo "doppler secrets set DATABASE_URL='postgresql://user:pass@host:5432/historias_clinicas' --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""

# Comandos para WhatsApp templates
echo "# Agregar variables de WhatsApp templates:"
echo "doppler secrets set WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_NO_CONFIRMED=appointment_reminder_no_confirmed --project $PROJECT_NAME --config $CONFIG_PROD"
echo "doppler secrets set WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_CONFIRMED=appointment_reminder_confirmed --project $PROJECT_NAME --config $CONFIG_PROD"
echo "doppler secrets set WHATSAPP_TEMPLATE_LANGUAGE=es --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""

# Comandos para Sentry
echo "# Configurar Sentry para producción:"
echo "doppler secrets set SENTRY_ENVIRONMENT=production --project $PROJECT_NAME --config $CONFIG_PROD"
echo "doppler secrets set REACT_APP_SENTRY_ENVIRONMENT=production --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""

echo "📝 Checklist de verificación:"
echo "=================================================="
echo ""
echo "Después de configurar, verifica con:"
echo "  doppler secrets --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""
echo "O verifica una variable específica:"
echo "  doppler secrets get VARIABLE_NAME --project $PROJECT_NAME --config $CONFIG_PROD"
echo ""

