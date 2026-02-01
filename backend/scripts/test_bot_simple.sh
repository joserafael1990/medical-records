#!/bin/bash
# Script simple para probar el bot sin autenticación (solo desarrollo)

PHONE="${1:-+521234567890}"
MESSAGE="${2:-Hola}"

echo "🤖 Probando Appointment Agent"
echo "=============================="
echo "Teléfono: $PHONE"
echo "Mensaje: $MESSAGE"
echo ""

# Intentar con endpoint de desarrollo (sin auth)
echo "📡 Enviando petición a /api/whatsapp/test-bot-dev..."
echo ""

curl -X POST "http://localhost:8000/api/whatsapp/test-bot-dev?phone=$PHONE&message=$MESSAGE" \
  -H "Content-Type: application/json" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  2>&1 | jq '.' 2>/dev/null || cat

echo ""
echo "✅ Prueba completada"

