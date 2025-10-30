-- Add auto reminder fields to appointments
-- Rollback section at bottom

ALTER TABLE appointments 
    ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS auto_reminder_offset_minutes INTEGER NOT NULL DEFAULT 360,
    ADD COLUMN IF NOT EXISTS auto_reminder_sent_at TIMESTAMP NULL;

-- Index to speed up scheduler lookup
CREATE INDEX IF NOT EXISTS idx_appointments_auto_reminder_due 
    ON appointments (auto_reminder_enabled, auto_reminder_sent_at, appointment_date);

-- ROLLBACK
-- To rollback:
-- ALTER TABLE appointments DROP COLUMN IF EXISTS auto_reminder_enabled;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS auto_reminder_offset_minutes;
-- ALTER TABLE appointments DROP COLUMN IF EXISTS auto_reminder_sent_at;

