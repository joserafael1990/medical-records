-- Add unique constraint for schedule_templates
-- This ensures one schedule per doctor per day of week

-- First, remove any duplicate entries if they exist
DELETE FROM schedule_templates 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM schedule_templates 
    GROUP BY doctor_id, day_of_week
);

-- Add unique constraint
ALTER TABLE schedule_templates 
ADD CONSTRAINT unique_doctor_day_schedule 
UNIQUE (doctor_id, day_of_week);

-- Add comment
COMMENT ON CONSTRAINT unique_doctor_day_schedule ON schedule_templates 
IS 'Ensures one schedule template per doctor per day of the week';
