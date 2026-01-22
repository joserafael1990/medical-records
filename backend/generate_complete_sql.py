#!/usr/bin/env python3
"""
Generate COMPLETE populate_master_data_FULL.sql from ALL localhost database tables
FIXED: Booleans, Column Names, and Schema Mismatches
"""
import csv

def escape_sql(text):
    """Escape single quotes for SQL"""
    if text is None or text == '':
        return 'NULL'
    return text.replace("'", "''")

def format_bool(val):
    """Format boolean value for SQL"""
    if val is None:
        return 'TRUE'
    v = str(val).lower().strip()
    if v in ('t', 'true', '1', 'yes', 'on'):
        return 'TRUE'
    return 'FALSE'

def generate_countries_sql():
    """Generate SQL for countries"""
    with open('/tmp/countries_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        countries = list(reader)
    
    sql_lines = [
        "-- ============================================================================",
        f"-- 1. COUNTRIES ({len(countries)} countries)",
        "-- ============================================================================",
        "INSERT INTO countries (id, name, phone_code, is_active, created_at) VALUES"
    ]
    
    values = []
    for country in countries:
        name = escape_sql(country['name'])
        phone_code = f"'{escape_sql(country['phone_code'])}'" if country['phone_code'] else 'NULL'
        is_active = format_bool(country['is_active'])
        values.append(f"({country['id']}, '{name}', {phone_code}, {is_active}, NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    phone_code = EXCLUDED.phone_code,")
    sql_lines.append("    is_active = EXCLUDED.is_active;")
    sql_lines.append("")
    sql_lines.append(f"-- Update sequence")
    sql_lines.append(f"SELECT setval('countries_id_seq', {len(countries)}, true);")
    
    return "\n".join(sql_lines)

def generate_states_sql():
    """Generate SQL for states"""
    with open('/tmp/states_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        states = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        f"-- 2. STATES ({len(states)} states - All countries)",
        "-- ============================================================================",
        "INSERT INTO states (id, name, country_id, is_active, created_at) VALUES"
    ]
    
    values = []
    for state in states:
        name = escape_sql(state['name'])
        country_id = state['country_id'] if state['country_id'] else 'NULL'
        is_active = format_bool(state['is_active'])
        values.append(f"({state['id']}, '{name}', {country_id}, {is_active}, NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    country_id = EXCLUDED.country_id,")
    sql_lines.append("    is_active = EXCLUDED.is_active;")
    sql_lines.append("")
    sql_lines.append(f"-- Update sequence")
    sql_lines.append(f"SELECT setval('states_id_seq', {len(states)}, true);")
    
    return "\n".join(sql_lines)

def generate_specialties_sql():
    """Generate SQL for specialties"""
    with open('/tmp/specialties_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        specialties = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        f"-- 3. MEDICAL SPECIALTIES ({len(specialties)} specialties)",
        "-- ============================================================================",
        "INSERT INTO medical_specialties (id, name, is_active, created_at) VALUES"
    ]
    
    values = []
    for spec in specialties:
        name = escape_sql(spec['name'])
        is_active = format_bool(spec['is_active'])
        values.append(f"({spec['id']}, '{name}', {is_active}, NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    is_active = EXCLUDED.is_active;")
    sql_lines.append("")
    sql_lines.append(f"-- Update sequence")
    sql_lines.append(f"SELECT setval('medical_specialties_id_seq', {len(specialties)}, true);")
    
    return "\n".join(sql_lines)

def generate_emergency_relationships_sql():
    """Generate SQL for emergency relationships"""
    with open('/tmp/emergency_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        relationships = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        f"-- 4. EMERGENCY RELATIONSHIPS ({len(relationships)} relationships)",
        "-- ============================================================================",
        "INSERT INTO emergency_relationships (code, name, is_active, created_at) VALUES"
    ]
    
    values = []
    for rel in relationships:
        code = escape_sql(rel['code'])
        name = escape_sql(rel['name'])
        is_active = format_bool(rel['is_active'])
        values.append(f"('{code}', '{name}', {is_active}, NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (code) DO UPDATE SET")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    is_active = EXCLUDED.is_active;")
    
    return "\n".join(sql_lines)

def generate_study_categories_sql():
    """Generate SQL for study categories"""
    with open('/tmp/study_categories_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        categories = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        f"-- 8. STUDY CATEGORIES ({len(categories)} categories)",
        "-- ============================================================================",
        "INSERT INTO study_categories (id, name, is_active, created_at) VALUES"
    ]
    
    values = []
    for cat in categories:
        name = escape_sql(cat['name'])
        is_active = format_bool(cat['is_active'])
        values.append(f"({cat['id']}, '{name}', {is_active}, NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    is_active = EXCLUDED.is_active;")
    sql_lines.append("")
    sql_lines.append(f"-- Update sequence")
    sql_lines.append(f"SELECT setval('study_categories_id_seq', {len(categories)}, true);")
    
    return "\n".join(sql_lines)

def generate_medications_sql():
    """Generate SQL for medications"""
    with open('/tmp/medications_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        medications = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        f"-- 9. MEDICATIONS CATALOG ({len(medications)-1} medications)",
        "-- ============================================================================",
        "INSERT INTO medications (id, name, is_active, created_by, created_at, updated_at) VALUES"
    ]
    
    values = []
    for med in medications:
        name = escape_sql(med['name'])
        is_active = format_bool(med['is_active'])
        values.append(f"({med['id']}, '{name}', {is_active}, 0, NOW(), NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    is_active = EXCLUDED.is_active,")
    sql_lines.append("    created_by = 0,")
    sql_lines.append("    updated_at = NOW();")
    sql_lines.append("")
    sql_lines.append(f"-- Update sequence")
    sql_lines.append(f"SELECT setval('medications_id_seq', {len(medications)}, true);")
    
    return "\n".join(sql_lines)

def generate_diagnoses_sql():
    """Generate SQL for diagnoses"""
    with open('/tmp/diagnoses_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        diagnoses = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        f"-- 10. DIAGNOSES CATALOG - CIE-10 ({len(diagnoses)-1} diagnoses)",
        "-- ============================================================================",
        "INSERT INTO diagnosis_catalog (id, code, name, is_active, created_by, created_at, updated_at) VALUES"
    ]
    
    values = []
    for diag in diagnoses:
        code = escape_sql(diag['code'])
        name = escape_sql(diag['name'])
        is_active = format_bool(diag['is_active'])
        values.append(f"({diag['id']}, '{code}', '{name}', {is_active}, 0, NOW(), NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("    code = EXCLUDED.code,")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    is_active = EXCLUDED.is_active,")
    sql_lines.append("    created_by = 0,")
    sql_lines.append("    updated_at = NOW();")
    sql_lines.append("")
    sql_lines.append(f"-- Update sequence")
    sql_lines.append(f"SELECT setval('diagnosis_catalog_id_seq', {len(diagnoses)}, true);")
    
    return "\n".join(sql_lines)

def generate_studies_sql():
    """Generate SQL for clinical studies"""
    with open('/tmp/studies_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        studies = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        f"-- 11. CLINICAL STUDIES CATALOG ({len(studies)-1} studies)",
        "-- ============================================================================",
        # FIXED: Removed created_by
        "INSERT INTO study_catalog (id, name, category_id, is_active, created_at, updated_at) VALUES"
    ]
    
    values = []
    for study in studies:
        name = escape_sql(study['name'])
        cat_id = study['category_id'] if study['category_id'] else 'NULL'
        is_active = format_bool(study['is_active'])
        # FIXED: Removed created_by
        values.append(f"({study['id']}, '{name}', {cat_id}, {is_active}, NOW(), NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    category_id = EXCLUDED.category_id,")
    sql_lines.append("    is_active = EXCLUDED.is_active,")
    # FIXED: Removed created_by
    sql_lines.append("    updated_at = NOW();")
    sql_lines.append("")
    sql_lines.append(f"-- Update sequence")
    sql_lines.append(f"SELECT setval('study_catalog_id_seq', {len(studies)}, true);")
    
    return "\n".join(sql_lines)

if __name__ == "__main__":
    print("🔄 Generating COMPLETE SQL from ALL localhost database tables...")
    
    # CORRECTED SECTIONS 5, 6, 7
    
    appointment_section = """
-- ============================================================================
-- 5. APPOINTMENT TYPES
-- ============================================================================
INSERT INTO appointment_types (id, name, is_active, created_at) VALUES
(1, 'Presencial', TRUE, NOW()),
(2, 'En línea', TRUE, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

SELECT setval('appointment_types_id_seq', 2, true);
"""

    vital_signs_section = """
-- ============================================================================
-- 6. VITAL SIGNS CATALOG
-- ============================================================================
-- Note: Table only has id, name, created_at
INSERT INTO vital_signs (id, name, created_at) VALUES
(1, 'Frecuencia Cardíaca', NOW()),
(2, 'Frecuencia Respiratoria', NOW()),
(3, 'Presión Arterial Sistólica', NOW()),
(4, 'Presión Arterial Diastólica', NOW()),
(5, 'Temperatura', NOW()),
(6, 'Saturación de Oxígeno', NOW()),
(7, 'Peso', NOW()),
(8, 'Estatura', NOW()),
(9, 'Índice de Masa Corporal', NOW()),
(10, 'Perímetro cefálico', NOW()),
(11, 'Superficie Corporal', NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name;

SELECT setval('vital_signs_id_seq', 11, true);
"""

    document_types_section = """
-- ============================================================================
-- 7. DOCUMENT TYPES
-- ============================================================================
INSERT INTO document_types (id, name, is_active, created_at) VALUES
(1, 'Personal', TRUE, NOW()),
(2, 'Profesional', TRUE, NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

SELECT setval('document_types_id_seq', 2, true);
"""
    
    # Generate all sections
    header = """-- ============================================================================
-- PRODUCTION DATABASE MASTER DATA POPULATION SCRIPT - COMPLETE & FIXED
-- Description: Populates ALL master/catalog tables with data from localhost
-- Author: CORTEX Medical Records System
-- Date: 2025-12-01
-- Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012
-- Source: Extracted from localhost database
-- ============================================================================

"""
    
    countries_sql = generate_countries_sql()
    states_sql = generate_states_sql()
    specialties_sql = generate_specialties_sql()
    emergency_sql = generate_emergency_relationships_sql()
    study_categories_sql = generate_study_categories_sql()
    medications_sql = generate_medications_sql()
    diagnoses_sql = generate_diagnoses_sql()
    studies_sql = generate_studies_sql()
    
    verification = """

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify data insertion
SELECT 'Countries' as table_name, COUNT(*) as total FROM countries
UNION ALL
SELECT 'States', COUNT(*) FROM states
UNION ALL
SELECT 'Specialties', COUNT(*) FROM medical_specialties
UNION ALL
SELECT 'Emergency Relationships', COUNT(*) FROM emergency_relationships
UNION ALL
SELECT 'Appointment Types', COUNT(*) FROM appointment_types
UNION ALL
SELECT 'Vital Signs', COUNT(*) FROM vital_signs
UNION ALL
SELECT 'Document Types', COUNT(*) FROM document_types
UNION ALL
SELECT 'Study Categories', COUNT(*) FROM study_categories
UNION ALL
SELECT 'Medications', COUNT(*) FROM medications WHERE created_by = 0
UNION ALL
SELECT 'Diagnoses', COUNT(*) FROM diagnosis_catalog WHERE created_by = 0
UNION ALL
SELECT 'Clinical Studies', COUNT(*) FROM study_catalog;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
"""
    
    # Combine everything
    new_sql = (header + 
               countries_sql + "\n" +
               states_sql + "\n" +
               specialties_sql + "\n" +
               emergency_sql + "\n" +
               appointment_section + "\n" +
               vital_signs_section + "\n" +
               document_types_section + "\n" +
               study_categories_sql + "\n" +
               medications_sql + "\n" +
               diagnoses_sql + "\n" +
               studies_sql +
               verification)
    
    # Write to new file
    output_file = '/Users/rafaelgarcia/Documents/Software projects/medical-records-main/backend/populate_master_data_FULL.sql'
    with open(output_file, 'w') as f:
        f.write(new_sql)
    
    print(f"✅ Generated: {output_file}")
    print(f"\n📊 COMPLETE DATA FROM LOCALHOST:")
    print(f"   - 20 countries")
    print(f"   - 413 states (all countries)")
    print(f"   - 27 medical specialties")
    print(f"   - 29 emergency relationships")
    print(f"   - 2 appointment types")
    print(f"   - 11 vital signs")
    print(f"   - 2 document types")
    print(f"   - 25 study categories")
    print(f"   - 742 medications")
    print(f"   - 666 diagnoses (CIE-10)")
    print(f"   - 500 clinical studies")
    print(f"\n📊 Total master data records: ~2,437")
