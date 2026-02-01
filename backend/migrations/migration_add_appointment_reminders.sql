-- Migration: Add appointment_reminders table
-- Description: Create table to support up to 3 automatic reminders per appointment
-- Date: 2025-01-22

-- Create appointment_reminders table
CREATE TABLE IF NOT EXISTS appointment_reminders (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_number INTEGER NOT NULL CHECK (reminder_number >= 1 AND reminder_number <= 3),
    offset_minutes INTEGER NOT NULL CHECK (offset_minutes > 0),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sent BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique reminder_number per appointment
    UNIQUE(appointment_id, reminder_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_id ON appointment_reminders(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_enabled_sent ON appointment_reminders(enabled, sent) WHERE enabled = TRUE AND sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_status ON appointment_reminders(appointment_id) WHERE enabled = TRUE AND sent = FALSE;

-- Add comment to table
COMMENT ON TABLE appointment_reminders IS 'Stores up to 3 automatic reminders per appointment. Each reminder can be enabled/disabled independently and has a custom offset_minutes (time before appointment).';

-- Rollback instructions:
-- DROP TABLE IF EXISTS appointment_reminders;

