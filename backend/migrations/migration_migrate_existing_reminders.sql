-- Migration: Migrate existing appointments with auto_reminder_enabled to new reminders system
-- Description: Convert appointments with auto_reminder_enabled=True to new appointment_reminders table
-- Date: 2025-01-22

-- Migrate existing appointments with auto_reminder_enabled to new reminders system
-- This creates a reminder with reminder_number=1 for each appointment that had auto_reminder_enabled=True
INSERT INTO appointment_reminders (appointment_id, reminder_number, offset_minutes, enabled, sent, sent_at, created_at, updated_at)
SELECT 
    a.id as appointment_id,
    1 as reminder_number,
    COALESCE(a.auto_reminder_offset_minutes, 360) as offset_minutes,
    a.auto_reminder_enabled as enabled,
    a.reminder_sent as sent,
    a.reminder_sent_at as sent_at,
    a.created_at,
    a.updated_at
FROM appointments a
WHERE a.auto_reminder_enabled = TRUE
  AND NOT EXISTS (
    -- Avoid duplicates: don't migrate if reminder already exists
    SELECT 1 FROM appointment_reminders ar 
    WHERE ar.appointment_id = a.id AND ar.reminder_number = 1
  );

-- Log migration results
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM appointment_reminders
    WHERE reminder_number = 1;
    
    RAISE NOTICE 'Migration completed: % appointments migrated to new reminders system', migrated_count;
END $$;

-- Rollback instructions:
-- DELETE FROM appointment_reminders WHERE reminder_number = 1;

