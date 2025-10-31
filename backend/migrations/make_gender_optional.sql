-- ============================================================================
-- MIGRATION: Make gender field optional in persons table
-- ============================================================================
-- Purpose: Allow NULL values for gender field to support creating patients
--          without gender information (e.g., from appointment dialog)
-- Date: 2025-10-31
-- ============================================================================

-- Make gender column nullable
ALTER TABLE persons ALTER COLUMN gender DROP NOT NULL;

-- Add comment to document the change
COMMENT ON COLUMN persons.gender IS 'Optional field. Can be NULL when creating patients from appointment dialogs or when patient prefers not to specify.';

-- Rollback instructions:
-- ALTER TABLE persons ALTER COLUMN gender SET NOT NULL;

