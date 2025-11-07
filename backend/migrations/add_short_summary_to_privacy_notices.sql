-- ============================================================================
-- Migration: add_short_summary_to_privacy_notices.sql
-- Purpose : Ensure privacy_notices table has short_summary column
-- Author  : Cursor AI
-- ============================================================================

BEGIN;

-- Add column if it does not exist (idempotent)
ALTER TABLE privacy_notices
    ADD COLUMN IF NOT EXISTS short_summary TEXT;

-- Initialize existing rows to empty string when null
UPDATE privacy_notices
SET short_summary = COALESCE(short_summary, '')
WHERE short_summary IS NULL;

COMMIT;

/* ===========================================================================
   ROLLBACK
   ===========================================================================
   To rollback this change, run:

   ALTER TABLE privacy_notices
       DROP COLUMN IF EXISTS short_summary;

   ===========================================================================
*/

