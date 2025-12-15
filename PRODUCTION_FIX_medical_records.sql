-- ============================================================================
-- PRODUCTION FIX: Add missing columns to medical_records table
-- Run this in your production database
-- ============================================================================

-- Add follow_up_instructions column (with default value for existing records)
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS follow_up_instructions TEXT NOT NULL DEFAULT '';

-- Add patient document reference columns
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS patient_document_id INTEGER REFERENCES documents(id);

ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS patient_document_value VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN medical_records.follow_up_instructions IS 'Instrucciones de seguimiento para el paciente';
COMMENT ON COLUMN medical_records.patient_document_id IS 'Referencia al documento de identidad del paciente usado en esta consulta';
COMMENT ON COLUMN medical_records.patient_document_value IS 'Valor del documento de identidad (guardado para referencia histórica)';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'medical_records'
AND column_name IN ('follow_up_instructions', 'patient_document_id', 'patient_document_value')
ORDER BY column_name;
