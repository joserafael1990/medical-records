#!/usr/bin/env python3
"""
Create diagnosis catalog tables step by step
"""

import os
import sys
sys.path.append('/app')

from database import engine, Base
from models.diagnosis import DiagnosisCategory, DiagnosisCatalog, DiagnosisRecommendation, DiagnosisDifferential
from sqlalchemy import text

def create_diagnosis_tables():
    """Create diagnosis catalog tables"""
    
    print("🚀 Creating diagnosis catalog tables...")
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine, tables=[
            DiagnosisCategory.__table__,
            DiagnosisCatalog.__table__,
            DiagnosisRecommendation.__table__,
            DiagnosisDifferential.__table__
        ])
        
        print("✅ Diagnosis tables created successfully!")
        
        # Insert basic data
        with engine.connect() as conn:
            # Insert main CIE-10 categories
            categories_sql = """
            INSERT INTO diagnosis_categories (code, name, description, level) VALUES
            ('A00-B99', 'Ciertas enfermedades infecciosas y parasitarias', 'Enfermedades causadas por agentes infecciosos y parasitarios', 1),
            ('C00-D49', 'Neoplasias', 'Tumores benignos y malignos', 1),
            ('D50-D89', 'Enfermedades de la sangre y de los órganos hematopoyéticos', 'Trastornos de la sangre y sistema inmunitario', 1),
            ('E00-E89', 'Endocrinas, nutricionales y metabólicas', 'Trastornos endocrinos, nutricionales y metabólicos', 1),
            ('F01-F99', 'Trastornos mentales y del comportamiento', 'Enfermedades mentales y del comportamiento', 1),
            ('G00-G99', 'Enfermedades del sistema nervioso', 'Trastornos del sistema nervioso central y periférico', 1),
            ('H00-H59', 'Enfermedades del ojo y sus anexos', 'Trastornos oculares y de estructuras relacionadas', 1),
            ('H60-H95', 'Enfermedades del oído y de la apófisis mastoides', 'Trastornos del oído y estructuras relacionadas', 1),
            ('I00-I99', 'Enfermedades del sistema circulatorio', 'Trastornos cardiovasculares', 1),
            ('J00-J99', 'Enfermedades del sistema respiratorio', 'Trastornos del sistema respiratorio', 1),
            ('K00-K95', 'Enfermedades del sistema digestivo', 'Trastornos del sistema digestivo', 1),
            ('L00-L99', 'Enfermedades de la piel y del tejido subcutáneo', 'Trastornos dermatológicos', 1),
            ('M00-M99', 'Enfermedades del sistema osteomuscular', 'Trastornos musculoesqueléticos', 1),
            ('N00-N99', 'Enfermedades del sistema genitourinario', 'Trastornos del sistema genitourinario', 1),
            ('O00-O9A', 'Embarazo, parto y puerperio', 'Complicaciones del embarazo, parto y puerperio', 1),
            ('P00-P96', 'Ciertas afecciones originadas en el período perinatal', 'Trastornos del período perinatal', 1),
            ('Q00-Q99', 'Malformaciones congénitas', 'Anomalías congénitas y cromosómicas', 1),
            ('R00-R94', 'Síntomas, signos y hallazgos anormales', 'Síntomas y signos clínicos', 1),
            ('S00-T88', 'Traumatismos, envenenamientos y otras consecuencias', 'Lesiones y envenenamientos', 1),
            ('U00-U85', 'Causas externas de morbimortalidad', 'Factores externos de morbilidad y mortalidad', 1),
            ('V01-Y99', 'Causas externas de morbilidad y mortalidad', 'Causas externas de lesiones', 1),
            ('Z00-Z99', 'Factores que influyen en el estado de salud', 'Factores que influyen en el estado de salud', 1)
            ON CONFLICT (code) DO NOTHING;
            """
            
            conn.execute(text(categories_sql))
            print("✅ Main CIE-10 categories inserted")
            
            # Insert subcategories
            subcategories_sql = """
            INSERT INTO diagnosis_categories (code, name, description, parent_id, level) VALUES
            ('A00-A09', 'Enfermedades infecciosas intestinales', 'Infecciones del tracto gastrointestinal', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 2),
            ('A15-A19', 'Tuberculosis', 'Tuberculosis en todas sus formas', (SELECT id FROM diagnosis_categories WHERE code = 'A00-B99'), 2),
            ('I10-I16', 'Enfermedades hipertensivas', 'Hipertensión arterial', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 2),
            ('I20-I25', 'Enfermedades isquémicas del corazón', 'Cardiopatía isquémica', (SELECT id FROM diagnosis_categories WHERE code = 'I00-I99'), 2),
            ('J00-J06', 'Infecciones agudas de las vías respiratorias superiores', 'Infecciones respiratorias altas', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 2),
            ('J10-J18', 'Influenza y neumonía', 'Influenza y neumonía', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J99'), 2),
            ('E10-E14', 'Diabetes mellitus', 'Diabetes mellitus', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 2),
            ('E00-E07', 'Trastornos de la glándula tiroides', 'Trastornos tiroideos', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E89'), 2),
            ('K20-K31', 'Enfermedades del esófago, estómago y duodeno', 'Trastornos digestivos altos', (SELECT id FROM diagnosis_categories WHERE code = 'K00-K95'), 2),
            ('N00-N08', 'Enfermedades glomerulares', 'Trastornos glomerulares', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N99'), 2)
            ON CONFLICT (code) DO NOTHING;
            """
            
            conn.execute(text(subcategories_sql))
            print("✅ Subcategories inserted")
            
            # Insert common diagnoses
            diagnoses_sql = """
            INSERT INTO diagnosis_catalog (code, name, category_id, description, synonyms, severity_level, is_chronic, specialty) VALUES
            ('A09', 'Diarrea y gastroenteritis de presunto origen infeccioso', (SELECT id FROM diagnosis_categories WHERE code = 'A00-A09'), 'Diarrea infecciosa aguda', ARRAY['Gastroenteritis infecciosa', 'Diarrea aguda'], 'mild', false, 'Medicina General'),
            ('I10', 'Hipertensión esencial (primaria)', (SELECT id FROM diagnosis_categories WHERE code = 'I10-I16'), 'Hipertensión arterial sin causa identificable', ARRAY['HTA', 'Hipertensión arterial'], 'moderate', true, 'Cardiología'),
            ('I25.9', 'Enfermedad cardíaca isquémica crónica no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'I20-I25'), 'Cardiopatía isquémica crónica', ARRAY['Cardiopatía isquémica', 'Enfermedad coronaria'], 'severe', true, 'Cardiología'),
            ('J06.9', 'Infección aguda de las vías respiratorias superiores no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'J00-J06'), 'Infección respiratoria alta', ARRAY['Resfriado común', 'Infección respiratoria'], 'mild', false, 'Medicina General'),
            ('J18.9', 'Neumonía no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'J10-J18'), 'Neumonía sin especificar agente', ARRAY['Pulmonía', 'Neumonía'], 'moderate', false, 'Neumología'),
            ('E11.9', 'Diabetes mellitus tipo 2 sin complicaciones', (SELECT id FROM diagnosis_categories WHERE code = 'E10-E14'), 'Diabetes tipo 2 no complicada', ARRAY['DM2', 'Diabetes tipo 2'], 'moderate', true, 'Endocrinología'),
            ('E03.9', 'Hipotiroidismo no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'E00-E07'), 'Hipotiroidismo sin especificar', ARRAY['Hipotiroidismo', 'Tiroides hipoactiva'], 'moderate', true, 'Endocrinología'),
            ('K21.9', 'Enfermedad por reflujo gastroesofágico sin esofagitis', (SELECT id FROM diagnosis_categories WHERE code = 'K20-K31'), 'Reflujo gastroesofágico', ARRAY['ERGE', 'Reflujo'], 'mild', true, 'Gastroenterología'),
            ('N39.0', 'Infección del tracto urinario no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'N00-N08'), 'Infección urinaria', ARRAY['ITU', 'Infección urinaria'], 'moderate', false, 'Urología'),
            ('F32.9', 'Episodio depresivo no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Depresión sin especificar', ARRAY['Depresión', 'Trastorno depresivo'], 'moderate', true, 'Psiquiatría'),
            ('F41.9', 'Trastorno de ansiedad no especificado', (SELECT id FROM diagnosis_categories WHERE code = 'F01-F99'), 'Trastorno de ansiedad', ARRAY['Ansiedad', 'Trastorno ansioso'], 'moderate', true, 'Psiquiatría'),
            ('G43.9', 'Migraña no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'G00-G99'), 'Migraña sin especificar', ARRAY['Jaqueca', 'Migraña'], 'moderate', true, 'Neurología'),
            ('L30.9', 'Dermatitis no especificada', (SELECT id FROM diagnosis_categories WHERE code = 'L00-L99'), 'Inflamación de la piel', ARRAY['Eczema', 'Dermatitis'], 'mild', false, 'Dermatología'),
            ('M25.5', 'Dolor en articulación', (SELECT id FROM diagnosis_categories WHERE code = 'M00-M99'), 'Artralgia', ARRAY['Dolor articular', 'Artralgia'], 'mild', false, 'Reumatología')
            ON CONFLICT (code) DO NOTHING;
            """
            
            conn.execute(text(diagnoses_sql))
            print("✅ Common diagnoses inserted")
            
            conn.commit()
        
        # Verify results
        with engine.connect() as conn:
            categories_count = conn.execute(text('SELECT COUNT(*) FROM diagnosis_categories')).scalar()
            diagnoses_count = conn.execute(text('SELECT COUNT(*) FROM diagnosis_catalog')).scalar()
            
            print(f"\n📊 Final verification:")
            print(f"📊 Diagnosis Categories: {categories_count}")
            print(f"📊 Diagnosis Catalog: {diagnoses_count}")
        
        print("\n✅ Diagnosis catalog setup completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        raise

if __name__ == "__main__":
    create_diagnosis_tables()
