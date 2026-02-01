-- Migration: Fix appointment schema conflict
-- This script fixes the conflict between appointment_type (string) and appointment_type_id (int)

-- First, let's check the current structure
-- The error shows that appointment_type column exists and is NOT NULL
-- But we're trying to insert appointment_type_id

-- Step 1: Add appointment_type_id column if it doesn't exist
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type_id INTEGER;

-- Step 2: Add office_id column if it doesn't exist  
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS office_id INTEGER;

-- Step 3: Create foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key for appointment_type_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_appointments_appointment_type' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT fk_appointments_appointment_type 
        FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id);
    END IF;

    -- Add foreign key for office_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_appointments_office' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT fk_appointments_office 
        FOREIGN KEY (office_id) REFERENCES offices(id);
    END IF;
END $$;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_type_id ON appointments(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_appointments_office_id ON appointments(office_id);

-- Step 5: Update existing records to have default values
-- Set appointment_type_id to 1 (Presencial) for existing records
UPDATE appointments 
SET appointment_type_id = 1 
WHERE appointment_type_id IS NULL;

-- Set office_id to 1 for existing records if they don't have an office
UPDATE appointments 
SET office_id = 1 
WHERE office_id IS NULL;

-- Step 6: Make appointment_type_id NOT NULL after setting default values
ALTER TABLE appointments ALTER COLUMN appointment_type_id SET NOT NULL;

-- Step 7: Drop the old appointment_type column if it exists
-- (This is optional - we can keep it for backward compatibility)
-- ALTER TABLE appointments DROP COLUMN IF EXISTS appointment_type;

-- Note: We're keeping the old appointment_type column for now to avoid breaking existing data
-- The new system will use appointment_type_id and office_id

