-- Migration: Add avatar configuration fields to persons table
-- Run: psql -U historias_user -d historias_clinicas -f migration_add_avatar_fields.sql

BEGIN;

ALTER TABLE persons
    ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(20) DEFAULT 'initials',
    ADD COLUMN IF NOT EXISTS avatar_template_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS avatar_file_path VARCHAR(255);

-- Optional rollback instructions:
-- To rollback manually, execute:
-- ALTER TABLE persons DROP COLUMN IF EXISTS avatar_file_path;
-- ALTER TABLE persons DROP COLUMN IF EXISTS avatar_template_key;
-- ALTER TABLE persons DROP COLUMN IF EXISTS avatar_type;

COMMIT;

