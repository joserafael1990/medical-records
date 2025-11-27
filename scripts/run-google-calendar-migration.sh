#!/bin/bash
# Script para ejecutar la migración de Google Calendar
# Uso: ./scripts/run-google-calendar-migration.sh

set -e

MIGRATION_FILE="backend/migrations/migration_add_google_calendar_tokens.sql"

echo "📅 Ejecutando migración de Google Calendar..."
echo "=============================================="
echo ""

# Verificar que el archivo existe
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: No se encontró el archivo de migración: $MIGRATION_FILE"
    exit 1
fi

# Obtener variables de entorno de Docker Compose
DB_HOST="${DB_HOST:-postgres-db}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-historias_clinicas}"
DB_USER="${DB_USER:-historias_user}"
DB_PASSWORD="${DB_PASSWORD:-historias_pass}"

# Si estamos en Docker, usar el servicio de postgres
if docker compose ps postgres-db 2>/dev/null | grep -q "Up"; then
    echo "🐳 Ejecutando migración en contenedor Docker..."
    docker compose exec -T postgres-db psql -U "$DB_USER" -d "$DB_NAME" < "$MIGRATION_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Migración ejecutada exitosamente"
    else
        echo "❌ Error al ejecutar la migración"
        exit 1
    fi
else
    echo "💻 Ejecutando migración localmente..."
    echo "⚠️  Asegúrate de tener PostgreSQL corriendo y las credenciales correctas"
    
    # Intentar ejecutar con psql local
    if command -v psql &> /dev/null; then
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE"
        
        if [ $? -eq 0 ]; then
            echo "✅ Migración ejecutada exitosamente"
        else
            echo "❌ Error al ejecutar la migración"
            exit 1
        fi
    else
        echo "❌ Error: psql no está instalado"
        echo "💡 Alternativa: Ejecuta el SQL manualmente en tu cliente de PostgreSQL"
        exit 1
    fi
fi

echo ""
echo "🔍 Verificando que las tablas se crearon correctamente..."
if docker compose ps postgres-db 2>/dev/null | grep -q "Up"; then
    docker compose exec -T postgres-db psql -U "$DB_USER" -d "$DB_NAME" -c "\dt google_calendar*" 2>/dev/null || echo "⚠️  No se pudieron listar las tablas (puede ser normal si hay errores menores)"
else
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt google_calendar*" 2>/dev/null || echo "⚠️  No se pudieron listar las tablas (puede ser normal si hay errores menores)"
fi

echo ""
echo "✅ ¡Migración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Actualizar modelos en backend/database.py"
echo "   2. Instalar dependencias de Google Calendar API"
echo "   3. Crear servicio de Google Calendar"

