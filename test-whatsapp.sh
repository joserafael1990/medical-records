#!/bin/bash

# Script de prueba para WhatsApp Integration
# Este script verifica que la integración de WhatsApp esté funcionando correctamente

echo "📱 =============================================="
echo "   WhatsApp Integration - Script de Prueba"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Docker esté corriendo
echo "1️⃣  Verificando Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker no está corriendo${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker está corriendo${NC}"
echo ""

# Verificar que los contenedores estén corriendo
echo "2️⃣  Verificando contenedores..."
BACKEND_RUNNING=$(docker ps --filter "name=medical-records-main-python-backend-1" --format "{{.Names}}")
FRONTEND_RUNNING=$(docker ps --filter "name=medical-records-main-typescript-frontend-1" --format "{{.Names}}")

if [ -z "$BACKEND_RUNNING" ]; then
    echo -e "${RED}❌ Backend no está corriendo${NC}"
    exit 1
fi

if [ -z "$FRONTEND_RUNNING" ]; then
    echo -e "${RED}❌ Frontend no está corriendo${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend está corriendo${NC}"
echo -e "${GREEN}✅ Frontend está corriendo${NC}"
echo ""

# Verificar variables de entorno de WhatsApp en el backend
echo "3️⃣  Verificando configuración de WhatsApp..."
PHONE_ID=$(docker exec medical-records-main-python-backend-1 sh -c 'echo $META_WHATSAPP_PHONE_ID')
API_VERSION=$(docker exec medical-records-main-python-backend-1 sh -c 'echo $META_WHATSAPP_API_VERSION')

if [ -z "$PHONE_ID" ]; then
    echo -e "${RED}❌ META_WHATSAPP_PHONE_ID no configurado${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Phone ID configurado: $PHONE_ID${NC}"
echo -e "${GREEN}✅ API Version: $API_VERSION${NC}"
echo ""

# Probar servicio de WhatsApp en Python
echo "4️⃣  Probando servicio de WhatsApp en Python..."
docker exec medical-records-main-python-backend-1 python3 -c "
from whatsapp_service import WhatsAppService
service = WhatsAppService()
print('✅ WhatsAppService inicializado correctamente')
print(f'   Phone ID: {service.phone_id}')
print(f'   Token configurado: {'Sí' if service.access_token else 'No'}')
print(f'   Base URL: {service.base_url}')
" 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error al inicializar WhatsAppService${NC}"
    exit 1
fi
echo ""

# Probar conectividad con backend
echo "5️⃣  Probando conectividad con backend..."
HEALTH_CHECK=$(curl -s http://localhost:8000/health)
if [ -z "$HEALTH_CHECK" ]; then
    echo -e "${RED}❌ Backend no responde${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend responde correctamente${NC}"
echo ""

# Obtener token de autenticación
echo "6️⃣  Obteniendo token de autenticación..."
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rafaelgarcia2027@gmail.com","password":"Password123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ No se pudo obtener token de autenticación${NC}"
    echo -e "${YELLOW}   Verifica que el usuario rafaelgarcia2027@gmail.com exista con password Password123!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Token obtenido correctamente${NC}"
echo ""

# Menú de pruebas
echo "=============================================="
echo "Selecciona una prueba:"
echo "=============================================="
echo "1) Enviar mensaje de prueba (hello_world)"
echo "2) Ver configuración completa"
echo "3) Salir"
echo ""
read -p "Opción: " option

case $option in
    1)
        echo ""
        read -p "Ingresa el número de teléfono (ej: 525579449672): " phone_number
        
        if [ -z "$phone_number" ]; then
            echo -e "${RED}❌ Número de teléfono requerido${NC}"
            exit 1
        fi
        
        echo ""
        echo "📤 Enviando mensaje de prueba a $phone_number..."
        RESULT=$(curl -s -X POST "http://localhost:8000/api/whatsapp/test?phone=$phone_number" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json")
        
        echo ""
        echo "📱 Respuesta del servidor:"
        echo "$RESULT" | python3 -m json.tool
        
        SUCCESS=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('message_id', ''))" 2>/dev/null)
        
        if [ -n "$SUCCESS" ]; then
            echo ""
            echo -e "${GREEN}✅ Mensaje enviado exitosamente!${NC}"
            echo -e "${YELLOW}   Verifica tu WhatsApp para confirmar que recibiste el mensaje 'Hello World'${NC}"
        else
            echo ""
            echo -e "${RED}❌ Error al enviar mensaje${NC}"
            ERROR=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', 'Unknown error'))" 2>/dev/null)
            echo -e "${RED}   Error: $ERROR${NC}"
        fi
        ;;
    2)
        echo ""
        echo "=============================================="
        echo "📋 Configuración Completa de WhatsApp"
        echo "=============================================="
        echo ""
        docker exec medical-records-main-python-backend-1 python3 << 'EOF'
from whatsapp_service import WhatsAppService
service = WhatsAppService()

print("🔧 CREDENCIALES:")
print(f"   Phone ID: {service.phone_id}")
print(f"   Token (primeros 50 chars): {service.access_token[:50] if service.access_token else 'NO CONFIGURADO'}...")
print(f"   API Version: {service.api_version}")
print(f"   Base URL: {service.base_url}")
print("")
print("📱 FORMATEO DE NÚMEROS:")
test_numbers = ["5579449672", "525579449672", "+525579449672"]
for num in test_numbers:
    formatted = service._format_phone_number(num)
    print(f"   {num} → {formatted}")
print("")
print("✅ TODO CONFIGURADO CORRECTAMENTE")
EOF
        ;;
    3)
        echo "👋 Saliendo..."
        exit 0
        ;;
    *)
        echo -e "${RED}❌ Opción inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo "=============================================="
echo "🎉 Prueba completada!"
echo "=============================================="
echo ""
echo "📚 Documentación adicional:"
echo "   - docs/WHATSAPP_INTEGRATION.md"
echo "   - docs/WHATSAPP_QUICKSTART.md"
echo "   - docs/WHATSAPP_TROUBLESHOOTING.md"
echo "   - docs/WHATSAPP_SUMMARY.md"
echo ""

