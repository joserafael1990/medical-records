-- Migration: add avatar fields to persons table
-- Applies new columns to store doctor avatar metadata.
-- Rollback instructions are provided at the end of the file.

BEGIN;

ALTER TABLE persons
    ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(20) DEFAULT 'initials';

ALTER TABLE persons
    ADD COLUMN IF NOT EXISTS avatar_template_key VARCHAR(100);

ALTER TABLE persons
    ADD COLUMN IF NOT EXISTS avatar_file_path VARCHAR(255);

COMMIT;

-- Rollback (execute manually if needed):
-- BEGIN;
-- ALTER TABLE persons DROP COLUMN IF EXISTS avatar_file_path;
-- ALTER TABLE persons DROP COLUMN IF EXISTS avatar_template_key;
-- ALTER TABLE persons DROP COLUMN IF EXISTS avatar_type;
-- COMMIT;

