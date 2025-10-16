#!/bin/bash

echo "🔄 Reiniciando contenedores con sincronización automática..."

# Detener contenedores existentes
echo "⏹️ Deteniendo contenedores..."
docker-compose -f compose.yaml down

# Reconstruir y levantar contenedores con nueva configuración
echo "🏗️ Reconstruyendo contenedores..."
docker-compose -f compose.yaml up --build -d

# Mostrar logs para verificar que todo esté funcionando
echo "📋 Mostrando logs de inicio..."
sleep 5
echo "=== Backend Logs ==="
docker-compose -f compose.yaml logs --tail=10 python-backend
echo "=== Frontend Logs ==="
docker-compose -f compose.yaml logs --tail=10 typescript-frontend

echo "✅ Contenedores reiniciados con sincronización automática!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:8000"
echo ""
echo "💡 Ahora los cambios en tu código se reflejarán automáticamente en los contenedores!"
