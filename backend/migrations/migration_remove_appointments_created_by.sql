-- Migration: Remove created_by column from appointments table
-- Date: 2025-01-07
-- Reason: Field is not used, all records have NULL values, and doctor_id already identifies the doctor

-- Step 1: Drop the foreign key constraint
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_created_by_fkey;

-- Step 2: Drop the column
ALTER TABLE appointments 
DROP COLUMN IF EXISTS created_by;

-- Verification query (run after migration):
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'appointments' AND column_name = 'created_by';
-- Should return 0 rows

-- Rollback (if needed):
-- ALTER TABLE appointments ADD COLUMN created_by INTEGER;
-- ALTER TABLE appointments ADD CONSTRAINT appointments_created_by_fkey 
--     FOREIGN KEY (created_by) REFERENCES persons(id);

