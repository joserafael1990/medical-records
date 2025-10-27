-- Migration: Remove unnecessary fields from persons table
-- Date: 2025-01-27
-- Description: Remove fields that are duplicated in offices table or unnecessary

-- Remove chronic conditions and current medications fields
ALTER TABLE persons DROP COLUMN IF EXISTS chronic_conditions;
ALTER TABLE persons DROP COLUMN IF EXISTS current_medications;

-- Remove office-related fields (they exist in offices table)
ALTER TABLE persons DROP COLUMN IF EXISTS office_address;
ALTER TABLE persons DROP COLUMN IF EXISTS office_city;
ALTER TABLE persons DROP COLUMN IF EXISTS office_state_id;
ALTER TABLE persons DROP COLUMN IF EXISTS office_postal_code;
ALTER TABLE persons DROP COLUMN IF EXISTS office_phone;
ALTER TABLE persons DROP COLUMN IF EXISTS office_timezone;
ALTER TABLE persons DROP COLUMN IF EXISTS online_consultation_url;

-- Remove username field (using email instead)
ALTER TABLE persons DROP COLUMN IF EXISTS username;

-- Add comment to track the changes
COMMENT ON TABLE persons IS 'Updated: Removed unnecessary fields on 2025-01-27 - chronic_conditions, current_medications, office fields, username';
