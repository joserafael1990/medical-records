#!/usr/bin/env python3
"""
Migration script to add new fields to medical_records table for first-time consultations
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import DATABASE_URL

def run_migration():
    """
    Add new fields to medical_records table for enhanced consultation data
    """
    print("🔄 Iniciando migración para agregar campos de consulta de primera vez...")
    
    try:
        # Create database connection
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            # Start transaction
            trans = connection.begin()
            
            try:
                # Check if fields already exist
                result = connection.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'medical_records' 
                    AND column_name IN ('family_story', 'personal_pathological_story', 'personal_non_pathological_story')
                """))
                
                existing_columns = [row[0] for row in result.fetchall()]
                
                if existing_columns:
                    print(f"⚠️  Los siguientes campos ya existen: {existing_columns}")
                    print("✅ Migración no necesaria")
                    return
                
                # Add new fields
                print("📝 Agregando campo: family_story")
                connection.execute(text("""
                    ALTER TABLE medical_records 
                    ADD COLUMN family_story TEXT
                """))
                
                print("📝 Agregando campo: personal_pathological_story")
                connection.execute(text("""
                    ALTER TABLE medical_records 
                    ADD COLUMN personal_pathological_story TEXT
                """))
                
                print("📝 Agregando campo: personal_non_pathological_story")
                connection.execute(text("""
                    ALTER TABLE medical_records 
                    ADD COLUMN personal_non_pathological_story TEXT
                """))
                
                # Commit transaction
                trans.commit()
                print("✅ Migración completada exitosamente")
                
                # Verify the changes
                result = connection.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'medical_records' 
                    AND column_name IN ('family_story', 'personal_pathological_story', 'personal_non_pathological_story')
                    ORDER BY column_name
                """))
                
                print("\n📋 Campos agregados:")
                for row in result.fetchall():
                    print(f"   - {row[0]}: {row[1]}")
                
            except Exception as e:
                trans.rollback()
                print(f"❌ Error durante la migración: {e}")
                raise
                
    except Exception as e:
        print(f"❌ Error de conexión a la base de datos: {e}")
        raise

if __name__ == "__main__":
    run_migration()
