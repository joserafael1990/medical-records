-- Migration: Make birth_date optional in persons table
-- Date: 2025-10-22
-- Description: Allow NULL values for birth_date since it should be optional for patient registration

-- Remove NOT NULL constraint from birth_date
ALTER TABLE persons ALTER COLUMN birth_date DROP NOT NULL;

-- Verification query (run after migration to verify)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'persons' AND column_name = 'birth_date';

