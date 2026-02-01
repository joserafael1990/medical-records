-- Quick verification script to check if data exists
-- Run this after populating: psql "your_connection_string" -f db_setup/verify_data.sql

SELECT 'Countries' as table_name, COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active 
FROM countries
UNION ALL
SELECT 'States', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM states
UNION ALL
SELECT 'Medical Specialties', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM medical_specialties
UNION ALL
SELECT 'Emergency Relationships', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM emergency_relationships
UNION ALL
SELECT 'Study Categories', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM study_categories
UNION ALL
SELECT 'Study Catalog', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM study_catalog
UNION ALL
SELECT 'Medications', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM medications
UNION ALL
SELECT 'Diagnosis Catalog', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM diagnosis_catalog
UNION ALL
SELECT 'Appointment Types', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM appointment_types
UNION ALL
SELECT 'Vital Signs', COUNT(*), COUNT(*) FROM vital_signs
UNION ALL
SELECT 'Document Types', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM document_types
UNION ALL
SELECT 'Documents', COUNT(*), COUNT(*) FILTER (WHERE is_active = true) FROM documents
ORDER BY table_name;

-- Also check system user
SELECT 'System User (id=0)' as check_name, COUNT(*) as count FROM persons WHERE id = 0;

-- Show current database
SELECT current_database() as current_db, current_schema() as current_schema;

