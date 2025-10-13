-- Migration to clean up address fields
-- Remove unused address fields and rename address_street to home_address
-- Date: 2025-10-13

-- First, delete all patient records to avoid data conflicts with column changes
DELETE FROM medical_records WHERE patient_id IN (SELECT id FROM persons WHERE person_type = 'patient');
DELETE FROM appointments WHERE patient_id IN (SELECT id FROM persons WHERE person_type = 'patient');
DELETE FROM persons WHERE person_type = 'patient';

-- Remove unused address columns
ALTER TABLE persons DROP COLUMN IF EXISTS address_ext_number;
ALTER TABLE persons DROP COLUMN IF EXISTS address_int_number;
ALTER TABLE persons DROP COLUMN IF EXISTS address_neighborhood;

-- Rename address_street to home_address
ALTER TABLE persons RENAME COLUMN address_street TO home_address;

-- Verify the changes
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'persons' 
AND column_name IN ('address_ext_number', 'address_int_number', 'address_neighborhood', 'address_street', 'home_address')
ORDER BY column_name;
