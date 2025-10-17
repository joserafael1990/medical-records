-- Migration: Add laboratory_analysis field to medical_records table
-- Date: 2024-01-XX
-- Description: Add field to store laboratory analysis results that patients bring to consultation

-- Add laboratory_analysis column to medical_records table
ALTER TABLE medical_records 
ADD COLUMN laboratory_analysis TEXT;

-- Add comment to document the field
COMMENT ON COLUMN medical_records.laboratory_analysis IS 'Laboratory analysis results that the patient brought to the consultation';

