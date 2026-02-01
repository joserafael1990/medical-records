-- Migration: Insert initial appointment types and create default offices
-- This script prepares the database for the multi-office system

-- Insert appointment types
INSERT INTO appointment_types (id, name, active, created_at) VALUES 
(1, 'Presencial', true, NOW()),
(2, 'En línea', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Update sequence if needed
SELECT setval('appointment_types_id_seq', 2, true);

-- Create default office for existing doctors (if any)
-- This will create a default office for each doctor who doesn't have one
INSERT INTO offices (doctor_id, name, address, city, state_id, country_id, postal_code, phone, timezone, maps_url, is_active, created_at, updated_at)
SELECT 
    p.id as doctor_id,
    COALESCE(p.office_address, 'Consultorio Principal') as name,
    p.office_address as address,
    p.office_city as city,
    p.office_state_id as state_id,
    p.address_country_id as country_id,
    p.office_postal_code as postal_code,
    p.office_phone as phone,
    COALESCE(p.office_timezone, 'America/Mexico_City') as timezone,
    NULL as maps_url,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM persons p
WHERE p.person_type = 'doctor' 
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM offices o WHERE o.doctor_id = p.id AND o.is_active = true
  )
  AND (p.office_address IS NOT NULL OR p.office_city IS NOT NULL);

-- Update existing appointments to use appointment_type_id = 1 (Presencial) and assign office_id
-- This is a safe migration that preserves existing data
UPDATE appointments 
SET 
    appointment_type_id = 1,  -- Presencial
    office_id = (
        SELECT o.id 
        FROM offices o 
        WHERE o.doctor_id = appointments.doctor_id 
        AND o.is_active = true 
        LIMIT 1
    )
WHERE appointment_type_id IS NULL;

-- Update existing medical_records to use appointment_type_id = 1 (Presencial) and assign office_id
UPDATE medical_records 
SET 
    appointment_type_id = 1,  -- Presencial
    office_id = (
        SELECT o.id 
        FROM offices o 
        WHERE o.doctor_id = medical_records.doctor_id 
        AND o.is_active = true 
        LIMIT 1
    )
WHERE appointment_type_id IS NULL;

-- Update existing schedule_templates to use office_id
UPDATE schedule_templates 
SET 
    office_id = (
        SELECT o.id 
        FROM offices o 
        WHERE o.doctor_id = schedule_templates.doctor_id 
        AND o.is_active = true 
        LIMIT 1
    )
WHERE office_id IS NULL AND doctor_id IS NOT NULL;

