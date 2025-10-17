#!/usr/bin/env python3
"""
Script para verificar el estado actual del catálogo de estudios
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
        logger.info("Conexión a la base de datos establecida exitosamente")
        return conn
    except Exception as e:
        logger.error(f"Error al conectar a la base de datos: {e}")
        sys.exit(1)

def check_catalog_status(conn):
    """Verificar el estado del catálogo"""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar si las tablas existen
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('study_categories', 'study_catalog', 'study_normal_values', 'study_templates')
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        logger.info("=== TABLAS DISPONIBLES ===")
        for table in tables:
            logger.info(f"- {table['table_name']}")
        
        # Verificar categorías existentes
        cursor.execute("SELECT * FROM study_categories ORDER BY id")
        categories = cursor.fetchall()
        
        logger.info(f"\n=== CATEGORÍAS EXISTENTES ({len(categories)}) ===")
        for category in categories:
            logger.info(f"ID: {category['id']}, Código: {category['code']}, Nombre: {category['name']}")
        
        # Verificar estudios existentes
        cursor.execute("SELECT COUNT(*) as count FROM study_catalog")
        study_count = cursor.fetchone()['count']
        logger.info(f"\n=== ESTUDIOS EXISTENTES ===")
        logger.info(f"Total de estudios: {study_count}")
        
        if study_count > 0:
            cursor.execute("SELECT * FROM study_catalog ORDER BY id LIMIT 10")
            studies = cursor.fetchall()
            logger.info("\nPrimeros 10 estudios:")
            for study in studies:
                logger.info(f"ID: {study['id']}, Código: {study['code']}, Nombre: {study['name']}, Categoría ID: {study['category_id']}")
        
        cursor.close()
        
    except Exception as e:
        logger.error(f"Error al verificar catálogo: {e}")

def main():
    """Función principal"""
    logger.info("Verificando estado del catálogo de estudios...")
    
    conn = get_db_connection()
    
    try:
        check_catalog_status(conn)
    except Exception as e:
        logger.error(f"Error en la ejecución: {e}")
    finally:
        conn.close()
        logger.info("Conexión cerrada")

if __name__ == "__main__":
    main()

