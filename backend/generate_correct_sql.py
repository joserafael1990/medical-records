#!/usr/bin/env python3
"""
Script para generar el SQL correcto con los IDs de categorías reales
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

def get_category_mapping(conn):
    """Obtener mapeo de categorías"""
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id, code, name FROM study_categories ORDER BY id")
        categories = cursor.fetchall()
        
        mapping = {}
        for cat in categories:
            mapping[cat['code']] = cat['id']
            logger.info(f"Categoría: {cat['code']} -> ID: {cat['id']} ({cat['name']})")
        
        cursor.close()
        return mapping
    except Exception as e:
        logger.error(f"Error al obtener mapeo de categorías: {e}")
        return {}

def generate_correct_sql():
    """Generar SQL correcto con IDs reales"""
    conn = get_db_connection()
    
    try:
        category_mapping = get_category_mapping(conn)
        
        # Mapeo de categorías a usar
        category_map = {
            'LAB': category_mapping.get('LAB', 17),  # Laboratorio Clínico
            'HEM': category_mapping.get('HEM', 18),  # Hematología
            'BIO': category_mapping.get('BIO', 19),  # Bioquímica
            'IMG': category_mapping.get('IMG', 25),  # Imagenología
            'FUN': category_mapping.get('FUN', 26),  # Funcionales
            'BIP': category_mapping.get('BIP', 27),  # Biopsias
            'GEN': category_mapping.get('GEN', 24),  # Genética
            'GIN': category_mapping.get('GIN', 32),  # Ginecología
            'PED': category_mapping.get('PED', 33),  # Pediatría
            'CAR': category_mapping.get('CAR', 29),  # Cardiología
            'NEU': category_mapping.get('NEU', 30),  # Neurología
            'END': category_mapping.get('END', 23),  # Endocrinología
            'TOX': category_mapping.get('TOX', 28),  # Toxicología
        }
        
        logger.info("Mapeo de categorías:")
        for code, id_val in category_map.items():
            logger.info(f"  {code}: {id_val}")
        
        # Generar SQL con IDs correctos
        sql_content = f"""-- Insertar estudios clínicos adicionales según normativa mexicana
-- Basado en NOM-220-SSA1-2016 y otras normativas vigentes
-- Enfoque en estudios comunes y especialidades de Ginecología y Pediatría

