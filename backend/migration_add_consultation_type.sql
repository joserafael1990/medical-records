-- Migration: Add consultation_type field to medical_records table
-- Date: 2025-10-16
-- Description: Add consultation_type field to distinguish between "Primera vez" and "Seguimiento" consultations

-- Add consultation_type column to medical_records table
ALTER TABLE medical_records 
ADD COLUMN consultation_type VARCHAR(50) DEFAULT 'Seguimiento';

-- Update existing records to have 'Seguimiento' as default
UPDATE medical_records 
SET consultation_type = 'Seguimiento' 
WHERE consultation_type IS NULL;

-- Add comment to the column
COMMENT ON COLUMN medical_records.consultation_type IS 'Type of consultation: Primera vez or Seguimiento';
