"""
Script rápido para verificar la estructura básica de la base de datos.
Útil para verificar rápidamente que las tablas eliminadas ya no existen
y que las tablas principales están presentes.
"""

import sys
import os

# Agregar el directorio backend al path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from sqlalchemy import inspect, text
from database import engine

def quick_check():
    """Verificación rápida de la estructura de la BD"""
    print("=" * 80)
    print("VERIFICACIÓN RÁPIDA DE ESTRUCTURA DE BASE DE DATOS")
    print("=" * 80)
    print()
    
    inspector = inspect(engine)
    all_tables = set(inspector.get_table_names())
    
    # Tablas que deben existir
    required_tables = {
        'persons', 'medical_records', 'appointments', 'offices',
        'medications', 'diagnosis_catalog', 'diagnosis_categories',
        'study_catalog', 'study_categories', 'clinical_studies',
        'consultation_prescriptions', 'consultation_vital_signs',
        'vital_signs', 'medical_specialties', 'document_types',
        'documents', 'person_documents', 'schedule_templates'
    }
    
    # Tablas que deben estar eliminadas
    removed_tables = {
        'study_normal_values', 'study_templates', 'study_template_items',
        'diagnosis_differentials', 'diagnosis_recommendations',
        'schedule_exceptions', 'specialties'  # specialties fue eliminada
    }
    
    print("📊 Verificando tablas requeridas...")
    missing_tables = required_tables - all_tables
    if missing_tables:
        print("   ❌ Tablas faltantes:")
        for table in sorted(missing_tables):
            print(f"      - {table}")
    else:
        print("   ✅ Todas las tablas requeridas existen")
    
    print()
    print("📊 Verificando tablas eliminadas...")
    existing_removed = removed_tables & all_tables
    if existing_removed:
        print("   ❌ Tablas que deberían estar eliminadas pero existen:")
        for table in sorted(existing_removed):
            print(f"      - {table}")
    else:
        print("   ✅ Todas las tablas eliminadas correctamente")
    
    print()
    print("📊 Tablas totales en la BD:", len(all_tables))
    
    # Verificar estructura de study_categories
    print()
    print("📊 Verificando estructura de study_categories...")
    if 'study_categories' in all_tables:
        columns = {col['name'] for col in inspector.get_columns('study_categories')}
        expected_columns = {'id', 'name', 'active', 'created_at'}
        extra_columns = columns - expected_columns
        missing_columns = expected_columns - columns
        
        if extra_columns:
            print(f"   ⚠️  Columnas extra encontradas: {', '.join(sorted(extra_columns))}")
        if missing_columns:
            print(f"   ❌ Columnas faltantes: {', '.join(sorted(missing_columns))}")
        if 'code' in columns or 'description' in columns:
            print("   ❌ ERROR: Columnas 'code' o 'description' aún existen (deberían estar eliminadas)")
        if not extra_columns and not missing_columns and 'code' not in columns and 'description' not in columns:
            print("   ✅ Estructura correcta (sin code ni description)")
    
    # Verificar estructura de study_catalog
    print()
    print("📊 Verificando estructura de study_catalog...")
    if 'study_catalog' in all_tables:
        columns = {col['name'] for col in inspector.get_columns('study_catalog')}
        expected_columns = {'id', 'name', 'category_id', 'is_active', 'created_at', 'updated_at'}
        extra_columns = columns - expected_columns
        
        # Columnas que NO deberían existir
        forbidden_columns = {'code', 'description', 'specialty', 'subcategory', 'clinical_use',
                            'sample_type', 'preparation', 'methodology', 'normal_range',
                            'duration_minutes', 'price', 'regulatory_compliance'}
        found_forbidden = forbidden_columns & columns
        
        if found_forbidden:
            print(f"   ❌ Columnas que deberían estar eliminadas: {', '.join(sorted(found_forbidden))}")
        elif len(columns) == len(expected_columns) and columns == expected_columns:
            print("   ✅ Estructura correcta (solo campos requeridos)")
        else:
            print(f"   ⚠️  Columnas actuales: {', '.join(sorted(columns))}")
            print(f"   ⚠️  Columnas esperadas: {', '.join(sorted(expected_columns))}")
    
    print()
    print("=" * 80)
    
    # Verificar datos
    print()
    print("📊 Verificando datos en catálogos...")
    with engine.connect() as conn:
        checks = [
            ("study_categories", "Categorías de estudios"),
            ("study_catalog", "Estudios clínicos"),
            ("medications", "Medicamentos"),
            ("diagnosis_catalog", "Diagnósticos"),
            ("medical_specialties", "Especialidades médicas")
        ]
        
        for table, name in checks:
            if table in all_tables:
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                if count > 0:
                    print(f"   ✅ {name}: {count} registros")
                else:
                    print(f"   ⚠️  {name}: 0 registros (puede estar vacío)")
    
    print()
    print("=" * 80)
    print("✅ Verificación rápida completada")
    print("=" * 80)

if __name__ == "__main__":
    try:
        quick_check()
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

