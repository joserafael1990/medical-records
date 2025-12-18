-- Add time_blocks column to schedule_templates table
-- This column stores JSONB array of time blocks for each day

ALTER TABLE schedule_templates 
ADD COLUMN IF NOT EXISTS time_blocks JSONB DEFAULT '[]'::jsonb;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_schedule_templates_time_blocks 
ON schedule_templates USING GIN (time_blocks);

-- Add comment to document the column
COMMENT ON COLUMN schedule_templates.time_blocks IS 'Array of time blocks in JSON format: [{"start_time": "09:00", "end_time": "12:00", "is_active": true}, ...]';































