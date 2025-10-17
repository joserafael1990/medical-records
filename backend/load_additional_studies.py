#!/usr/bin/env python3
"""
Script para cargar estudios clínicos adicionales en la base de datos
Basado en normativa mexicana vigente (NOM-220-SSA1-2016 y otras)
Enfoque en estudios comunes y especialidades de Ginecología y Pediatría
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
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
        # Configuración de la base de datos
        db_config = {
            'host': os.getenv('DB_HOST', 'localhost'),
            'port': os.getenv('DB_PORT', '5432'),
            'database': os.getenv('DB_NAME', 'historias_clinicas'),
            'user': os.getenv('DB_USER', 'historias_user'),
            'password': os.getenv('DB_PASSWORD', 'historias_pass')
        }
        
        conn = psycopg2.connect(**db_config)
        logger.info("Conexión a la base de datos establecida exitosamente")
        return conn
    except Exception as e:
        logger.error(f"Error al conectar a la base de datos: {e}")
        sys.exit(1)

def execute_sql_file(conn, file_path):
    """Ejecutar archivo SQL"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            sql_content = file.read()
        
        cursor = conn.cursor()
        cursor.execute(sql_content)
        conn.commit()
        cursor.close()
        
        logger.info(f"Archivo SQL ejecutado exitosamente: {file_path}")
        return True
    except Exception as e:
        logger.error(f"Error al ejecutar archivo SQL {file_path}: {e}")
        conn.rollback()
        return False

def verify_studies_loaded(conn):
    """Verificar que los estudios se cargaron correctamente"""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Contar estudios por categoría
        cursor.execute("""
            SELECT 
                sc.name as category_name,
                COUNT(st.id) as study_count
            FROM study_categories sc
            LEFT JOIN study_catalog st ON sc.id = st.category_id
            WHERE sc.is_active = true
            GROUP BY sc.id, sc.name
            ORDER BY sc.name
        """)
        
        categories = cursor.fetchall()
        
        logger.info("=== RESUMEN DE ESTUDIOS CARGADOS ===")
        total_studies = 0
        for category in categories:
            logger.info(f"{category['category_name']}: {category['study_count']} estudios")
            total_studies += category['study_count']
        
        logger.info(f"Total de estudios: {total_studies}")
        
        # Contar plantillas
        cursor.execute("SELECT COUNT(*) as template_count FROM study_templates")
        template_count = cursor.fetchone()['template_count']
        logger.info(f"Total de plantillas: {template_count}")
        
        # Contar valores normales
        cursor.execute("SELECT COUNT(*) as normal_values_count FROM study_normal_values")
        normal_values_count = cursor.fetchone()['normal_values_count']
        logger.info(f"Total de valores normales: {normal_values_count}")
        
        cursor.close()
        
    except Exception as e:
        logger.error(f"Error al verificar estudios cargados: {e}")

def main():
    """Función principal"""
    logger.info("Iniciando carga de estudios clínicos adicionales...")
    
    # Obtener conexión a la base de datos
    conn = get_db_connection()
    
    try:
        # Ejecutar archivo SQL
        sql_file = os.path.join(os.path.dirname(__file__), 'insert_additional_studies_catalog_corrected.sql')
        
        if not os.path.exists(sql_file):
            logger.error(f"Archivo SQL no encontrado: {sql_file}")
            sys.exit(1)
        
        success = execute_sql_file(conn, sql_file)
        
        if success:
            logger.info("Estudios clínicos adicionales cargados exitosamente")
            verify_studies_loaded(conn)
        else:
            logger.error("Error al cargar estudios clínicos adicionales")
            sys.exit(1)
            
    except Exception as e:
        logger.error(f"Error en la ejecución principal: {e}")
        sys.exit(1)
    finally:
        conn.close()
        logger.info("Conexión a la base de datos cerrada")

if __name__ == "__main__":
    main()
