#!/bin/bash

# Script para verificar qué variables faltan en Doppler
# Uso: ./check_doppler_variables.sh

echo "🔍 Verificando variables de entorno necesarias para producción..."
echo ""

# Lista de variables CRÍTICAS (obligatorias)
CRITICAL_VARS=(
    "SECRET_KEY"
    "JWT_SECRET_KEY"
    "MEDICAL_ENCRYPTION_KEY"
    "ENABLE_ENCRYPTION"
    "DATABASE_URL"
    "ENVIRONMENT"
    "APP_ENV"
    "DEBUG"
    "LOG_LEVEL"
)

# Lista de variables IMPORTANTES
IMPORTANT_VARS=(
    "CORS_ORIGINS"
    "ALLOWED_HOSTS"
    "SECURITY_HEADERS_ENABLED"
    "RATE_LIMIT_ENABLED"
    "RATE_LIMIT_MAX_REQUESTS"
    "RATE_LIMIT_WINDOW_SECONDS"
    "WHATSAPP_PROVIDER"
    "META_WHATSAPP_PHONE_ID"
    "META_WHATSAPP_TOKEN"
    "META_WHATSAPP_API_VERSION"
    "META_WHATSAPP_VERIFY_TOKEN"
    "WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_NO_CONFIRMED"
    "WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_CONFIRMED"
    "WHATSAPP_TEMPLATE_LANGUAGE"
    "SENTRY_DSN_BACKEND"
    "SENTRY_ENVIRONMENT"
    "REACT_APP_SENTRY_DSN"
    "REACT_APP_SENTRY_ENVIRONMENT"
)

# Lista de variables OPCIONALES
OPTIONAL_VARS=(
    "TWILIO_ACCOUNT_SID"
    "TWILIO_AUTH_TOKEN"
    "TWILIO_WHATSAPP_FROM"
    "TWILIO_CONTENT_SID_APPOINTMENT_REMINDER"
    "TWILIO_CONTENT_SID_PRIVACY_NOTICE"
    "SMTP_HOST"
    "SMTP_PORT"
    "SMTP_USERNAME"
    "SMTP_PASSWORD"
    "EMAIL_FROM"
    "FRONTEND_URL"
    "DEFAULT_ADMIN_USERNAME"
    "DEFAULT_ADMIN_PASSWORD"
    "MAX_FILE_SIZE"
    "UPLOAD_DIR"
    "JWT_ALGORITHM"
    "JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    "JWT_REFRESH_TOKEN_EXPIRE_DAYS"
    "CONTENT_SECURITY_POLICY"
)

echo "📋 VARIABLES CRÍTICAS (Obligatorias):"
echo "======================================"
for var in "${CRITICAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ FALTA: $var"
    else
        echo "✅ OK: $var"
    fi
done

echo ""
echo "📋 VARIABLES IMPORTANTES:"
echo "========================="
for var in "${IMPORTANT_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "⚠️  FALTA: $var"
    else
        echo "✅ OK: $var"
    fi
done

echo ""
echo "📋 VARIABLES OPCIONALES:"
echo "======================="
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "⚪ No configurada: $var (opcional)"
    else
        echo "✅ OK: $var"
    fi
done

echo ""
echo "💡 Para usar este script con Doppler:"
echo "   doppler secrets download --no-file --format env | source /dev/stdin && ./check_doppler_variables.sh"



