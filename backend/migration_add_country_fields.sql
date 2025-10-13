-- Migration to add country fields to persons table
-- Date: 2025-10-13

-- Add country fields to persons table
ALTER TABLE persons ADD COLUMN IF NOT EXISTS address_country_id INTEGER REFERENCES countries(id);
ALTER TABLE persons ADD COLUMN IF NOT EXISTS birth_country_id INTEGER REFERENCES countries(id);

-- Add comments for documentation
COMMENT ON COLUMN persons.address_country_id IS 'Country ID for address location';
COMMENT ON COLUMN persons.birth_country_id IS 'Country ID for birth location';
