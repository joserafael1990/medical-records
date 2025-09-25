-- Migration: Multiple Time Blocks Support
-- Remove old schedule template columns and create new time blocks table

-- First, let's see what we have
-- \d schedule_templates;

-- Remove old columns from schedule_templates that are no longer needed
ALTER TABLE schedule_templates 
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS consultation_duration,
DROP COLUMN IF EXISTS break_duration,
DROP COLUMN IF EXISTS lunch_start,
DROP COLUMN IF EXISTS lunch_end;

-- Create the new time blocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS schedule_time_blocks (
    id SERIAL PRIMARY KEY,
    schedule_template_id INTEGER NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_time_blocks_template_id ON schedule_time_blocks(schedule_template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_time_blocks_times ON schedule_time_blocks(start_time, end_time);

-- Show the updated structure
-- \d schedule_templates;
-- \d schedule_time_blocks;
-- Remove old schedule template columns and create new time blocks table

-- First, let's see what we have
-- \d schedule_templates;

-- Remove old columns from schedule_templates that are no longer needed
ALTER TABLE schedule_templates 
DROP COLUMN IF EXISTS start_time,
DROP COLUMN IF EXISTS end_time,
DROP COLUMN IF EXISTS consultation_duration,
DROP COLUMN IF EXISTS break_duration,
DROP COLUMN IF EXISTS lunch_start,
DROP COLUMN IF EXISTS lunch_end;

-- Create the new time blocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS schedule_time_blocks (
    id SERIAL PRIMARY KEY,
    schedule_template_id INTEGER NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schedule_time_blocks_template_id ON schedule_time_blocks(schedule_template_id);
CREATE INDEX IF NOT EXISTS idx_schedule_time_blocks_times ON schedule_time_blocks(start_time, end_time);

-- Show the updated structure
-- \d schedule_templates;
-- \d schedule_time_blocks;
