-- Migration: Clean slate approach for development environment
-- This script removes existing appointment-related data and prepares for new structure

-- 1. Delete existing appointment-related data (in correct order due to foreign keys)
DELETE FROM consultation_prescriptions;
DELETE FROM consultation_vital_signs;
DELETE FROM clinical_studies;
DELETE FROM medical_records;
DELETE FROM appointments;
DELETE FROM schedule_templates;
DELETE FROM schedule_exceptions;

-- 2. Insert appointment types (essential for new appointments)
INSERT INTO appointment_types (id, name, active, created_at) VALUES 
(1, 'Presencial', true, NOW()),
(2, 'En línea', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. Update sequence if needed
SELECT setval('appointment_types_id_seq', 2, true);

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_office_id ON appointments(office_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_type_id ON appointments(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_office_id ON medical_records(office_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_type_id ON medical_records(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_office_id ON schedule_templates(office_id);

-- Note: This gives us a clean slate to work with the new multi-office system
-- - All existing appointment data is removed
-- - New appointments will use the new structure
-- - No complex data migration needed
-- - Perfect for development environment

