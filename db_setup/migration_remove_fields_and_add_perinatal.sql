-- ============================================================================
-- MIGRACIÓN: Eliminar campos innecesarios y agregar perinatal_history
-- ============================================================================
-- Fecha: 2025-11-03
-- Descripción: 
--   - Elimina campos innecesarios de múltiples tablas
--   - Agrega campo perinatal_history a medical_records
-- ============================================================================

-- ============================================================================
-- TABLA: appointments
-- ============================================================================
-- Eliminar campos: room_number, follow_up_date, follow_up_required, confirmed_at, appointment_code, auto_reminder_sent_at

ALTER TABLE appointments DROP COLUMN IF EXISTS room_number;
ALTER TABLE appointments DROP COLUMN IF EXISTS follow_up_date;
ALTER TABLE appointments DROP COLUMN IF EXISTS follow_up_required;
ALTER TABLE appointments DROP COLUMN IF EXISTS confirmed_at;
ALTER TABLE appointments DROP COLUMN IF EXISTS appointment_code;
ALTER TABLE appointments DROP COLUMN IF EXISTS auto_reminder_sent_at;

-- ============================================================================
-- TABLA: person_documents
-- ============================================================================
-- Eliminar campos: issue_date, expiration_date, issuing_authority

ALTER TABLE person_documents DROP COLUMN IF EXISTS issue_date;
ALTER TABLE person_documents DROP COLUMN IF EXISTS expiration_date;
ALTER TABLE person_documents DROP COLUMN IF EXISTS issuing_authority;

-- ============================================================================
-- TABLA: clinical_studies
-- ============================================================================
-- Eliminar campos: institution, performing_doctor, interpretation, relevant_history, results_text, study_description

ALTER TABLE clinical_studies DROP COLUMN IF EXISTS institution;
ALTER TABLE clinical_studies DROP COLUMN IF EXISTS performing_doctor;
ALTER TABLE clinical_studies DROP COLUMN IF EXISTS interpretation;
ALTER TABLE clinical_studies DROP COLUMN IF EXISTS relevant_history;
ALTER TABLE clinical_studies DROP COLUMN IF EXISTS results_text;
ALTER TABLE clinical_studies DROP COLUMN IF EXISTS study_description;

-- ============================================================================
-- TABLA: diagnosis_categories
-- ============================================================================
-- Eliminar campos: code, description

ALTER TABLE diagnosis_categories DROP COLUMN IF EXISTS code;
ALTER TABLE diagnosis_categories DROP COLUMN IF EXISTS description;

-- ============================================================================
-- TABLA: consultation_vital_signs
-- ============================================================================
-- Eliminar campo: notes

ALTER TABLE consultation_vital_signs DROP COLUMN IF EXISTS notes;

-- ============================================================================
-- TABLA: medical_records
-- ============================================================================
-- Eliminar campos: record_code, prognosis, differential_diagnosis, imaging_results, laboratory_analysis
-- Agregar campo: perinatal_history TEXT NOT NULL

ALTER TABLE medical_records DROP COLUMN IF EXISTS record_code;
ALTER TABLE medical_records DROP COLUMN IF EXISTS prognosis;
ALTER TABLE medical_records DROP COLUMN IF EXISTS differential_diagnosis;
ALTER TABLE medical_records DROP COLUMN IF EXISTS imaging_results;
ALTER TABLE medical_records DROP COLUMN IF EXISTS laboratory_analysis;

-- Agregar campo perinatal_history después de family_history
-- Primero verificar si existe, si no existe agregarlo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medical_records' 
        AND column_name = 'perinatal_history'
    ) THEN
        ALTER TABLE medical_records 
        ADD COLUMN perinatal_history TEXT NOT NULL DEFAULT '';
        
        -- Remover el default después de agregar la columna
        ALTER TABLE medical_records 
        ALTER COLUMN perinatal_history DROP DEFAULT;
    END IF;
END $$;

-- Verificar cambios
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'medical_records' 
-- ORDER BY ordinal_position;

