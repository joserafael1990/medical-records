-- Migration: Insert initial appointment types
-- This script inserts the basic appointment types into the appointment_types table

INSERT INTO appointment_types (id, name, active, created_at) VALUES 
(1, 'Presencial', true, NOW()),
(2, 'En línea', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Update sequence if needed
SELECT setval('appointment_types_id_seq', 2, true);

