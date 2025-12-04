-- Fix for missing appointment_reminders table or constraint
-- This script ensures the table and constraint exist so Alembic migration d5be39ff35bc can proceed.

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS appointment_reminders (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL,
    reminder_number INTEGER NOT NULL,
    offset_minutes INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    sent BOOLEAN DEFAULT FALSE NOT NULL,
    sent_at TIMESTAMP,
    whatsapp_message_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Ensure the specific constraint exists (so migration can drop it)
-- We use a DO block to check if it exists first to avoid errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'appointment_reminders_appointment_id_reminder_number_key'
    ) THEN
        ALTER TABLE appointment_reminders 
        ADD CONSTRAINT appointment_reminders_appointment_id_reminder_number_key 
        UNIQUE (appointment_id, reminder_number);
    END IF;
END $$;
