#!/bin/bash
# Script para ejecutar migraciones SQL en la base de datos
# Uso: ./scripts/run-migration.sh [migration-file.sql]

set -e

MIGRATION_FILE=${1}

if [ -z "$MIGRATION_FILE" ]; then
    echo "❌ Error: Debes especificar el archivo de migración"
    echo "   Uso: ./scripts/run-migration.sh backend/migrations/migration_add_appointment_reminders.sql"
    exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Archivo de migración no encontrado: $MIGRATION_FILE"
    exit 1
fi

echo "📦 Ejecutando migración: $MIGRATION_FILE"
echo ""

# Verificar que postgres está corriendo
if ! docker compose ps postgres-db | grep -q "Up"; then
    echo "⚠️  PostgreSQL no está corriendo. Iniciando..."
    docker compose up -d postgres-db
    echo "⏳ Esperando que PostgreSQL esté listo..."
    sleep 5
fi

# Ejecutar migración
docker compose exec -T postgres-db psql -U historias_user -d historias_clinicas < "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migración ejecutada correctamente"
    
    # Verificar que la tabla existe
    echo ""
    echo "🔍 Verificando que la tabla fue creada..."
    docker compose exec -T postgres-db psql -U historias_user -d historias_clinicas -c "\dt appointment_reminders" 2>&1 | grep -q "appointment_reminders" && echo "✅ Tabla 'appointment_reminders' existe" || echo "⚠️  Tabla no encontrada"
else
    echo ""
    echo "❌ Error al ejecutar la migración"
    exit 1
fi

