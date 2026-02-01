#!/bin/bash

# Script para configurar WhatsApp con Twilio
# Uso: ./setup_whatsapp.sh

echo "🔧 Configuración de WhatsApp con Twilio"
echo "========================================"
echo ""

# Verificar si .env ya existe
if [ -f .env ]; then
    echo "⚠️  El archivo .env ya existe."
    read -p "¿Deseas sobrescribirlo? (s/N): " overwrite
    if [[ ! $overwrite =~ ^[Ss]$ ]]; then
        echo "❌ Operación cancelada."
        exit 1
    fi
fi

echo "📋 Necesitarás las siguientes credenciales de Twilio:"
echo "   1. Account SID (comienza con AC...)"
echo "   2. Auth Token"
echo "   3. Número de WhatsApp (formato: whatsapp:+14155238886)"
echo ""
echo "Si no las tienes, sigue estos pasos:"
echo "   1. Ve a https://www.twilio.com/ y crea una cuenta"
echo "   2. Ve a Console > Messaging > WhatsApp Sandbox"
echo "   3. Conecta tu número de WhatsApp"
echo "   4. Obtén tus credenciales de Console > Account > API Keys & Tokens"
echo ""
read -p "¿Tienes las credenciales listas? (s/N): " ready
if [[ ! $ready =~ ^[Ss]$ ]]; then
    echo "❌ Por favor, obtén las credenciales primero."
    echo "   Puedes consultar la guía en WHATSAPP_TWILIO_SETUP.md"
    exit 1
fi

echo ""
echo "Ingresa tus credenciales:"
echo ""

read -p "Account SID: " account_sid
read -sp "Auth Token (no se mostrará): " auth_token
echo ""
read -p "WhatsApp From (ej: whatsapp:+14155238886): " whatsapp_from

# Validar que los campos no estén vacíos
if [ -z "$account_sid" ] || [ -z "$auth_token" ] || [ -z "$whatsapp_from" ]; then
    echo "❌ Error: Todos los campos son obligatorios."
    exit 1
fi

# Validar formato de Account SID
if [[ ! $account_sid =~ ^AC ]]; then
    echo "⚠️  Advertencia: El Account SID debería comenzar con 'AC'"
    read -p "¿Continuar de todos modos? (s/N): " continue_anyway
    if [[ ! $continue_anyway =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Validar formato de WhatsApp From
if [[ ! $whatsapp_from =~ ^whatsapp:\+ ]]; then
    echo "⚠️  Advertencia: El formato debería ser 'whatsapp:+14155238886'"
    read -p "¿Continuar de todos modos? (s/N): " continue_anyway
    if [[ ! $continue_anyway =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

# Crear archivo .env
cat > .env << EOF
# ============================================================================
# WhatsApp Configuration - Twilio
# ============================================================================
# Generado automáticamente el $(date)
# 
# Para más información, consulta WHATSAPP_TWILIO_SETUP.md

# Proveedor de WhatsApp
WHATSAPP_PROVIDER=twilio

# Credenciales de Twilio
TWILIO_ACCOUNT_SID=$account_sid
TWILIO_AUTH_TOKEN=$auth_token
TWILIO_WHATSAPP_FROM=$whatsapp_from

# Content SIDs para templates aprobados (opcional - dejar vacío por ahora)
TWILIO_CONTENT_SID_APPOINTMENT_REMINDER=
TWILIO_CONTENT_SID_PRIVACY_NOTICE=
EOF

echo ""
echo "✅ Archivo .env creado exitosamente!"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Verifica que el archivo .env contiene tus credenciales correctas"
echo "   2. Reinicia los contenedores: docker-compose restart python-backend"
echo "   3. Prueba el envío desde la aplicación"
echo ""
echo "🔒 IMPORTANTE: El archivo .env contiene credenciales sensibles."
echo "   Asegúrate de que NO se suba a git (debe estar en .gitignore)"
echo ""

