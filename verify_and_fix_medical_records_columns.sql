-- Comprehensive script to verify and add missing columns to medical_records table
-- Based on the MedicalRecord model definition

-- 1. Add follow_up_instructions (if not already added)
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS follow_up_instructions TEXT NOT NULL DEFAULT '';

-- 2. Add patient_document_id (if not already added)
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS patient_document_id INTEGER;

-- Add foreign key constraint for patient_document_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'medical_records_patient_document_id_fkey'
    ) THEN
        ALTER TABLE medical_records 
        ADD CONSTRAINT medical_records_patient_document_id_fkey 
        FOREIGN KEY (patient_document_id) REFERENCES documents(id);
    END IF;
END $$;

-- 3. Add patient_document_value (if not already added)
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS patient_document_value VARCHAR(255);

-- 4. Create index for patient_document_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_document 
ON medical_records(patient_document_id);

-- Verify all expected columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN (
            'id', 'patient_id', 'doctor_id', 'consultation_date',
            'patient_document_id', 'patient_document_value',
            'chief_complaint', 'history_present_illness', 'family_history',
            'perinatal_history', 'gynecological_and_obstetric_history',
            'personal_pathological_history', 'personal_non_pathological_history',
            'physical_examination', 'primary_diagnosis', 'treatment_plan',
            'follow_up_instructions', 'consultation_type',
            'secondary_diagnoses', 'prescribed_medications',
            'laboratory_results', 'notes',
            'created_at', 'updated_at', 'created_by'
        ) THEN 'Expected'
        ELSE 'Unexpected'
    END as status
FROM information_schema.columns 
WHERE table_name = 'medical_records' 
ORDER BY column_name;

-- Check for missing expected columns
SELECT 
    'MISSING: ' || col_name as issue
FROM (
    VALUES 
        ('id'), ('patient_id'), ('doctor_id'), ('consultation_date'),
        ('patient_document_id'), ('patient_document_value'),
        ('chief_complaint'), ('history_present_illness'), ('family_history'),
        ('perinatal_history'), ('gynecological_and_obstetric_history'),
        ('personal_pathological_history'), ('personal_non_pathological_history'),
        ('physical_examination'), ('primary_diagnosis'), ('treatment_plan'),
        ('follow_up_instructions'), ('consultation_type'),
        ('secondary_diagnoses'), ('prescribed_medications'),
        ('laboratory_results'), ('notes'),
        ('created_at'), ('updated_at'), ('created_by')
) AS expected(col_name)
WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medical_records' 
    AND column_name = expected.col_name
);

