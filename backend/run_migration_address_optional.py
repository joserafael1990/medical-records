#!/usr/bin/env python3
"""
Script to run the address fields migration
Makes address fields optional by removing NOT NULL constraints
"""

import psycopg2
import os
from pathlib import Path

def run_migration():
    """Execute the address fields migration"""
    try:
        # Database connection parameters
        DB_CONFIG = {
            'host': 'localhost',
            'port': 5432,
            'database': 'historias_clinicas',
            'user': 'historias_user',
            'password': 'historias_pass'
        }
        
        # Read migration SQL
        script_dir = Path(__file__).parent
        migration_file = script_dir / "migration_address_optional.sql"
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        # Connect and execute migration
        print("🔗 Conectando a la base de datos...")
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        print("📝 Ejecutando migración para hacer campos de domicilio opcionales...")
        cursor.execute(migration_sql)
        
        conn.commit()
        print("✅ Migración ejecutada exitosamente!")
        
        # Now check the current state of address fields
        print("\n📊 VERIFICANDO ESTADO ACTUAL DE LOS CAMPOS:")
        print("=" * 60)
        
        check_query = """
        SELECT 
            column_name, 
            is_nullable, 
            data_type 
        FROM information_schema.columns 
        WHERE table_name = 'persons' 
            AND column_name IN (
                'address_street', 
                'address_ext_number', 
                'address_int_number',
                'address_neighborhood', 
                'address_city', 
                'address_state_id', 
                'address_postal_code'
            )
        ORDER BY column_name;
        """
        
        cursor.execute(check_query)
        results = cursor.fetchall()
        
        if results:
            for row in results:
                column_name, is_nullable, data_type = row
                status = "✅ OPCIONAL" if is_nullable == 'YES' else "❌ OBLIGATORIO"
                print(f"{column_name:20} | {data_type:15} | {status}")
        else:
            print("❌ No se encontraron campos de domicilio en la tabla persons")
        
        print("\n🎉 ¡Migración completada exitosamente!")
        print("📝 Los campos de domicilio ahora son opcionales en la base de datos.")
        
    except psycopg2.Error as e:
        print(f"❌ Error de base de datos: {e}")
        if 'conn' in locals():
            conn.rollback()
    except FileNotFoundError:
        print(f"❌ Archivo de migración no encontrado: {migration_file}")
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    run_migration()
