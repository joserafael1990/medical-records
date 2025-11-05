-- ============================================================================
-- MIGRATION: Simplificar tabla medications y eliminar medication_name
-- Sistema de Historias Clínicas Electrónicas
-- ============================================================================

-- Paso 1: Eliminar medication_name de consultation_prescriptions
ALTER TABLE consultation_prescriptions DROP COLUMN IF EXISTS medication_name;

-- Paso 2: Eliminar todos los registros de medications (se insertarán nuevos)
TRUNCATE TABLE medications RESTART IDENTITY CASCADE;

-- Paso 3: Eliminar columnas innecesarias de medications
ALTER TABLE medications 
    DROP COLUMN IF EXISTS code,
    DROP COLUMN IF EXISTS generic_name,
    DROP COLUMN IF EXISTS dosage_form,
    DROP COLUMN IF EXISTS strength,
    DROP COLUMN IF EXISTS manufacturer,
    DROP COLUMN IF EXISTS active_ingredient,
    DROP COLUMN IF EXISTS indications,
    DROP COLUMN IF EXISTS contraindications,
    DROP COLUMN IF EXISTS side_effects,
    DROP COLUMN IF EXISTS dosage_instructions;

-- Paso 4: Agregar columna created_by si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medications' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE medications ADD COLUMN created_by INTEGER REFERENCES persons(id) DEFAULT 0;
    END IF;
END $$;

-- Paso 5: Asegurar que is_active existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medications' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE medications ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Paso 6: Asegurar que name es UNIQUE
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'medications' AND constraint_name = 'medications_name_key'
    ) THEN
        ALTER TABLE medications ADD CONSTRAINT medications_name_key UNIQUE (name);
    END IF;
END $$;

-- Paso 7: Insertar los 1000 medicamentos nuevos
\i db_setup/06_insert_medications_1000.sql