-- Insertar estudios de laboratorio clínico comunes
INSERT INTO study_catalog (code, name, category_id, subcategory, description, preparation, methodology, duration_hours, specialty) VALUES
-- Estudios de Laboratorio Comunes
('LAB011', 'Perfil Hepático Completo', {category_map['BIO']}, 'Química Sanguínea', 'AST, ALT, bilirrubina total y directa, fosfatasa alcalina, GGT, proteínas totales, albúmina', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Medicina General'),
('LAB012', 'Perfil Renal Completo', {category_map['BIO']}, 'Química Sanguínea', 'Urea, creatinina, ácido úrico, sodio, potasio, cloro, calcio, fósforo', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Medicina General'),
('LAB013', 'Perfil Tiroideo Completo', {category_map['END']}, 'Hormonas', 'TSH, T3 libre, T4 libre, anticuerpos anti-tiroideos', 'No requiere ayuno', 'Inmunoensayo', 6, 'Endocrinología'),
('LAB014', 'Hemoglobina Glicosilada (HbA1c)', {category_map['BIO']}, 'Química Sanguínea', 'Control de diabetes a largo plazo', 'No requiere ayuno', 'Cromatografía líquida', 24, 'Endocrinología'),
('LAB015', 'Proteína C Reactiva (PCR)', {category_map['BIO']}, 'Marcadores Inflamatorios', 'Marcador de inflamación aguda', 'No requiere ayuno', 'Inmunoensayo', 2, 'Medicina General'),
('LAB016', 'Velocidad de Sedimentación Globular (VSG)', {category_map['HEM']}, 'Hematología', 'Medición de la velocidad de sedimentación de eritrocitos', 'No requiere ayuno', 'Método de Westergren', 2, 'Medicina General'),
('LAB017', 'Ferritina', {category_map['BIO']}, 'Marcadores de Hierro', 'Reserva de hierro corporal', 'Ayuno de 8 horas', 'Inmunoensayo', 4, 'Hematología'),
('LAB018', 'Vitamina B12', {category_map['BIO']}, 'Vitaminas', 'Nivel de vitamina B12 en sangre', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Hematología'),
('LAB019', 'Ácido Fólico', {category_map['BIO']}, 'Vitaminas', 'Nivel de ácido fólico en sangre', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Hematología'),
('LAB020', 'Coagulograma Completo', {category_map['HEM']}, 'Coagulación', 'TP, TTP, fibrinógeno, tiempo de sangrado', 'No requiere ayuno', 'Coagulometría', 4, 'Hematología'),

-- Estudios de Laboratorio para Ginecología
('LAB021', 'Estradiol', {category_map['END']}, 'Hormonas', 'Hormona estrogénica principal', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB022', 'Progesterona', {category_map['END']}, 'Hormonas', 'Hormona progestacional', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB023', 'FSH (Hormona Folículo Estimulante)', {category_map['END']}, 'Hormonas', 'Hormona estimulante del folículo', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB024', 'LH (Hormona Luteinizante)', {category_map['END']}, 'Hormonas', 'Hormona luteinizante', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB025', 'Prolactina', {category_map['END']}, 'Hormonas', 'Hormona prolactina', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Ginecología'),
('LAB026', 'Testosterona Total', {category_map['END']}, 'Hormonas', 'Hormona testosterona total', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB027', 'DHEA-S', {category_map['END']}, 'Hormonas', 'Sulfato de dehidroepiandrosterona', 'No requiere ayuno', 'Inmunoensayo', 6, 'Ginecología'),
('LAB028', 'AMH (Hormona Antimülleriana)', {category_map['END']}, 'Hormonas', 'Reserva ovárica', 'No requiere ayuno', 'Inmunoensayo', 24, 'Ginecología'),
('LAB029', 'Cortisol', {category_map['END']}, 'Hormonas', 'Hormona del estrés', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Endocrinología'),
('LAB030', 'Insulina', {category_map['END']}, 'Hormonas', 'Hormona insulina', 'Ayuno de 8 horas', 'Inmunoensayo', 6, 'Endocrinología'),

-- Estudios de Laboratorio para Pediatría
('LAB031', 'Tamiz Neonatal Básico', {category_map['GEN']}, 'Tamiz Neonatal', 'Fenilcetonuria, hipotiroidismo congénito, galactosemia', 'No requiere ayuno', 'Espectrometría de masas', 72, 'Pediatría'),
('LAB032', 'Tamiz Neonatal Ampliado', {category_map['GEN']}, 'Tamiz Neonatal', '40+ enfermedades metabólicas congénitas', 'No requiere ayuno', 'Espectrometría de masas', 72, 'Pediatría'),
('LAB033', 'Bilirrubina Total y Directa', {category_map['BIO']}, 'Química Sanguínea', 'Evaluación de ictericia neonatal', 'No requiere ayuno', 'Espectrofotometría', 2, 'Pediatría'),
('LAB034', 'Hemoglobina y Hematocrito Pediátrico', {category_map['HEM']}, 'Hematología', 'Detección de anemia en niños', 'No requiere ayuno', 'Citometría de flujo', 2, 'Pediatría'),
('LAB035', 'Plomo en Sangre', {category_map['TOX']}, 'Toxicología', 'Detección de intoxicación por plomo', 'No requiere ayuno', 'Espectrometría de absorción atómica', 24, 'Pediatría'),
('LAB036', 'Vitamina D (25-OH)', {category_map['BIO']}, 'Vitaminas', 'Nivel de vitamina D', 'No requiere ayuno', 'Inmunoensayo', 6, 'Pediatría'),
('LAB037', 'Calcio, Fósforo y Magnesio', {category_map['BIO']}, 'Química Sanguínea', 'Metabolismo mineral', 'Ayuno de 8 horas', 'Espectrofotometría', 4, 'Pediatría'),
('LAB038', 'Creatinina y Urea Pediátrica', {category_map['BIO']}, 'Química Sanguínea', 'Función renal en niños', 'No requiere ayuno', 'Espectrofotometría', 4, 'Pediatría'),

-- Estudios de Imagen para Ginecología
('IMG006', 'Ultrasonido Transvaginal', {category_map['IMG']}, 'Ultrasonido', 'Evaluación de útero y ovarios por vía transvaginal', 'Vejiga vacía', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG007', 'Ultrasonido Pélvico', {category_map['IMG']}, 'Ultrasonido', 'Evaluación de órganos pélvicos', 'Vejiga llena', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG008', 'Mamografía Bilateral con Proyecciones Adicionales', {category_map['IMG']}, 'Radiología', 'Estudio completo de mama con proyecciones complementarias', 'No usar desodorante', 'Mamografía digital', 4, 'Ginecología'),
('IMG009', 'Ultrasonido de Mama', {category_map['IMG']}, 'Ultrasonido', 'Evaluación complementaria de mama', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Ginecología'),
('IMG010', 'Densitometría Ósea', {category_map['IMG']}, 'Densitometría', 'Evaluación de densidad mineral ósea', 'No requiere preparación', 'DEXA', 2, 'Ginecología'),
('IMG011', 'Histerosalpingografía', {category_map['IMG']}, 'Radiología', 'Evaluación de útero y trompas de Falopio', 'No requiere preparación', 'Radiografía con contraste', 2, 'Ginecología'),
('IMG012', 'Resonancia Magnética Pélvica', {category_map['IMG']}, 'Resonancia Magnética', 'Evaluación detallada de órganos pélvicos', 'Ayuno de 4 horas', 'Resonancia magnética', 24, 'Ginecología'),

-- Estudios de Imagen para Pediatría
('IMG013', 'Radiografía de Tórax Pediátrica', {category_map['IMG']}, 'Radiología', 'Radiografía de tórax en niños', 'No requiere preparación', 'Radiografía digital', 2, 'Pediatría'),
('IMG014', 'Ultrasonido Abdominal Pediátrico', {category_map['IMG']}, 'Ultrasonido', 'Evaluación de órganos abdominales en niños', 'Ayuno de 4 horas', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG015', 'Ecocardiografía Pediátrica', {category_map['IMG']}, 'Ultrasonido', 'Evaluación del corazón en niños', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG016', 'Ultrasonido Cerebral Neonatal', {category_map['IMG']}, 'Ultrasonido', 'Evaluación del cerebro en recién nacidos', 'No requiere preparación', 'Ultrasonido Doppler', 2, 'Pediatría'),
('IMG017', 'Radiografía de Cráneo Pediátrica', {category_map['IMG']}, 'Radiología', 'Radiografía de cráneo en niños', 'No requiere preparación', 'Radiografía digital', 2, 'Pediatría'),
('IMG018', 'Tomografía de Cráneo Pediátrica', {category_map['IMG']}, 'Tomografía', 'Tomografía de cráneo en niños', 'Sedación si es necesario', 'Tomografía helicoidal', 24, 'Pediatría'),

-- Estudios Funcionales para Ginecología
('FUN001', 'Colposcopia', {category_map['FUN']}, 'Endoscopía', 'Evaluación detallada del cuello uterino', 'No requiere preparación', 'Colposcopia con ácido acético', 1, 'Ginecología'),
('FUN002', 'Histeroscopia Diagnóstica', {category_map['FUN']}, 'Endoscopía', 'Evaluación del interior del útero', 'No requiere preparación', 'Histeroscopia', 2, 'Ginecología'),
('FUN003', 'Biopsia de Endometrio', {category_map['BIP']}, 'Biopsia', 'Obtención de muestra endometrial', 'No requiere preparación', 'Biopsia por aspiración', 1, 'Ginecología'),
('FUN004', 'Biopsia de Mama', {category_map['BIP']}, 'Biopsia', 'Obtención de muestra de tejido mamario', 'No requiere preparación', 'Biopsia con aguja gruesa', 2, 'Ginecología'),
('FUN005', 'Prueba de Papanicolaou', {category_map['BIP']}, 'Citología', 'Detección de cáncer cervicouterino', 'No requiere preparación', 'Citología cervical', 1, 'Ginecología'),
('FUN006', 'Prueba de VPH (Virus del Papiloma Humano)', {category_map['BIO']}, 'Microbiología', 'Detección de VPH de alto riesgo', 'No requiere preparación', 'PCR', 48, 'Ginecología'),

-- Estudios Funcionales para Pediatría
('FUN007', 'Electroencefalografía Pediátrica', {category_map['NEU']}, 'Neurofisiología', 'Registro de actividad eléctrica cerebral en niños', 'No requiere preparación', 'EEG de 20 derivaciones', 2, 'Pediatría'),
('FUN008', 'Espirometría Pediátrica', {category_map['FUN']}, 'Función Pulmonar', 'Evaluación de función pulmonar en niños', 'No requiere preparación', 'Espirometría forzada', 1, 'Pediatría'),
('FUN009', 'Prueba de Audición Neonatal', {category_map['FUN']}, 'Audiología', 'Detección de hipoacusia en recién nacidos', 'No requiere preparación', 'Emisiones otoacústicas', 1, 'Pediatría'),
('FUN010', 'Evaluación del Desarrollo Psicomotor', {category_map['FUN']}, 'Neurodesarrollo', 'Evaluación del desarrollo neurológico', 'No requiere preparación', 'Escalas estandarizadas', 2, 'Pediatría'),
('FUN011', 'Prueba de Reflejos Neonatales', {category_map['FUN']}, 'Neurología', 'Evaluación de reflejos primitivos', 'No requiere preparación', 'Examen neurológico', 1, 'Pediatría'),
('FUN012', 'Prueba de Tamiz Visual', {category_map['FUN']}, 'Oftalmología', 'Detección de problemas visuales', 'No requiere preparación', 'Reflejo rojo', 1, 'Pediatría'),

-- Estudios de Biopsia
('BIO001', 'Biopsia Cervical', {category_map['BIP']}, 'Biopsia', 'Obtención de muestra cervical', 'No requiere preparación', 'Biopsia dirigida', 1, 'Ginecología'),
('BIO002', 'Biopsia Endometrial', {category_map['BIP']}, 'Biopsia', 'Obtención de muestra endometrial', 'No requiere preparación', 'Biopsia por aspiración', 1, 'Ginecología'),
('BIO003', 'Biopsia de Mama', {category_map['BIP']}, 'Biopsia', 'Obtención de muestra mamaria', 'No requiere preparación', 'Biopsia con aguja gruesa', 2, 'Ginecología'),
('BIO004', 'Biopsia de Ganglio Linfático', {category_map['BIP']}, 'Biopsia', 'Obtención de muestra ganglionar', 'No requiere preparación', 'Biopsia por aspiración', 2, 'Medicina General'),

-- Estudios Genéticos
('GEN001', 'Cariotipo', {category_map['GEN']}, 'Genética', 'Análisis cromosómico', 'No requiere preparación', 'Citogenética', 168, 'Genética'),
('GEN002', 'Prueba de Paternidad', {category_map['GEN']}, 'Genética', 'Determinación de paternidad', 'No requiere preparación', 'PCR', 72, 'Genética'),
('GEN003', 'Tamiz Genético Preconcepcional', {category_map['GEN']}, 'Genética', 'Detección de portadores de enfermedades genéticas', 'No requiere preparación', 'Secuenciación', 168, 'Genética')
ON CONFLICT (code) DO NOTHING;
"""
        
        # Escribir archivo SQL corregido
        with open('insert_additional_studies_catalog_corrected.sql', 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        logger.info("Archivo SQL corregido generado: insert_additional_studies_catalog_corrected.sql")
        
    except Exception as e:
        logger.error(f"Error al generar SQL: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    generate_correct_sql()



