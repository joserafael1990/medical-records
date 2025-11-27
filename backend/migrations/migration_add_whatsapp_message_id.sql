-- Migration: Add whatsapp_message_id to appointment_reminders
-- Description: Store WhatsApp message_id to eliminate ambiguity when processing button replies
-- Date: 2025-11-21

ALTER TABLE appointment_reminders
ADD COLUMN whatsapp_message_id VARCHAR(255) NULL;

CREATE INDEX idx_appointment_reminders_whatsapp_message_id ON appointment_reminders(whatsapp_message_id);

-- Rollback instructions:
-- ALTER TABLE appointment_reminders DROP COLUMN whatsapp_message_id;
-- DROP INDEX IF EXISTS idx_appointment_reminders_whatsapp_message_id;

