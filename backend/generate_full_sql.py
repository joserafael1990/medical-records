#!/usr/bin/env python3
"""
Generate comprehensive populate_master_data.sql from localhost database exports
"""
import csv

def escape_sql(text):
    """Escape single quotes for SQL"""
    if text is None:
        return 'NULL'
    return text.replace("'", "''")

def generate_studies_sql():
    """Generate SQL for clinical studies"""
    with open('/tmp/studies_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        studies = list(reader)
    
    sql_lines = [
        "-- ============================================================================",
        "-- 11. CLINICAL STUDIES CATALOG (500 studies)",
        "-- ============================================================================",
        "INSERT INTO study_catalog (id, name, category_id, is_active, created_by, created_at, updated_at) VALUES"
    ]
    
    values = []
    for study in studies:
        name = escape_sql(study['name'])
        cat_id = study['category_id'] if study['category_id'] else 'NULL'
        is_active = study['is_active'].lower()
        values.append(f"({study['id']}, '{name}', {cat_id}, {is_active}, 0, NOW(), NOW())")
    
    sql_lines.append(",\n".join(values))
    sql_lines.append("\nON CONFLICT (id) DO UPDATE SET")
    sql_lines.append("    name = EXCLUDED.name,")
    sql_lines.append("    category_id = EXCLUDED.category_id,")
    sql_lines.append("    is_active = EXCLUDED.is_active,")
    sql_lines.append("    created_by = 0,")
    sql_lines.append("    updated_at = NOW();")
    sql_lines.append("")
    sql_lines.append(f"-- Update sequence")
    sql_lines.append(f"SELECT setval('study_catalog_id_seq', {len(studies)}, true);")
    
    return "\n".join(sql_lines)

def generate_diagnoses_sql():
    """Generate SQL for diagnoses"""
    with open('/tmp/diagnoses_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        diagnoses = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        "-- 10. DIAGNOSES CATALOG - CIE-10 (666 diagnoses)",
        "-- ============================================================================",
        "INSERT INTO diagnosis_catalog (id, code, name, is_active, created_by, created_at, updated_at) VALUES"
    ]
    
    values = []
    for diag in diagnoses:
        code = escape_sql(diag['code'])
        name = escape_sql(diag['name'])
        is_active = diag['is_active'].lower()
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

def generate_medications_sql():
    """Generate SQL for medications"""
    with open('/tmp/medications_export.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        medications = list(reader)
    
    sql_lines = [
        "",
        "-- ============================================================================",
        "-- 9. MEDICATIONS CATALOG (742 medications)",
        "-- ============================================================================",
        "INSERT INTO medications (id, name, is_active, created_by, created_at, updated_at) VALUES"
    ]
    
    values = []
    for med in medications:
        name = escape_sql(med['name'])
        is_active = med['is_active'].lower()
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

if __name__ == "__main__":
    print("🔄 Generating comprehensive SQL from localhost database...")
    
    # Read the base script
    with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/backend/populate_master_data.sql', 'r') as f:
        base_sql = f.read()
    
    # Find where to insert the new sections (before medications section)
    # We'll replace sections 9, 10, 11
    
    # Split at section 9
    parts = base_sql.split('-- 9. COMMON MEDICATIONS')
    base_part = parts[0]
    
    # Split at verification section
    verification_part = base_sql.split('-- VERIFICATION QUERIES')[1]
    
    # Generate new sections
    medications_sql = generate_medications_sql()
    diagnoses_sql = generate_diagnoses_sql()
    studies_sql = generate_studies_sql()
    
    # Combine everything
    new_sql = base_part + medications_sql + "\n" + diagnoses_sql + "\n" + studies_sql + "\n\n-- ============================================================================\n-- VERIFICATION QUERIES\n-- ============================================================================" + verification_part
    
    # Write to new file
    output_file = '/Users/rafaelgarcia/Documents/Software projects/medical-records-main/backend/populate_master_data_FULL.sql'
    with open(output_file, 'w') as f:
        f.write(new_sql)
    
    print(f"✅ Generated: {output_file}")
    print(f"   - 742 medications")
    print(f"   - 666 diagnoses (CIE-10)")
    print(f"   - 500 clinical studies")
    print(f"\n📊 Total master data records: ~2,000+")
