#!/bin/bash
# ============================================================================
# SCRIPT DE EJECUCIÓN DE SETUP INICIAL
# Sistema de Historias Clínicas Electrónicas
# ============================================================================

echo "============================================="
echo "  SETUP INICIAL - BASE DE DATOS"
echo "  Sistema de Historias Clínicas"
echo "============================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Docker está corriendo
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo"
    echo "Por favor inicia Docker Desktop primero"
    exit 1
fi

# Verificar que el contenedor de PostgreSQL existe
if ! docker ps -a | grep -q "postgres-db"; then
    echo "❌ Error: Contenedor de PostgreSQL no encontrado"
    echo "Por favor ejecuta: docker-compose up -d"
    exit 1
fi

echo -e "${BLUE}📋 Este script poblará la base de datos con:${NC}"
echo "   • 28 países de América Latina"
echo "   • 527 estados/provincias"
echo "   • 174 especialidades médicas"
echo "   • 29 relaciones de emergencia"
echo "   • 403 medicamentos"
echo "   • 202 diagnósticos CIE-10"
echo ""

read -p "¿Deseas continuar? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]
then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo -e "${YELLOW}⏳ Iniciando carga de datos...${NC}"
echo ""

# Ejecutar parte 1: Países, estados, especialidades, relaciones
echo -e "${BLUE}1/2${NC} Cargando países, estados, especialidades y relaciones..."
docker exec -i medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas < backend/initial_data_setup.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Parte 1 completada${NC}"
else
    echo "❌ Error en parte 1"
    exit 1
fi

echo ""

# Ejecutar parte 2: Medicamentos
echo -e "${BLUE}2/2${NC} Cargando medicamentos..."
docker exec -i medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas < backend/initial_data_setup_part2.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Parte 2 completada${NC}"
else
    echo "❌ Error en parte 2"
    exit 1
fi

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}  ✅ SETUP INICIAL COMPLETADO${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

# Mostrar resumen
echo "📊 Resumen de datos cargados:"
echo ""

docker exec medical-records-main-postgres-db-1 psql -U historias_user -d historias_clinicas << 'EOF'
\echo '🌎 Geografía:'
SELECT '   Países: ' || COUNT(*) FROM countries;
SELECT '   Estados: ' || COUNT(*) FROM states;
\echo ''
\echo '🏥 Catálogos médicos:'
SELECT '   Especialidades: ' || COUNT(*) FROM specialties;
SELECT '   Relaciones emergencia: ' || COUNT(*) FROM emergency_relationships;
\echo ''
\echo '💊 Medicamentos:'
SELECT '   Total medicamentos: ' || COUNT(*) FROM medications;
\echo ''
\echo '🔬 Diagnósticos:'
SELECT '   Categorías CIE-10: ' || COUNT(*) FROM diagnosis_categories;
SELECT '   Diagnósticos: ' || COUNT(*) FROM diagnosis_catalog;
\echo ''
EOF

echo ""
echo -e "${BLUE}💡 Recomendaciones:${NC}"
echo "   1. Reinicia el backend: docker-compose restart python-backend"
echo "   2. Verifica que el sistema funcione correctamente"
echo "   3. Haz un backup de la base de datos"
echo ""
echo -e "${GREEN}🚀 El sistema está listo para usar${NC}"
echo ""

