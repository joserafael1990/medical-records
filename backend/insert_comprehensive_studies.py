#!/usr/bin/env python3
"""
Insert comprehensive laboratory studies catalog directly
"""

import os
import sys
sys.path.append('/app')

from database import engine, StudyCategory, StudyCatalog, StudyNormalValue, StudyTemplate, StudyTemplateItem
from sqlalchemy.orm import sessionmaker

def insert_comprehensive_studies():
    """Insert comprehensive laboratory studies catalog"""
    
    print("🚀 Starting comprehensive laboratory studies catalog insertion...")
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        # Clear existing data
        print("🧹 Clearing existing data...")
        session.query(StudyTemplateItem).delete()
        session.query(StudyTemplate).delete()
        session.query(StudyNormalValue).delete()
        session.query(StudyCatalog).delete()
        session.query(StudyCategory).delete()
        session.commit()
        print("✅ Existing data cleared")
        
        # Insert categories
        print("📝 Inserting study categories...")
        categories_data = [
            ('LAB', 'Laboratorio Clínico', 'Estudios de laboratorio clínico general'),
            ('HEM', 'Hematología', 'Estudios de células sanguíneas y coagulación'),
            ('BIO', 'Bioquímica', 'Estudios de química sanguínea y metabolitos'),
            ('MIC', 'Microbiología', 'Estudios microbiológicos y cultivos'),
            ('INM', 'Inmunología', 'Estudios inmunológicos y serología'),
            ('URO', 'Uroanálisis', 'Estudios de orina y función renal'),
            ('END', 'Endocrinología', 'Estudios hormonales y endocrinos'),
            ('GEN', 'Genética', 'Estudios genéticos y moleculares'),
            ('IMG', 'Imagenología', 'Estudios de imagen médica'),
            ('FUN', 'Funcionales', 'Estudios de función orgánica'),
            ('BIP', 'Biopsias', 'Estudios histopatológicos'),
            ('TOX', 'Toxicología', 'Estudios toxicológicos y drogas'),
            ('CAR', 'Cardiología', 'Estudios cardiológicos específicos'),
            ('NEU', 'Neurología', 'Estudios neurológicos'),
            ('DER', 'Dermatología', 'Estudios dermatológicos'),
            ('GIN', 'Ginecología', 'Estudios ginecológicos y obstétricos'),
            ('PED', 'Pediatría', 'Estudios pediátricos específicos'),
            ('GER', 'Geriatría', 'Estudios geriátricos específicos')
        ]
        
        categories = {}
        for code, name, description in categories_data:
            category = StudyCategory(code=code, name=name, description=description)
            session.add(category)
            session.flush()  # Get the ID
            categories[code] = category.id
        
        session.commit()
        print(f"✅ Inserted {len(categories)} categories")
        
        # Insert studies
        print("📝 Inserting studies...")
        studies_data = [
            # Hematology
            ('HEM001', 'Biometría Hemática Completa', 'HEM', 'Hematología Básica', 'Conteo completo de células sanguíneas incluyendo eritrocitos, leucocitos, plaquetas, hemoglobina y hematocrito', 'No requiere ayuno', 'Citometría de flujo', 2, 'Medicina General'),
            ('HEM002', 'Biometría Hemática con Plaquetas', 'HEM', 'Hematología Básica', 'Conteo de células sanguíneas con enfoque en plaquetas', 'No requiere ayuno', 'Citometría de flujo', 2, 'Medicina General'),
            ('HEM003', 'Hemoglobina y Hematocrito', 'HEM', 'Hematología Básica', 'Determinación de hemoglobina y hematocrito', 'No requiere ayuno', 'Espectrofotometría', 1, 'Medicina General'),
            ('HEM004', 'Conteo de Reticulocitos', 'HEM', 'Hematología Básica', 'Conteo de reticulocitos para evaluación de eritropoyesis', 'No requiere ayuno', 'Microscopía', 4, 'Hematología'),
            ('HEM005', 'Velocidad de Sedimentación Globular (VSG)', 'HEM', 'Hematología Básica', 'Velocidad de sedimentación de eritrocitos', 'No requiere ayuno', 'Sedimentación', 1, 'Medicina General'),
            
            # Biochemistry
            ('BIO001', 'Química Sanguínea de 6 Elementos', 'BIO', 'Química Básica', 'Glucosa, urea, creatinina, ácido úrico, colesterol total, triglicéridos', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Medicina General'),
            ('BIO002', 'Química Sanguínea de 12 Elementos', 'BIO', 'Química Básica', 'Perfil metabólico básico extendido', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Medicina General'),
            ('BIO003', 'Química Sanguínea de 20 Elementos', 'BIO', 'Química Básica', 'Perfil metabólico completo', 'Ayuno de 12 horas', 'Espectrofotometría', 4, 'Medicina General'),
            ('BIO004', 'Glucosa en Ayunas', 'BIO', 'Química Básica', 'Determinación de glucosa en ayunas', 'Ayuno de 8 horas', 'Glucosa oxidasa', 2, 'Endocrinología'),
            ('BIO005', 'Glucosa Postprandial', 'BIO', 'Química Básica', 'Glucosa 2 horas postprandial', 'Ayuno de 8 horas, comida controlada', 'Glucosa oxidasa', 2, 'Endocrinología'),
            
            # Endocrinology
            ('END001', 'Perfil Tiroideo Básico', 'END', 'Función Tiroidea', 'TSH, T4L', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
            ('END002', 'Perfil Tiroideo Completo', 'END', 'Función Tiroidea', 'TSH, T4L, T3L, T4 total, T3 total', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
            ('END003', 'Hormona Estimulante de Tiroides (TSH)', 'END', 'Función Tiroidea', 'TSH ultrasensible', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
            ('END004', 'Tiroxina Libre (T4L)', 'END', 'Función Tiroidea', 'T4 libre', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
            ('END005', 'Triyodotironina Libre (T3L)', 'END', 'Función Tiroidea', 'T3 libre', 'No requiere ayuno', 'Inmunoensayo', 24, 'Endocrinología'),
            
            # Microbiology
            ('MIC001', 'Cultivo de Orina y Antibiograma', 'MIC', 'Cultivos', 'Cultivo bacteriano de orina con sensibilidad', 'Orina de chorro medio', 'Cultivo bacteriano', 72, 'Urología'),
            ('MIC002', 'Urocultivo Simple', 'MIC', 'Cultivos', 'Cultivo de orina sin antibiograma', 'Orina de chorro medio', 'Cultivo bacteriano', 48, 'Urología'),
            ('MIC003', 'Cultivo de Orina con Conteo', 'MIC', 'Cultivos', 'Cultivo con conteo de colonias', 'Orina de chorro medio', 'Cultivo bacteriano', 48, 'Urología'),
            ('MIC004', 'Hemocultivo', 'MIC', 'Cultivos', 'Cultivo de sangre para bacterias', 'No requiere ayuno', 'Cultivo bacteriano', 72, 'Medicina General'),
            ('MIC005', 'Hemocultivo con Antibiograma', 'MIC', 'Cultivos', 'Hemocultivo con sensibilidad', 'No requiere ayuno', 'Cultivo bacteriano', 72, 'Medicina General'),
            
            # Immunology
            ('INM001', 'Factor Reumatoide', 'INM', 'Autoinmunidad', 'Factor reumatoide IgM', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
            ('INM002', 'Anticuerpos Antinucleares (ANA)', 'INM', 'Autoinmunidad', 'Anticuerpos antinucleares', 'No requiere ayuno', 'Inmunofluorescencia', 24, 'Reumatología'),
            ('INM003', 'Anti-ADN de Doble Cadena', 'INM', 'Autoinmunidad', 'Anti-dsDNA', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
            ('INM004', 'Anti-Sm', 'INM', 'Autoinmunidad', 'Anticuerpos anti-Smith', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
            ('INM005', 'Anti-RNP', 'INM', 'Autoinmunidad', 'Anticuerpos anti-RNP', 'No requiere ayuno', 'Inmunoensayo', 24, 'Reumatología'),
            
            # Urinalysis
            ('URO001', 'Examen General de Orina', 'URO', 'Uroanálisis Básico', 'Análisis físico, químico y microscópico', 'Primera orina de la mañana', 'Microscopía y tiras reactivas', 2, 'Medicina General'),
            ('URO002', 'Uroanálisis Completo', 'URO', 'Uroanálisis Básico', 'Análisis completo con sedimento', 'Primera orina de la mañana', 'Microscopía y tiras reactivas', 2, 'Medicina General'),
            ('URO003', 'Tira Reactiva de Orina', 'URO', 'Uroanálisis Básico', 'Análisis químico con tira reactiva', 'Primera orina de la mañana', 'Tiras reactivas', 1, 'Medicina General'),
            ('URO004', 'Sedimento Urinario', 'URO', 'Uroanálisis Básico', 'Examen microscópico del sedimento', 'Primera orina de la mañana', 'Microscopía', 2, 'Medicina General'),
            ('URO005', 'Proteínas en Orina 24h', 'URO', 'Uroanálisis Especial', 'Proteínas totales en orina 24h', 'Recolección 24h', 'Espectrofotometría', 24, 'Nefrología'),
        ]
        
        studies = {}
        for code, name, category_code, subcategory, description, preparation, methodology, duration_hours, specialty in studies_data:
            study = StudyCatalog(
                code=code,
                name=name,
                category_id=categories[category_code],
                subcategory=subcategory,
                description=description,
                preparation=preparation,
                methodology=methodology,
                duration_hours=duration_hours,
                specialty=specialty
            )
            session.add(study)
            session.flush()  # Get the ID
            studies[code] = study.id
        
        session.commit()
        print(f"✅ Inserted {len(studies)} studies")
        
        # Insert normal values
        print("📝 Inserting normal values...")
        normal_values_data = [
            ('HEM001', 18, 99, 'B', 4.5, 5.5, 'millones/μL', 'Eritrocitos'),
            ('HEM001', 18, 99, 'B', 12.0, 16.0, 'g/dL', 'Hemoglobina'),
            ('HEM001', 18, 99, 'B', 36.0, 46.0, '%', 'Hematocrito'),
            ('HEM001', 18, 99, 'B', 4000.0, 10000.0, 'μL', 'Leucocitos'),
            ('HEM001', 18, 99, 'B', 150000.0, 450000.0, 'μL', 'Plaquetas'),
            ('BIO004', 18, 99, 'B', 70.0, 100.0, 'mg/dL', 'Valores normales'),
            ('BIO004', 18, 99, 'B', 100.0, 125.0, 'mg/dL', 'Prediabetes'),
            ('BIO004', 18, 99, 'B', 126.0, 999.0, 'mg/dL', 'Diabetes'),
            ('END003', 18, 99, 'B', 0.4, 4.0, 'mUI/L', 'TSH'),
            ('END004', 18, 99, 'B', 0.8, 1.8, 'ng/dL', 'T4L'),
        ]
        
        for study_code, age_min, age_max, gender, min_value, max_value, unit, notes in normal_values_data:
            if study_code in studies:
                normal_value = StudyNormalValue(
                    study_id=studies[study_code],
                    age_min=age_min,
                    age_max=age_max,
                    gender=gender,
                    min_value=min_value,
                    max_value=max_value,
                    unit=unit,
                    notes=notes
                )
                session.add(normal_value)
        
        session.commit()
        print(f"✅ Inserted {len(normal_values_data)} normal values")
        
        # Insert templates
        print("📝 Inserting study templates...")
        templates_data = [
            ('Chequeo General', 'Estudios básicos para evaluación general de salud', 'Medicina General', True),
            ('Monitoreo de Diabetes', 'Estudios para seguimiento de diabetes mellitus', 'Endocrinología', True),
            ('Evaluación Cardíaca', 'Estudios para evaluación cardiovascular', 'Cardiología', True),
            ('Control Prenatal', 'Estudios para seguimiento prenatal', 'Ginecología', True),
            ('Evaluación Tiroidea', 'Estudios para evaluación de la función tiroidea', 'Endocrinología', False),
        ]
        
        templates = {}
        for name, description, specialty, is_default in templates_data:
            template = StudyTemplate(
                name=name,
                description=description,
                specialty=specialty,
                is_default=is_default
            )
            session.add(template)
            session.flush()  # Get the ID
            templates[name] = template.id
        
        session.commit()
        print(f"✅ Inserted {len(templates)} templates")
        
        # Insert template items
        print("📝 Inserting template items...")
        template_items_data = [
            ('Chequeo General', ['HEM001', 'BIO001', 'URO001']),
            ('Monitoreo de Diabetes', ['BIO004', 'BIO001', 'URO001']),
            ('Evaluación Cardíaca', ['BIO001', 'HEM001']),
            ('Control Prenatal', ['HEM001', 'BIO001', 'URO001']),
            ('Evaluación Tiroidea', ['END001', 'END003', 'END004']),
        ]
        
        for template_name, study_codes in template_items_data:
            for i, study_code in enumerate(study_codes):
                if study_code in studies and template_name in templates:
                    template_item = StudyTemplateItem(
                        template_id=templates[template_name],
                        study_id=studies[study_code],
                        order_index=i
                    )
                    session.add(template_item)
        
        session.commit()
        print("✅ Inserted template items")
        
        # Final verification
        print("\n📊 Final verification:")
        categories_count = session.query(StudyCategory).count()
        studies_count = session.query(StudyCatalog).count()
        normal_values_count = session.query(StudyNormalValue).count()
        templates_count = session.query(StudyTemplate).count()
        template_items_count = session.query(StudyTemplateItem).count()
        
        print(f"📊 Study Categories: {categories_count}")
        print(f"📊 Study Catalog: {studies_count}")
        print(f"📊 Normal Values: {normal_values_count}")
        print(f"📊 Study Templates: {templates_count}")
        print(f"📊 Template Items: {template_items_count}")
        
        print("\n✅ Comprehensive laboratory studies catalog insertion completed!")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    insert_comprehensive_studies()
