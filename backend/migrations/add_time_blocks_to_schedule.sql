-- Migration: Add time_blocks column to schedule_templates
-- Date: 2025-10-22
-- Description: Add support for multiple time blocks per day for more flexibility

-- Add time_blocks column as JSONB
ALTER TABLE schedule_templates 
ADD COLUMN time_blocks JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data: convert start_time/end_time to time_blocks format
UPDATE schedule_templates
SET time_blocks = jsonb_build_array(
    jsonb_build_object(
        'start_time', to_char(start_time, 'HH24:MI'),
        'end_time', to_char(end_time, 'HH24:MI')
    )
)
WHERE start_time IS NOT NULL AND end_time IS NOT NULL;

-- Add comment
COMMENT ON COLUMN schedule_templates.time_blocks IS 'Array of time blocks in format [{"start_time": "09:00", "end_time": "13:00"}, {...}]';

-- Verification query
SELECT id, doctor_id, day_of_week, start_time, end_time, time_blocks 
FROM schedule_templates 
LIMIT 5;

