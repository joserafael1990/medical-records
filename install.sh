#!/bin/bash

# 🏥 Script de Instalación Automática - Sistema de Historias Clínicas
# Este script automatiza la instalación y configuración del sistema

set -e  # Salir si hay algún error

echo "🏥 Sistema de Historias Clínicas - Instalación Automática"
echo "========================================================"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si Docker está instalado
check_docker() {
    print_status "Verificando instalación de Docker..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker no está instalado. Por favor instala Docker Desktop desde:"
        print_error "https://www.docker.com/products/docker-desktop/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose no está instalado."
        exit 1
    fi
    
    print_success "Docker está instalado correctamente"
}

# Verificar si Docker está ejecutándose
check_docker_running() {
    print_status "Verificando que Docker esté ejecutándose..."
    
    if ! docker info &> /dev/null; then
        print_error "Docker no está ejecutándose. Por favor inicia Docker Desktop."
        exit 1
    fi
    
    print_success "Docker está ejecutándose correctamente"
}

# Verificar si Git está instalado
check_git() {
    print_status "Verificando instalación de Git..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git no está instalado. Por favor instala Git desde:"
        print_error "https://git-scm.com/downloads"
        exit 1
    fi
    
    print_success "Git está instalado correctamente"
}

# Limpiar instalaciones previas
cleanup_previous() {
    print_status "Limpiando instalaciones previas..."
    
    if [ -f "docker-compose.custom.yml" ]; then
        docker-compose -f docker-compose.custom.yml down 2>/dev/null || true
        print_success "Contenedores previos detenidos"
    fi
}

# Construir las imágenes de Docker
build_images() {
    print_status "Construyendo imágenes de Docker..."
    
    if docker-compose -f docker-compose.custom.yml build; then
        print_success "Imágenes construidas correctamente"
    else
        print_error "Error al construir las imágenes"
        exit 1
    fi
}

# Iniciar los servicios
start_services() {
    print_status "Iniciando servicios..."
    
    if docker-compose -f docker-compose.custom.yml up -d; then
        print_success "Servicios iniciados correctamente"
    else
        print_error "Error al iniciar los servicios"
        exit 1
    fi
}

# Verificar que los servicios estén funcionando
verify_services() {
    print_status "Verificando que los servicios estén funcionando..."
    
    # Esperar a que los servicios se inicialicen
    sleep 10
    
    # Verificar contenedores
    if docker ps | grep -q "medical-records-db"; then
        print_success "Base de datos ejecutándose"
    else
        print_error "Base de datos no está ejecutándose"
        exit 1
    fi
    
    if docker ps | grep -q "medical-records-backend"; then
        print_success "Backend API ejecutándose"
    else
        print_error "Backend API no está ejecutándose"
        exit 1
    fi
    
    if docker ps | grep -q "medical-records-frontend"; then
        print_success "Frontend ejecutándose"
    else
        print_error "Frontend no está ejecutándose"
        exit 1
    fi
}

# Verificar conectividad de la API
check_api() {
    print_status "Verificando conectividad de la API..."
    
    # Esperar un poco más para que la API esté lista
    sleep 15
    
    if curl -s http://localhost:8000/health > /dev/null; then
        print_success "API backend respondiendo correctamente"
    else
        print_warning "API backend no está respondiendo aún. Esto puede ser normal en la primera ejecución."
        print_warning "Espera unos minutos más y verifica manualmente en: http://localhost:8000/health"
    fi
}

# Mostrar información de acceso
show_access_info() {
    echo ""
    echo "🎉 ¡Instalación Completada Exitosamente!"
    echo "========================================"
    echo ""
    echo "📱 Acceso a la aplicación:"
    echo "   🌐 Frontend: http://localhost:3000"
    echo "   🔧 Backend API: http://localhost:8000"
    echo "   📚 Documentación API: http://localhost:8000/docs"
    echo ""
    echo "🔐 Credenciales de acceso:"
    echo "   📧 Email: thiago@avant.com"
    echo "   🔑 Contraseña: Password123!"
    echo ""
    echo "🛠️ Comandos útiles:"
    echo "   Ver estado: docker ps"
    echo "   Ver logs: docker logs medical-records-backend"
    echo "   Detener: docker-compose -f docker-compose.custom.yml down"
    echo "   Reiniciar: docker-compose -f docker-compose.custom.yml restart"
    echo ""
    echo "📖 Para más información, consulta: SETUP_GUIDE.md"
    echo ""
    print_success "¡El Sistema de Historias Clínicas está listo para usar!"
}

# Función principal
main() {
    echo "Iniciando proceso de instalación..."
    echo ""
    
    # Verificaciones previas
    check_git
    check_docker
    check_docker_running
    
    # Proceso de instalación
    cleanup_previous
    build_images
    start_services
    verify_services
    check_api
    
    # Información final
    show_access_info
}

# Ejecutar función principal
main "$@"
