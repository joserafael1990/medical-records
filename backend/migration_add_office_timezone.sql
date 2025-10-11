-- Migration: Add office_timezone field to persons table
-- This field will store the timezone for the doctor's office

-- Add the office_timezone column to persons table
ALTER TABLE persons 
ADD COLUMN office_timezone VARCHAR(50) DEFAULT 'America/Mexico_City';

-- Add a comment to explain the field
COMMENT ON COLUMN persons.office_timezone IS 'Timezone for the doctor office (e.g., America/Mexico_City, America/New_York, Europe/Madrid)';

-- Update existing doctors to have Mexico City timezone as default
UPDATE persons 
SET office_timezone = 'America/Mexico_City' 
WHERE person_type = 'doctor' AND office_timezone IS NULL;


