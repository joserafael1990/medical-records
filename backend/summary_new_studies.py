#!/usr/bin/env python3
"""
Script para mostrar un resumen completo de los estudios clínicos agregados
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_db_connection():
    """Obtener conexión a la base de datos"""
    try:
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'historias_clinicas'),
            'user': os.getenv('DB_USER', 'historias_user'),
            'password': os.getenv('DB_PASSWORD', 'historias_pass')
        }
        
        conn = psycopg2.connect(**db_config)
        return conn
    except Exception as e:
        logger.error(f"Error al conectar a la base de datos: {e}")
        sys.exit(1)

def show_summary():
    """Mostrar resumen completo"""
    conn = get_db_connection()
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print("=" * 80)
        print("RESUMEN COMPLETO DEL CATÁLOGO DE ESTUDIOS CLÍNICOS")
        print("Basado en normativa mexicana vigente (NOM-220-SSA1-2016 y otras)")
        print("=" * 80)
        
        # Contar estudios por categoría
        cursor.execute("""
            SELECT 
                sc.name as category_name,
                sc.code as category_code,
                COUNT(st.id) as study_count
            FROM study_categories sc
            LEFT JOIN study_catalog st ON sc.id = st.category_id
            WHERE sc.is_active = true
            GROUP BY sc.id, sc.name, sc.code
            ORDER BY sc.name
        """)
        
        categories = cursor.fetchall()
        
        print("\n📊 ESTUDIOS POR CATEGORÍA:")
        print("-" * 50)
        total_studies = 0
        for category in categories:
            print(f"{category['category_name']:25} ({category['category_code']:3}): {category['study_count']:3} estudios")
            total_studies += category['study_count']
        
        print("-" * 50)
        print(f"{'TOTAL':25}     : {total_studies:3} estudios")
        
        # Mostrar estudios específicos de Ginecología
        cursor.execute("""
            SELECT code, name, specialty, subcategory
            FROM study_catalog 
            WHERE specialty = 'Ginecología' OR name ILIKE '%ginec%' OR name ILIKE '%mama%' OR name ILIKE '%cervic%' OR name ILIKE '%uter%'
            ORDER BY code
        """)
        
        gynecology_studies = cursor.fetchall()
        
        print(f"\n👩 GINECOLOGÍA ({len(gynecology_studies)} estudios):")
        print("-" * 70)
        for study in gynecology_studies:
            print(f"{study['code']:10} | {study['name']:40} | {study['subcategory']}")
        
        # Mostrar estudios específicos de Pediatría
        cursor.execute("""
            SELECT code, name, specialty, subcategory
            FROM study_catalog 
            WHERE specialty = 'Pediatría' OR name ILIKE '%pedi%' OR name ILIKE '%neonat%' OR name ILIKE '%infant%' OR name ILIKE '%niño%'
            ORDER BY code
        """)
        
        pediatrics_studies = cursor.fetchall()
        
        print(f"\n👶 PEDIATRÍA ({len(pediatrics_studies)} estudios):")
        print("-" * 70)
        for study in pediatrics_studies:
            print(f"{study['code']:10} | {study['name']:40} | {study['subcategory']}")
        
        # Mostrar plantillas de estudios
        cursor.execute("""
            SELECT name, description, specialty, is_default
            FROM study_templates 
            ORDER BY specialty, name
        """)
        
        templates = cursor.fetchall()
        
        print(f"\n📋 PLANTILLAS DE ESTUDIOS ({len(templates)} plantillas):")
        print("-" * 80)
        
        current_specialty = None
        for template in templates:
            if template['specialty'] != current_specialty:
                current_specialty = template['specialty']
                print(f"\n{current_specialty}:")
            
            default_mark = " (DEFAULT)" if template['is_default'] else ""
            print(f"  • {template['name']}{default_mark}")
            if template['description']:
                print(f"    {template['description']}")
        
        # Mostrar valores normales
        cursor.execute("SELECT COUNT(*) as count FROM study_normal_values")
        normal_values_count = cursor.fetchone()['count']
        
        print(f"\n📈 VALORES NORMALES: {normal_values_count} registros")
        
        # Mostrar estudios más comunes
        cursor.execute("""
            SELECT code, name, specialty
            FROM study_catalog 
            WHERE specialty IN ('Medicina General', 'Endocrinología', 'Cardiología')
            ORDER BY specialty, code
            LIMIT 15
        """)
        
        common_studies = cursor.fetchall()
        
        print(f"\n🔬 ESTUDIOS COMUNES ({len(common_studies)} estudios):")
        print("-" * 70)
        for study in common_studies:
            print(f"{study['code']:10} | {study['name']:40} | {study['specialty']}")
        
        print("\n" + "=" * 80)
        print("✅ CATÁLOGO ACTUALIZADO EXITOSAMENTE")
        print("📚 Basado en normativa mexicana vigente")
        print("🏥 Incluye estudios para Ginecología y Pediatría")
        print("🔬 Estudios comunes y especializados")
        print("=" * 80)
        
        cursor.close()
        
    except Exception as e:
        logger.error(f"Error al generar resumen: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    show_summary()

