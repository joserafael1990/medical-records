-- Migration: Essential changes only - No data migration needed
-- This script only creates the new tables and inserts basic data

-- 1. Insert appointment types (essential for new appointments)
INSERT INTO appointment_types (id, name, active, created_at) VALUES 
(1, 'Presencial', true, NOW()),
(2, 'En línea', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Update sequence if needed
SELECT setval('appointment_types_id_seq', 2, true);

-- 3. Add indexes for better performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_appointments_office_id ON appointments(office_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_type_id ON appointments(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_office_id ON medical_records(office_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_type_id ON medical_records(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_office_id ON schedule_templates(office_id);

-- Note: No data migration needed
-- - Existing appointments will work with NULL values
-- - Doctors can create offices when they access the system
-- - New appointments will use the new structure
-- - Existing data remains untouched and functional

