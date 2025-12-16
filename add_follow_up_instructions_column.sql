-- Add missing follow_up_instructions column to medical_records table
-- This fixes the error: column medical_records.follow_up_instructions does not exist

-- Add follow_up_instructions column (nullable=False, default="")
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS follow_up_instructions TEXT NOT NULL DEFAULT '';

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'medical_records' 
AND column_name = 'follow_up_instructions';

