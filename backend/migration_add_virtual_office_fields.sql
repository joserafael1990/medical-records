-- Migration: Add virtual office fields
-- Add support for virtual offices with URL

-- Add virtual office fields to offices table
ALTER TABLE offices ADD COLUMN is_virtual BOOLEAN DEFAULT FALSE;
ALTER TABLE offices ADD COLUMN virtual_url VARCHAR(500);

-- Add index for virtual offices
CREATE INDEX idx_offices_is_virtual ON offices(is_virtual);

-- Add comment for documentation
COMMENT ON COLUMN offices.is_virtual IS 'Indicates if this is a virtual office for online consultations';
COMMENT ON COLUMN offices.virtual_url IS 'URL for virtual office (Zoom, Teams, etc.)';

