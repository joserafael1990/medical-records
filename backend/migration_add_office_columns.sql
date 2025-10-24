-- Migration: Add missing columns for multi-office system
-- This script adds the missing columns to support the new office-based architecture

-- Add appointment_type_id column to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS appointment_type_id INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS office_id INTEGER;

-- Add foreign key constraints
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_appointment_type 
    FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id);

ALTER TABLE appointments ADD CONSTRAINT fk_appointments_office 
    FOREIGN KEY (office_id) REFERENCES offices(id);

-- Add appointment_type_id and office_id to medical_records table
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS appointment_type_id INTEGER;
ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS office_id INTEGER;

-- Add foreign key constraints for medical_records
ALTER TABLE medical_records ADD CONSTRAINT fk_medical_records_appointment_type 
    FOREIGN KEY (appointment_type_id) REFERENCES appointment_types(id);

ALTER TABLE medical_records ADD CONSTRAINT fk_medical_records_office 
    FOREIGN KEY (office_id) REFERENCES offices(id);

-- Add office_id to schedule_templates table
ALTER TABLE schedule_templates ADD COLUMN IF NOT EXISTS office_id INTEGER;
ALTER TABLE schedule_templates ADD CONSTRAINT fk_schedule_templates_office 
    FOREIGN KEY (office_id) REFERENCES offices(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_office_id ON appointments(office_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_type_id ON appointments(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_office_id ON medical_records(office_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_type_id ON medical_records(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_office_id ON schedule_templates(office_id);

-- Note: Existing data will have NULL values for these new columns
-- This is expected for the development environment


