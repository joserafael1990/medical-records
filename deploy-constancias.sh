#!/bin/bash

# Script para desplegar la funcionalidad de Constancias Médicas
# Uso: ./deploy-constancias.sh

set -e  # Exit on error

echo "=================================================="
echo "  Despliegue de Constancias Médicas - CORTEX"
echo "=================================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para mensajes
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que Docker está instalado
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado. Por favor instala Docker primero."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose no está instalado. Por favor instala Docker Compose primero."
    exit 1
fi

info "Docker y Docker Compose detectados ✓"

# Mostrar archivos modificados
echo ""
info "Archivos modificados/creados:"
echo "  ✓ frontend/src/services/pdfService.ts (método generateCertificate agregado)"
echo "  ✓ frontend/src/hooks/usePDFGenerator.ts (hook agregado)"
echo "  ✓ frontend/src/components/common/PrintCertificateButton.tsx (NUEVO)"
echo "  ✓ frontend/src/components/common/PrintButtons.tsx (integración)"
echo "  ✓ docs/CONSTANCIA_MEDICA_GUIDE.md (NUEVO)"
echo "  ✓ CONSTANCIA_IMPLEMENTATION_SUMMARY.md (NUEVO)"
echo ""

# Preguntar si continuar
read -p "¿Deseas reconstruir y desplegar los contenedores? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    warning "Despliegue cancelado por el usuario."
    exit 0
fi

# Detener contenedores actuales
info "Deteniendo contenedores actuales..."
docker-compose down || true

# Reconstruir las imágenes
info "Reconstruyendo imágenes de Docker..."
docker-compose build --no-cache typescript-frontend

# Levantar los servicios
info "Levantando servicios..."
docker-compose up -d

# Esperar un momento para que los servicios inicien
info "Esperando a que los servicios inicien..."
sleep 5

# Verificar estado
info "Verificando estado de los contenedores..."
docker-compose ps

echo ""
info "=================================================="
info "  Despliegue completado exitosamente!"
info "=================================================="
echo ""
info "Servicios disponibles:"
info "  - Frontend: http://localhost:3000"
info "  - Backend: http://localhost:8000"
info "  - Base de datos: localhost:5432"
echo ""
info "Para ver los logs del frontend:"
echo "  docker-compose logs -f typescript-frontend"
echo ""
info "Para ver los logs del backend:"
echo "  docker-compose logs -f python-backend"
echo ""
info "Para detener los servicios:"
echo "  docker-compose down"
echo ""

# Preguntar si mostrar logs
read -p "¿Deseas ver los logs del frontend ahora? (s/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Ss]$ ]]; then
    info "Mostrando logs del frontend (Ctrl+C para salir)..."
    docker-compose logs -f typescript-frontend
fi

