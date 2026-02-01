-- Migration: Update database structure for multi-office system
-- This script prepares the database for the new office-based architecture

-- Update existing appointments to have proper appointment_type_id
-- Convert string appointment_type to appointment_type_id
UPDATE appointments 
SET appointment_type_id = CASE 
    WHEN appointment_type = 'Presencial' OR appointment_type = 'presencial' THEN 1
    WHEN appointment_type = 'En línea' OR appointment_type = 'online' OR appointment_type = 'En linea' THEN 2
    ELSE 1  -- Default to "Presencial"
END
WHERE appointment_type_id IS NULL;

-- Update existing medical_records to have proper appointment_type_id
UPDATE medical_records 
SET appointment_type_id = 1  -- Default to "Presencial" for existing records
WHERE appointment_type_id IS NULL;

-- Ensure all doctors have at least one office
-- Create default office for doctors who don't have any
INSERT INTO offices (doctor_id, name, address, city, state_id, country_id, postal_code, phone, timezone, maps_url, is_active, created_at, updated_at)
SELECT 
    p.id as doctor_id,
    'Consultorio Principal' as name,
    'Dirección no especificada' as address,
    'Ciudad no especificada' as city,
    p.address_state_id as state_id,
    p.address_country_id as country_id,
    '00000' as postal_code,
    p.primary_phone as phone,
    'America/Mexico_City' as timezone,
    NULL as maps_url,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM persons p
WHERE p.person_type = 'doctor' 
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM offices o WHERE o.doctor_id = p.id AND o.is_active = true
  );

-- Update appointments without office_id to use the doctor's default office
UPDATE appointments 
SET office_id = (
    SELECT o.id 
    FROM offices o 
    WHERE o.doctor_id = appointments.doctor_id 
    AND o.is_active = true 
    ORDER BY o.created_at ASC
    LIMIT 1
)
WHERE office_id IS NULL;

-- Update medical_records without office_id to use the doctor's default office
UPDATE medical_records 
SET office_id = (
    SELECT o.id 
    FROM offices o 
    WHERE o.doctor_id = medical_records.doctor_id 
    AND o.is_active = true 
    ORDER BY o.created_at ASC
    LIMIT 1
)
WHERE office_id IS NULL;

-- Update schedule_templates without office_id to use the doctor's default office
UPDATE schedule_templates 
SET office_id = (
    SELECT o.id 
    FROM offices o 
    WHERE o.doctor_id = schedule_templates.doctor_id 
    AND o.is_active = true 
    ORDER BY o.created_at ASC
    LIMIT 1
)
WHERE office_id IS NULL AND doctor_id IS NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_office_id ON appointments(office_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_type_id ON appointments(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_office_id ON medical_records(office_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_appointment_type_id ON medical_records(appointment_type_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_office_id ON schedule_templates(office_id);

-- Note: PDFs will be regenerated automatically with new office information
-- Note: WhatsApp messages will use new office-based logic automatically
