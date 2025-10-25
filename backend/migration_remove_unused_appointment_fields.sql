-- Migration to remove unused fields from appointments table
-- Fields to remove: preparation_instructions, appointment_type, estimated_cost, confirmation_required, insurance_covered

-- Remove unused columns from appointments table
ALTER TABLE appointments DROP COLUMN IF EXISTS preparation_instructions;
ALTER TABLE appointments DROP COLUMN IF EXISTS appointment_type;
ALTER TABLE appointments DROP COLUMN IF EXISTS estimated_cost;
ALTER TABLE appointments DROP COLUMN IF EXISTS confirmation_required;
ALTER TABLE appointments DROP COLUMN IF EXISTS insurance_covered;

-- Add comment to document the changes
COMMENT ON TABLE appointments IS 'Appointments table - cleaned up unused fields on 2025-10-25';
