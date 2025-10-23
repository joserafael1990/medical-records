-- Migration: Update file_type column size from 50 to 100 characters
-- This fixes the issue where .docx files were being rejected due to MIME type length

-- Update the file_type column to allow longer MIME types
ALTER TABLE clinical_studies 
ALTER COLUMN file_type TYPE VARCHAR(100);

-- Add comment to document the change
COMMENT ON COLUMN clinical_studies.file_type IS 'MIME type of uploaded file (max 100 chars to support long MIME types like .docx)';
