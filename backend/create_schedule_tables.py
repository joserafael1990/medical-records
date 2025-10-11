#!/usr/bin/env python3
"""
Script para crear las tablas de schedule que faltan en la base de datos
"""

import os
import sys
from sqlalchemy import create_engine, text
from datetime import datetime

# Agregar el directorio del backend al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://historias_user:historias_pass@postgres-db:5432/historias_clinicas")

def create_schedule_tables():
    """Crear las tablas de schedule en la base de datos"""
    
    engine = create_engine(DATABASE_URL)
    
    # SQL para crear las tablas de schedule
    create_tables_sql = """
    -- Crear tabla schedule_templates
    CREATE TABLE IF NOT EXISTS schedule_templates (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER NOT NULL REFERENCES persons(id),
        day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
        start_time TIME,
        end_time TIME,
        consultation_duration INTEGER DEFAULT 30,
        break_duration INTEGER DEFAULT 0,
        lunch_start TIME,
        lunch_end TIME,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Crear tabla schedule_time_blocks
    CREATE TABLE IF NOT EXISTS schedule_time_blocks (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Crear tabla schedule_exceptions
    CREATE TABLE IF NOT EXISTS schedule_exceptions (
        id SERIAL PRIMARY KEY,
        template_id INTEGER NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
        exception_date DATE NOT NULL,
        start_time TIME,
        end_time TIME,
        is_active BOOLEAN DEFAULT FALSE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Crear índices para mejor rendimiento
    CREATE INDEX IF NOT EXISTS idx_schedule_templates_doctor_day ON schedule_templates(doctor_id, day_of_week);
    CREATE INDEX IF NOT EXISTS idx_schedule_time_blocks_template ON schedule_time_blocks(template_id);
    CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_template_date ON schedule_exceptions(template_id, exception_date);

    -- Crear trigger para actualizar updated_at automáticamente
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Aplicar trigger a las tablas
    DROP TRIGGER IF EXISTS update_schedule_templates_updated_at ON schedule_templates;
    CREATE TRIGGER update_schedule_templates_updated_at 
        BEFORE UPDATE ON schedule_templates 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_schedule_time_blocks_updated_at ON schedule_time_blocks;
    CREATE TRIGGER update_schedule_time_blocks_updated_at 
        BEFORE UPDATE ON schedule_time_blocks 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_schedule_exceptions_updated_at ON schedule_exceptions;
    CREATE TRIGGER update_schedule_exceptions_updated_at 
        BEFORE UPDATE ON schedule_exceptions 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    """
    
    try:
        with engine.connect() as connection:
            # Ejecutar el SQL para crear las tablas
            connection.execute(text(create_tables_sql))
            connection.commit()
            
        print("✅ Tablas de schedule creadas exitosamente!")
        
        # Verificar que las tablas se crearon
        with engine.connect() as connection:
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('schedule_templates', 'schedule_time_blocks', 'schedule_exceptions')
                ORDER BY table_name;
            """))
            
            tables = [row[0] for row in result]
            print(f"📊 Tablas creadas: {tables}")
            
    except Exception as e:
        print(f"❌ Error creando tablas de schedule: {e}")
        return False
        
    return True

if __name__ == "__main__":
    print("🔧 Creando tablas de schedule...")
    success = create_schedule_tables()
    
    if success:
        print("🎉 ¡Migración completada exitosamente!")
    else:
        print("💥 Error en la migración")
        sys.exit(1)

