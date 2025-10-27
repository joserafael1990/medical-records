≈-- Migration: Remove unnecessary fields from persons table
-- Date: 2025-01-27
-- Description: Remove unnecessary fields from persons table:
-- - chronic_conditions and current_medications (medical data)
-- - office_address, office_city, office_state_id, office_postal (moved to offices table)
-- - online_consultation_url (moved to offices table)
-- - username (using email instead)

-- Remove medical data fields
ALTER TABLE persons DROP COLUMN IF EXISTS chronic_conditions;
ALTER TABLE persons DROP COLUMN IF EXISTS current_medications;

-- Remove office-related fields (moved to offices table)
ALTER TABLE persons DROP COLUMN IF EXISTS office_address;
ALTER TABLE persons DROP COLUMN IF EXISTS office_city;
ALTER TABLE persons DROP COLUMN IF EXISTS office_state_id;
ALTER TABLE persons DROP COLUMN IF EXISTS office_postal;

-- Remove online consultation URL (moved to offices table)
ALTER TABLE persons DROP COLUMN IF EXISTS online_consultation_url;

-- Remove username field (using email instead)
ALTER TABLE persons DROP COLUMN IF EXISTS username;

-- Add comment to track the change
COMMENT ON TABLE persons IS 'Updated: Removed unnecessary fields on 2025-01-27 - chronic_conditions, current_medications, office fields, online_consultation_url, username';
