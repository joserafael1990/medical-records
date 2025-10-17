#!/usr/bin/env python3
"""
Script to insert complete diagnosis data according to CIE-10 standards
Includes categories, specialties, and comprehensive diagnosis catalog
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import get_db
from models.diagnosis import DiagnosisCategory, DiagnosisCatalog
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CIE-10 Categories (Level 1)
CIE10_CATEGORIES = [
    ("A00-B99", "Ciertas enfermedades infecciosas y parasitarias", 1),
    ("C00-D49", "Neoplasias", 1),
    ("D50-D89", "Enfermedades de la sangre y de los órganos hematopoyéticos", 1),
    ("E00-E89", "Enfermedades endocrinas, nutricionales y metabólicas", 1),
    ("F01-F99", "Trastornos mentales y del comportamiento", 1),
    ("G00-G99", "Enfermedades del sistema nervioso", 1),
    ("H00-H59", "Enfermedades del ojo y sus anexos", 1),
    ("H60-H95", "Enfermedades del oído y de la apófisis mastoides", 1),
    ("I00-I99", "Enfermedades del sistema circulatorio", 1),
    ("J00-J99", "Enfermedades del sistema respiratorio", 1),
    ("K00-K93", "Enfermedades del sistema digestivo", 1),
    ("L00-L99", "Enfermedades de la piel y del tejido subcutáneo", 1),
    ("M00-M99", "Enfermedades del sistema osteomuscular y del tejido conectivo", 1),
    ("N00-N99", "Enfermedades del sistema genitourinario", 1),
    ("O00-O9A", "Embarazo, parto y puerperio", 1),
    ("P00-P96", "Ciertas afecciones originadas en el período perinatal", 1),
    ("Q00-Q99", "Malformaciones congénitas, deformidades y anomalías cromosómicas", 1),
    ("R00-R94", "Síntomas, signos y hallazgos anormales clínicos y de laboratorio", 1),
    ("S00-T88", "Traumatismos, envenenamientos y algunas otras consecuencias de causas externas", 1),
    ("U00-U85", "Códigos para situaciones especiales", 1),
    ("V01-Y99", "Causas externas de morbilidad y mortalidad", 1),
    ("Z00-Z99", "Factores que influyen en el estado de salud y contacto con los servicios de salud", 1)
]

# Medical Specialties
MEDICAL_SPECIALTIES = [
    "Medicina Interna",
    "Cardiología",
    "Endocrinología",
    "Gastroenterología",
    "Neurología",
    "Psiquiatría",
    "Dermatología",
    "Oftalmología",
    "Otorrinolaringología",
    "Neumología",
    "Nefrología",
    "Hematología",
    "Oncología",
    "Reumatología",
    "Infectología",
    "Medicina Familiar",
    "Pediatría",
    "Ginecología y Obstetricia",
    "Urología",
    "Traumatología",
    "Cirugía General",
    "Cirugía Cardiovascular",
    "Neurocirugía",
    "Cirugía Plástica",
    "Anestesiología",
    "Radiología",
    "Patología",
    "Medicina de Emergencias",
    "Medicina Preventiva",
    "Medicina del Trabajo",
    "Medicina Deportiva",
    "Geriatría",
    "Alergología",
    "Inmunología",
    "Genética Médica",
    "Medicina Nuclear",
    "Fisiatría",
    "Medicina Paliativa"
]

# Comprehensive Diagnosis Catalog (CIE-10)
DIAGNOSIS_CATALOG = [
    # A00-B99: Ciertas enfermedades infecciosas y parasitarias
    ("A00", "Cólera", "A00-B99", "Infección bacteriana aguda del intestino", "severe", True, True, "Infectología"),
    ("A01", "Fiebres tifoidea y paratifoidea", "A00-B99", "Infección bacteriana sistémica", "severe", False, True, "Infectología"),
    ("A09", "Diarrea y gastroenteritis de presunto origen infeccioso", "A00-B99", "Inflamación del tracto gastrointestinal", "mild", False, True, "Gastroenterología"),
    ("B00", "Infección por herpesvirus [herpes simple]", "A00-B99", "Infección viral recurrente", "moderate", True, True, "Dermatología"),
    ("B15", "Hepatitis A", "A00-B99", "Inflamación viral del hígado", "moderate", False, True, "Gastroenterología"),
    ("B16", "Hepatitis B", "A00-B99", "Inflamación viral crónica del hígado", "severe", True, True, "Gastroenterología"),
    ("B17", "Hepatitis C", "A00-B99", "Inflamación viral crónica del hígado", "severe", True, True, "Gastroenterología"),
    
    # C00-D49: Neoplasias
    ("C00", "Neoplasia maligna del labio", "C00-D49", "Tumor maligno del labio", "severe", True, False, "Oncología"),
    ("C15", "Neoplasia maligna del esófago", "C00-D49", "Tumor maligno del esófago", "severe", True, False, "Oncología"),
    ("C16", "Neoplasia maligna del estómago", "C00-D49", "Tumor maligno del estómago", "severe", True, False, "Oncología"),
    ("C18", "Neoplasia maligna del colon", "C00-D49", "Tumor maligno del colon", "severe", True, False, "Oncología"),
    ("C22", "Neoplasia maligna del hígado y de las vías biliares intrahepáticas", "C00-D49", "Tumor maligno del hígado", "severe", True, False, "Oncología"),
    ("C25", "Neoplasia maligna del páncreas", "C00-D49", "Tumor maligno del páncreas", "severe", True, False, "Oncología"),
    ("C34", "Neoplasia maligna de bronquios y pulmón", "C00-D49", "Tumor maligno del pulmón", "severe", True, False, "Neumología"),
    ("C50", "Neoplasia maligna de la mama", "C00-D49", "Tumor maligno de la mama", "severe", True, False, "Oncología"),
    ("C56", "Neoplasia maligna del ovario", "C00-D49", "Tumor maligno del ovario", "severe", True, False, "Ginecología y Obstetricia"),
    ("C61", "Neoplasia maligna de la próstata", "C00-D49", "Tumor maligno de la próstata", "severe", True, False, "Urología"),
    
    # D50-D89: Enfermedades de la sangre
    ("D50", "Anemia ferropénica", "D50-D89", "Deficiencia de hierro en la sangre", "moderate", False, False, "Hematología"),
    ("D51", "Anemia por deficiencia de vitamina B12", "D50-D89", "Deficiencia de vitamina B12", "moderate", False, False, "Hematología"),
    ("D64", "Otras anemias", "D50-D89", "Diversas formas de anemia", "moderate", False, False, "Hematología"),
    ("D69", "Púrpura y otras afecciones hemorrágicas", "D50-D89", "Trastornos de la coagulación", "moderate", False, False, "Hematología"),
    
    # E00-E89: Enfermedades endocrinas
    ("E10", "Diabetes mellitus tipo 1", "E00-E89", "Diabetes insulinodependiente", "severe", True, False, "Endocrinología"),
    ("E11", "Diabetes mellitus tipo 2", "E00-E89", "Diabetes no insulinodependiente", "severe", True, False, "Endocrinología"),
    ("E03", "Hipotiroidismo", "E00-E89", "Deficiencia de hormonas tiroideas", "moderate", True, False, "Endocrinología"),
    ("E04", "Bocio no tóxico", "E00-E89", "Agrandamiento de la tiroides", "mild", False, False, "Endocrinología"),
    ("E05", "Tirotoxicosis [hipertiroidismo]", "E00-E89", "Exceso de hormonas tiroideas", "severe", False, False, "Endocrinología"),
    ("E66", "Obesidad", "E00-E89", "Exceso de peso corporal", "moderate", True, False, "Endocrinología"),
    ("E78", "Trastornos del metabolismo de las lipoproteínas", "E00-E89", "Alteraciones del colesterol", "moderate", True, False, "Endocrinología"),
    
    # F01-F99: Trastornos mentales
    ("F10", "Trastornos mentales y del comportamiento debidos al uso de alcohol", "F01-F99", "Adicción al alcohol", "severe", True, False, "Psiquiatría"),
    ("F17", "Trastornos mentales y del comportamiento debidos al uso de tabaco", "F01-F99", "Adicción al tabaco", "moderate", True, False, "Psiquiatría"),
    ("F20", "Esquizofrenia", "F01-F99", "Trastorno psicótico crónico", "severe", True, False, "Psiquiatría"),
    ("F32", "Episodio depresivo", "F01-F99", "Trastorno del estado de ánimo", "moderate", False, False, "Psiquiatría"),
    ("F41", "Otros trastornos de ansiedad", "F01-F99", "Trastornos de ansiedad", "moderate", True, False, "Psiquiatría"),
    ("F43", "Trastornos de adaptación", "F01-F99", "Respuesta al estrés", "moderate", False, False, "Psiquiatría"),
    
    # G00-G99: Enfermedades del sistema nervioso
    ("G40", "Epilepsia", "G00-G99", "Trastorno convulsivo", "severe", True, False, "Neurología"),
    ("G43", "Migraña", "G00-G99", "Cefalea vascular", "moderate", True, False, "Neurología"),
    ("G93", "Otros trastornos del encéfalo", "G00-G99", "Trastornos cerebrales diversos", "moderate", False, False, "Neurología"),
    ("G95", "Otras enfermedades de la médula espinal", "G00-G99", "Trastornos medulares", "severe", True, False, "Neurología"),
    
    # H00-H59: Enfermedades del ojo
    ("H25", "Catarata senil", "H00-H59", "Opacidad del cristalino", "moderate", True, False, "Oftalmología"),
    ("H26", "Otras cataratas", "H00-H59", "Opacidad del cristalino", "moderate", False, False, "Oftalmología"),
    ("H40", "Glaucoma", "H00-H59", "Presión intraocular elevada", "severe", True, False, "Oftalmología"),
    ("H52", "Trastornos de la refracción y de la acomodación", "H00-H59", "Defectos de visión", "mild", True, False, "Oftalmología"),
    
    # H60-H95: Enfermedades del oído
    ("H65", "Otitis media no supurativa", "H60-H95", "Inflamación del oído medio", "mild", False, False, "Otorrinolaringología"),
    ("H66", "Otitis media supurativa y la no especificada", "H60-H95", "Infección del oído medio", "moderate", False, False, "Otorrinolaringología"),
    ("H90", "Hipoacusia conductiva y neurosensorial", "H60-H95", "Pérdida de audición", "moderate", True, False, "Otorrinolaringología"),
    
    # I00-I99: Enfermedades del sistema circulatorio
    ("I10", "Hipertensión esencial (primaria)", "I00-I99", "Presión arterial elevada", "moderate", True, False, "Cardiología"),
    ("I20", "Angina de pecho", "I00-I99", "Dolor torácico por isquemia", "severe", True, False, "Cardiología"),
    ("I21", "Infarto agudo de miocardio", "I00-I99", "Muerte del tejido cardíaco", "critical", False, False, "Cardiología"),
    ("I25", "Enfermedad cardíaca isquémica crónica", "I00-I99", "Enfermedad coronaria crónica", "severe", True, False, "Cardiología"),
    ("I48", "Fibrilación y aleteo auricular", "I00-I99", "Arritmia cardíaca", "severe", True, False, "Cardiología"),
    ("I50", "Insuficiencia cardíaca", "I00-I99", "Fallencia del corazón", "severe", True, False, "Cardiología"),
    ("I63", "Infarto cerebral", "I00-I99", "Accidente cerebrovascular isquémico", "critical", False, False, "Neurología"),
    ("I64", "Accidente cerebrovascular, no especificado como hemorrágico o isquémico", "I00-I99", "Accidente cerebrovascular", "critical", False, False, "Neurología"),
    
    # J00-J99: Enfermedades del sistema respiratorio
    ("J06", "Infecciones agudas de las vías respiratorias superiores", "J00-J99", "Infección respiratoria alta", "mild", False, True, "Medicina Interna"),
    ("J15", "Neumonía bacteriana", "J00-J99", "Infección pulmonar bacteriana", "severe", False, True, "Neumología"),
    ("J18", "Neumonía, organismo no especificado", "J00-J99", "Infección pulmonar", "severe", False, True, "Neumología"),
    ("J40", "Bronquitis, no especificada como aguda o crónica", "J00-J99", "Inflamación de los bronquios", "moderate", False, False, "Neumología"),
    ("J44", "Otras enfermedades pulmonares obstructivas crónicas", "J00-J99", "Enfermedad pulmonar obstructiva", "severe", True, False, "Neumología"),
    ("J45", "Asma", "J00-J99", "Enfermedad inflamatoria de las vías respiratorias", "moderate", True, False, "Neumología"),
    
    # K00-K93: Enfermedades del sistema digestivo
    ("K21", "Enfermedad por reflujo gastroesofágico", "K00-K93", "Reflujo ácido", "moderate", True, False, "Gastroenterología"),
    ("K25", "Úlcera gástrica", "K00-K93", "Lesión en el estómago", "severe", False, False, "Gastroenterología"),
    ("K29", "Gastritis y duodenitis", "K00-K93", "Inflamación del estómago", "moderate", False, False, "Gastroenterología"),
    ("K35", "Apendicitis aguda", "K00-K93", "Inflamación del apéndice", "severe", False, False, "Cirugía General"),
    ("K40", "Hernia inguinal", "K00-K93", "Protrusión intestinal", "moderate", False, False, "Cirugía General"),
    ("K59", "Otros trastornos funcionales del intestino", "K00-K93", "Trastornos intestinales", "mild", False, False, "Gastroenterología"),
    ("K80", "Colelitiasis", "K00-K93", "Cálculos en la vesícula", "moderate", False, False, "Gastroenterología"),
    
    # L00-L99: Enfermedades de la piel
    ("L30", "Dermatitis, no especificada", "L00-L99", "Inflamación de la piel", "mild", False, False, "Dermatología"),
    ("L50", "Urticaria", "L00-L99", "Reacción alérgica cutánea", "mild", False, False, "Dermatología"),
    ("L70", "Acné", "L00-L99", "Trastorno de las glándulas sebáceas", "mild", False, False, "Dermatología"),
    ("L93", "Lupus eritematoso", "L00-L99", "Enfermedad autoinmune", "severe", True, False, "Reumatología"),
    
    # M00-M99: Enfermedades osteomusculares
    ("M05", "Artritis reumatoide seropositiva", "M00-M99", "Enfermedad articular inflamatoria", "severe", True, False, "Reumatología"),
    ("M19", "Artrosis, no especificada", "M00-M99", "Degeneración articular", "moderate", True, False, "Reumatología"),
    ("M25", "Otros trastornos articulares, no clasificados en otra parte", "M00-M99", "Trastornos articulares", "moderate", False, False, "Reumatología"),
    ("M79", "Otros trastornos de los tejidos blandos, no clasificados en otra parte", "M00-M99", "Trastornos musculares", "moderate", False, False, "Reumatología"),
    
    # N00-N99: Enfermedades del sistema genitourinario
    ("N18", "Enfermedad renal crónica", "N00-N99", "Fallencia renal progresiva", "severe", True, False, "Nefrología"),
    ("N20", "Cálculos del riñón y del uréter", "N00-N99", "Cálculos renales", "severe", False, False, "Urología"),
    ("N30", "Cistitis", "N00-N99", "Inflamación de la vejiga", "moderate", False, False, "Urología"),
    ("N39", "Otros trastornos del sistema urinario", "N00-N99", "Trastornos urinarios", "moderate", False, False, "Urología"),
    ("N40", "Hiperplasia de la próstata", "N00-N99", "Agrandamiento prostático", "moderate", True, False, "Urología"),
    ("N80", "Endometriosis", "N00-N99", "Tejido endometrial fuera del útero", "moderate", True, False, "Ginecología y Obstetricia"),
    
    # R00-R94: Síntomas y signos
    ("R06", "Anormalidades de la respiración", "R00-R94", "Trastornos respiratorios", "moderate", False, False, "Neumología"),
    ("R10", "Dolor abdominal y pélvico", "R00-R94", "Dolor en el abdomen", "moderate", False, False, "Gastroenterología"),
    ("R50", "Fiebre de origen desconocido", "R00-R94", "Fiebre sin causa aparente", "moderate", False, False, "Medicina Interna"),
    ("R51", "Cefalea", "R00-R94", "Dolor de cabeza", "mild", False, False, "Neurología"),
    ("R06", "Anormalidades de la respiración", "R00-R94", "Trastornos respiratorios", "moderate", False, False, "Neumología"),
]

def insert_categories(db: Session):
    """Insert CIE-10 categories"""
    logger.info("Inserting CIE-10 categories...")
    
    for code, name, level in CIE10_CATEGORIES:
        # Check if category already exists
        existing = db.query(DiagnosisCategory).filter(DiagnosisCategory.code == code).first()
        if existing:
            logger.info(f"Category {code} already exists, skipping...")
            continue
            
        category = DiagnosisCategory(
            code=code,
            name=name,
            level=level,
            is_active=True
        )
        db.add(category)
        logger.info(f"Added category: {code} - {name}")
    
    db.commit()
    logger.info("Categories inserted successfully")

def insert_specialties():
    """Insert medical specialties into the database"""
    logger.info("Inserting medical specialties...")
    
    db = next(get_db())
    
    # Create specialties table if it doesn't exist
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS medical_specialties (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    
    for specialty in MEDICAL_SPECIALTIES:
        # Check if specialty already exists
        result = db.execute(text("SELECT id FROM medical_specialties WHERE name = :name"), 
                          {"name": specialty})
        if result.fetchone():
            logger.info(f"Specialty {specialty} already exists, skipping...")
            continue
            
        db.execute(text("""
            INSERT INTO medical_specialties (name, description, is_active)
            VALUES (:name, :description, :is_active)
        """), {
            "name": specialty,
            "description": f"Especialidad médica en {specialty}",
            "is_active": True
        })
        logger.info(f"Added specialty: {specialty}")
    
    db.commit()
    db.close()
    logger.info("Specialties inserted successfully")

def insert_diagnoses(db: Session):
    """Insert diagnosis catalog"""
    logger.info("Inserting diagnosis catalog...")
    
    for code, name, category_code, description, severity, is_chronic, is_contagious, specialty in DIAGNOSIS_CATALOG:
        # Check if diagnosis already exists
        existing = db.query(DiagnosisCatalog).filter(DiagnosisCatalog.code == code).first()
        if existing:
            logger.info(f"Diagnosis {code} already exists, skipping...")
            continue
            
        # Get category ID
        category = db.query(DiagnosisCategory).filter(DiagnosisCategory.code == category_code).first()
        if not category:
            logger.warning(f"Category {category_code} not found for diagnosis {code}")
            continue
            
        diagnosis = DiagnosisCatalog(
            code=code,
            name=name,
            category_id=category.id,
            description=description,
            severity_level=severity,
            is_chronic=is_chronic,
            is_contagious=is_contagious,
            specialty=specialty,
            is_active=True
        )
        db.add(diagnosis)
        logger.info(f"Added diagnosis: {code} - {name}")
    
    db.commit()
    logger.info("Diagnosis catalog inserted successfully")

def main():
    """Main function to insert all data"""
    logger.info("Starting complete diagnosis data insertion...")
    
    db = next(get_db())
    
    try:
        # Insert categories first
        insert_categories(db)
        
        # Insert specialties
        insert_specialties()
        
        # Insert diagnoses
        insert_diagnoses(db)
        
        logger.info("All data inserted successfully!")
        
    except Exception as e:
        logger.error(f"Error inserting data: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
