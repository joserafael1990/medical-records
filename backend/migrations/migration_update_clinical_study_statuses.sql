-- Migration: Update clinical study statuses
-- Description: Remove deprecated statuses (in_progress, cancelled, failed) and migrate existing records to 'ordered'
-- Date: 2025-01-22

-- Update existing studies with deprecated statuses to 'ordered'
UPDATE clinical_studies
SET status = 'ordered'
WHERE status IN ('in_progress', 'cancelled', 'failed');

-- Verify the update
-- SELECT status, COUNT(*) FROM clinical_studies GROUP BY status;

-- Rollback instructions:
-- Note: This migration cannot be fully rolled back as we don't know which studies originally had which status
-- If rollback is needed, you would need to restore from a backup taken before this migration

