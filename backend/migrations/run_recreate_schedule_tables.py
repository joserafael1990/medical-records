#!/usr/bin/env python3
"""
Script para recrear las tablas de horarios del doctor
Ejecuta el archivo SQL: recreate_schedule_tables.sql

Uso:
    python backend/migrations/run_recreate_schedule_tables.py
    
    O con datos de ejemplo:
    python backend/migrations/run_recreate_schedule_tables.py --with-sample-data
"""

import sys
import os
from pathlib import Path

# Agregar el directorio backend al path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from database import engine, SessionLocal
from datetime import time
import argparse

def recreate_schedule_tables(include_sample_data: bool = False):
    """
    Recrea las tablas de horarios del doctor
    
    Args:
        include_sample_data: Si es True, inserta datos de ejemplo para thiago@avant.com
    """
    
    print("🔧 Recreando tablas de horarios del doctor...")
    print("=" * 70)
    
    try:
        with engine.connect() as connection:
            # Leer el archivo SQL
            sql_file = Path(__file__).parent / "recreate_schedule_tables.sql"
            
            if not sql_file.exists():
                raise FileNotFoundError(f"No se encontró el archivo SQL: {sql_file}")
            
            with open(sql_file, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            # Dividir el contenido en statements individuales
            # Ignorar comentarios y comandos \d (que son de psql, no SQL estándar)
            statements = []
            current_statement = []
            
            for line in sql_content.split('\n'):
                # Ignorar líneas vacías, comentarios, y comandos de psql
                if (not line.strip() or 
                    line.strip().startswith('--') or 
                    line.strip().startswith('/*') or
                    line.strip().startswith('*/') or
                    line.strip().startswith('\\d')):
                    continue
                
                current_statement.append(line)
                
                # Si la línea termina con punto y coma, ejecutar el statement
                if line.strip().endswith(';'):
                    statement = '\n'.join(current_statement)
                    if statement.strip():
                        statements.append(statement)
                    current_statement = []
            
            # Ejecutar cada statement
            for i, statement in enumerate(statements, 1):
                try:
                    # Ignorar el último SELECT (verificación manual)
                    if 'pg_tables' in statement.lower():
                        print(f"\n📊 Verificando tablas creadas...")
                        result = connection.execute(text(statement))
                        for row in result:
                            print(f"   ✅ Tabla: {row[0]} (schema: {row[1]})")
                    else:
                        connection.execute(text(statement))
                        
                        # Identificar el tipo de statement
                        if 'DROP TABLE' in statement.upper():
                            table_name = statement.split('IF EXISTS')[1].split('CASCADE')[0].strip()
                            print(f"🗑️  Eliminada tabla: {table_name}")
                        elif 'CREATE TABLE' in statement.upper():
                            table_name = statement.split('CREATE TABLE')[1].split('(')[0].strip()
                            print(f"✅ Creada tabla: {table_name}")
                        elif 'CREATE INDEX' in statement.upper():
                            index_name = statement.split('CREATE INDEX')[1].split('ON')[0].strip()
                            print(f"📑 Creado índice: {index_name}")
                        elif 'COMMENT ON' in statement.upper():
                            pass  # No mostrar cada comentario
                        
                except Exception as e:
                    print(f"⚠️  Error en statement {i}: {e}")
                    # Continuar con los demás statements
            
            connection.commit()
            print("\n✅ Tablas de horarios recreadas exitosamente!")
            
            # Si se solicitó, insertar datos de ejemplo
            if include_sample_data:
                print("\n📝 Insertando datos de ejemplo para thiago@avant.com...")
                insert_sample_data(connection)
            
    except Exception as e:
        print(f"\n❌ Error al recrear tablas: {e}")
        raise

def insert_sample_data(connection):
    """
    Inserta datos de ejemplo para el doctor thiago@avant.com
    """
    try:
        # Buscar el doctor
        result = connection.execute(text("""
            SELECT id FROM persons 
            WHERE email = 'thiago@avant.com' 
            AND person_type = 'doctor'
            LIMIT 1
        """))
        
        doctor = result.fetchone()
        
        if not doctor:
            print("⚠️  No se encontró el doctor thiago@avant.com")
            return
        
        doctor_id = doctor[0]
        print(f"✅ Doctor encontrado (ID: {doctor_id})")
        
        # Insertar horarios de Lunes a Viernes
        for day in range(5):  # 0=Lunes, 4=Viernes
            connection.execute(text("""
                INSERT INTO schedule_templates 
                (doctor_id, day_of_week, start_time, end_time, consultation_duration, break_duration, lunch_start, lunch_end, is_active)
                VALUES 
                (:doctor_id, :day, '09:00', '18:00', 30, 5, '14:00', '15:00', TRUE)
            """), {
                'doctor_id': doctor_id,
                'day': day
            })
        
        print("✅ Horarios Lunes-Viernes: 9:00 - 18:00 (almuerzo 14:00-15:00)")
        
        # Insertar horario de Sábado
        connection.execute(text("""
            INSERT INTO schedule_templates 
            (doctor_id, day_of_week, start_time, end_time, consultation_duration, break_duration, is_active)
            VALUES 
            (:doctor_id, 5, '09:00', '14:00', 30, 5, TRUE)
        """), {'doctor_id': doctor_id})
        
        print("✅ Horario Sábado: 9:00 - 14:00")
        
        connection.commit()
        print("\n✅ Datos de ejemplo insertados exitosamente!")
        
    except Exception as e:
        print(f"❌ Error al insertar datos de ejemplo: {e}")
        connection.rollback()
        raise

def verify_tables():
    """
    Verifica que las tablas se hayan creado correctamente
    """
    print("\n🔍 Verificando tablas creadas...")
    print("=" * 70)
    
    with engine.connect() as connection:
        # Verificar tablas
        result = connection.execute(text("""
            SELECT tablename 
            FROM pg_tables 
            WHERE tablename LIKE 'schedule%' 
            ORDER BY tablename
        """))
        
        tables = [row[0] for row in result]
        
        if len(tables) == 3:
            print(f"✅ Las 3 tablas de horarios están creadas:")
            for table in tables:
                # Contar registros
                count_result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = count_result.scalar()
                print(f"   • {table}: {count} registros")
        else:
            print(f"⚠️  Se encontraron {len(tables)} tablas (se esperaban 3)")
            for table in tables:
                print(f"   • {table}")

def main():
    """
    Función principal
    """
    parser = argparse.ArgumentParser(description='Recrear tablas de horarios del doctor')
    parser.add_argument(
        '--with-sample-data',
        action='store_true',
        help='Insertar datos de ejemplo para thiago@avant.com'
    )
    
    args = parser.parse_args()
    
    print("\n" + "=" * 70)
    print("🏥 RECREACIÓN DE TABLAS DE HORARIOS DEL DOCTOR")
    print("=" * 70)
    
    try:
        # Recrear tablas
        recreate_schedule_tables(include_sample_data=args.with_sample_data)
        
        # Verificar
        verify_tables()
        
        print("\n" + "=" * 70)
        print("✅ PROCESO COMPLETADO EXITOSAMENTE")
        print("=" * 70)
        
        print("\n📋 PRÓXIMOS PASOS:")
        print("   1. Las tablas están listas para usar")
        print("   2. Puedes configurar horarios desde el frontend")
        print("   3. O insertar más datos con SQL si lo prefieres")
        
        if not args.with_sample_data:
            print("\n💡 TIP: Ejecuta con --with-sample-data para insertar horarios de ejemplo")
        
    except Exception as e:
        print("\n" + "=" * 70)
        print("❌ ERROR EN EL PROCESO")
        print("=" * 70)
        print(f"\n{e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

