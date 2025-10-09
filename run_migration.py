#!/usr/bin/env python3
"""
Script para ejecutar la migración de birth_place a birth_city
Este script renombra la columna en la base de datos PostgreSQL
"""

import psycopg2
from psycopg2 import sql

def run_migration():
    """Ejecutar la migración de base de datos"""

    # Configuración de la base de datos
    DB_CONFIG = {
        "host": "localhost",
        "port": 5432,
        "database": "historias_clinicas",
        "user": "historias_user",
        "password": "historias_pass"
    }

    try:
        # Conectar a la base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("🔍 Verificando estructura actual de la tabla persons...")

        # Verificar si la columna birth_place existe
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'persons' AND column_name = 'birth_place'
        """)

        if not cursor.fetchone():
            print("✅ La columna birth_place ya no existe (ya migrada)")
            return

        print("📋 Encontrada columna birth_place. Procediendo con la migración...")

        # Renombrar la columna
        cursor.execute(sql.SQL("ALTER TABLE persons RENAME COLUMN birth_place TO birth_city"))

        # Confirmar los cambios
        conn.commit()

        print("✅ Migración completada exitosamente!")
        print("📊 Verificando resultado...")

        # Verificar que la nueva columna existe
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'persons' AND column_name = 'birth_city'
        """)

        result = cursor.fetchone()
        if result:
            print(f"✅ Nueva columna: {result[0]} ({result[1]}, nullable: {result[2]})")

        # Mostrar estadísticas
        cursor.execute("""
            SELECT
                COUNT(*) as total_records,
                COUNT(birth_city) as records_with_birth_city,
                COUNT(CASE WHEN birth_city IS NOT NULL AND birth_city != '' THEN 1 END) as records_with_data
            FROM persons
        """)

        stats = cursor.fetchone()
        print("📈 Estadísticas de migración:")
        print(f"   - Total registros: {stats[0]}")
        print(f"   - Registros con birth_city: {stats[1]}")
        print(f"   - Registros con datos: {stats[2]}")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"❌ Error en la migración: {e}")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

    return True

if __name__ == "__main__":
    print("🚀 Iniciando migración de birth_place a birth_city...")
    print("=" * 60)

    success = run_migration()

    if success:
        print("\n🎉 ¡Migración completada exitosamente!")
        print("✅ El sistema ahora usa birth_city en lugar de birth_place")
    else:
        print("\n❌ La migración falló. Revisa los errores arriba.")

