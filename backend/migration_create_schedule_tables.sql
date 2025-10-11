-- Migration: Create schedule management tables
-- This creates the tables needed for schedule templates and exceptions

-- Create schedule_templates table
CREATE TABLE IF NOT EXISTS schedule_templates (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    consultation_duration INTEGER DEFAULT 30 CHECK (consultation_duration >= 15 AND consultation_duration <= 120),
    break_duration INTEGER DEFAULT 10 CHECK (break_duration >= 0 AND break_duration <= 60),
    lunch_start TIME,
    lunch_end TIME,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one template per doctor per day
    UNIQUE(doctor_id, day_of_week)
);

-- Create schedule_exceptions table
CREATE TABLE IF NOT EXISTS schedule_exceptions (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES schedule_templates(id) ON DELETE SET NULL,
    exception_date DATE NOT NULL,
    exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('vacation', 'holiday', 'sick_leave', 'custom')),
    start_time TIME,
    end_time TIME,
    is_day_off BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one exception per doctor per date
    UNIQUE(doctor_id, exception_date)
);

-- Create schedule_slots table (for generated time slots)
CREATE TABLE IF NOT EXISTS schedule_slots (
    id SERIAL PRIMARY KEY,
    doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    slot_date TIMESTAMP WITH TIME ZONE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    is_blocked BOOLEAN DEFAULT false,
    slot_type VARCHAR(30) DEFAULT 'consultation' CHECK (slot_type IN ('consultation', 'break', 'lunch', 'blocked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_templates_doctor_day ON schedule_templates(doctor_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_doctor_date ON schedule_exceptions(doctor_id, exception_date);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_doctor_date ON schedule_slots(doctor_id, slot_date);

-- Add comments to tables
COMMENT ON TABLE schedule_templates IS 'Templates for weekly work schedules by doctor and day';
COMMENT ON TABLE schedule_exceptions IS 'Exceptions to regular schedule (holidays, vacations, etc.)';
COMMENT ON TABLE schedule_slots IS 'Generated time slots for appointments';

-- Add comments to key columns
COMMENT ON COLUMN schedule_templates.day_of_week IS 'Day of week: 0=Monday, 1=Tuesday, ..., 6=Sunday';
COMMENT ON COLUMN schedule_templates.consultation_duration IS 'Duration of each consultation in minutes';
COMMENT ON COLUMN schedule_templates.break_duration IS 'Break time between consultations in minutes';
COMMENT ON COLUMN schedule_exceptions.exception_type IS 'Type of exception: vacation, holiday, sick_leave, custom';
COMMENT ON COLUMN schedule_slots.slot_type IS 'Type of time slot: consultation, break, lunch, blocked';


