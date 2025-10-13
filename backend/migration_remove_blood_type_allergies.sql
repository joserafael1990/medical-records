-- Migration to remove blood_type and allergies columns from persons table
-- This will also clear all patient data to avoid conflicts
-- Date: 2025-10-13

-- First, delete all related records to avoid foreign key constraints
DELETE FROM medical_records WHERE patient_id IN (SELECT id FROM persons WHERE person_type = 'patient');
DELETE FROM appointments WHERE patient_id IN (SELECT id FROM persons WHERE person_type = 'patient');

-- Then delete all patient records
DELETE FROM persons WHERE person_type = 'patient';

-- Remove blood_type column
ALTER TABLE persons DROP COLUMN IF EXISTS blood_type;

-- Remove allergies column  
ALTER TABLE persons DROP COLUMN IF EXISTS allergies;

-- Verify the columns have been removed and patients are deleted
SELECT 
    COUNT(*) as patient_count,
    column_name 
FROM information_schema.columns 
WHERE table_name = 'persons' 
AND column_name IN ('blood_type', 'allergies')
GROUP BY column_name;

-- Show remaining patient count (should be 0)
SELECT COUNT(*) as remaining_patients FROM persons WHERE person_type = 'patient';