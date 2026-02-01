-- ============================================================================
-- CLEAN MASTER DATA SCRIPT (FULL WIPE)
-- Description: Truncates ALL tables to prepare for fresh population
-- WARNING: This deletes ALL data in the database!
-- Usage: Run this before populate_master_data_FULL.sql
-- ============================================================================

-- Truncate all tables
-- CASCADE ensures references are handled
-- RESTART IDENTITY resets sequences to 1
TRUNCATE TABLE 
    -- Transactional tables (Child tables first)
    medical_records,
    appointments,
    clinical_studies,
    audit_log,
    offices,
    
    -- Main entity tables
    persons,
    
    -- Catalog tables
    countries, 
    states, 
    medical_specialties, 
    emergency_relationships, 
    appointment_types, 
    vital_signs, 
    document_types, 
    study_categories, 
    medications, 
    diagnosis_catalog, 
    study_catalog
RESTART IDENTITY CASCADE;

-- Verification
SELECT 'countries' as table_name, count(*) as count FROM countries
UNION ALL
SELECT 'states', count(*) FROM states
UNION ALL
SELECT 'persons', count(*) FROM persons
UNION ALL
SELECT 'medications', count(*) FROM medications;
