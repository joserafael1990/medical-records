#!/usr/bin/env python3
"""
Script to insert comprehensive test data for Medical Records system
For user: t.garcia@avant.com
"""

import sys
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, Person, MedicalRecord, Country, State, Specialty
from sqlalchemy import create_engine, desc
from config import DATABASE_URL

def create_test_data():
    """Create comprehensive test data for medical records demonstration"""
    
    # Create database engine and session
    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(engine)
    session = Session(engine)
    
    try:
        print("🚀 Starting test data insertion...")
        
        # 1. Find or create the doctor (t.garcia@avant.com)
        doctor = session.query(Person).filter(Person.email == "t.garcia@avant.com").first()
        if not doctor:
            print("❌ Doctor t.garcia@avant.com not found. Please ensure the doctor exists in the database.")
            return
        
        print(f"✅ Found doctor: {doctor.first_name} {doctor.paternal_surname}")
        
        # 2. Use existing patients from the database 
        patients = session.query(Person).filter(Person.person_type == "patient").limit(10).all()
        
        if len(patients) < 3:
            print("❌ Not enough patients in database. Please ensure there are at least 3 patients.")
            return
            
        print(f"✅ Found {len(patients)} existing patients to use for medical records")
        
        # 3. Create comprehensive medical records
        medical_records_data = [
            # Record 1 - First Patient - Hipertensión
            {
                "patient": patients[0],
                "consultation_date": datetime.now() - timedelta(days=30),
                "chief_complaint": "Dolor de cabeza persistente y mareos ocasionales",
                "history_present_illness": "Paciente refiere cefalea de tipo tensional de 2 semanas de evolución, acompañada de mareos matutinos y sensación de pesadez en la nuca. Los síntomas empeoran con el estrés laboral.",
                "family_history": "Madre con hipertensión arterial diagnosticada a los 50 años. Padre con diabetes mellitus tipo 2. Abuelos paternos con enfermedad cardiovascular.",
                "personal_pathological_history": "Hipertensión arterial diagnosticada hace 3 años, actualmente en tratamiento farmacológico. Alergia conocida a penicilina.",
                "personal_non_pathological_history": "Tabaquismo negado. Alcoholismo social ocasional. Ejercicio 2 veces por semana. Dieta regular sin restricciones específicas.",
                "physical_examination": "TA: 150/95 mmHg, FC: 82 lpm, FR: 18 rpm, Temp: 36.5°C. Paciente consciente, orientada, cooperadora. Cabeza y cuello sin adenopatías. Cardiopulmonar sin alteraciones. Abdomen blando, depresible, no doloroso. Extremidades sin edema.",
                "primary_diagnosis": "Hipertensión arterial sistémica no controlada (I10)",
                "secondary_diagnoses": "Cefalea tensional (G44.2)",
                "treatment_plan": "Ajuste de medicación antihipertensiva: Amlodipino 10mg cada 24 horas. Medidas no farmacológicas: reducción de sodio, ejercicio regular, técnicas de relajación.",
                "follow_up_instructions": "Control en 2 semanas para evaluación de presión arterial. Monitoreo domiciliario de TA diariamente. Acudir a urgencias si TA >180/110 o síntomas neurológicos.",
                "prognosis": "Favorable con adecuado control farmacológico y cambios en el estilo de vida",
                "prescribed_medications": "Amlodipino 10mg cada 24 horas VO. Paracetamol 500mg cada 8 horas PRN para cefalea.",
                "laboratory_results": "Glucosa: 95 mg/dL, Creatinina: 0.8 mg/dL, BUN: 15 mg/dL, Colesterol total: 210 mg/dL",
                "notes": "Paciente muy cooperadora. Se enfatiza importancia del apego al tratamiento y cambios en estilo de vida."
            },
            
            # Record 2 - Second Patient - Diabetes
            {
                "patient": patients[1 % len(patients)],
                "consultation_date": datetime.now() - timedelta(days=15),
                "chief_complaint": "Poliuria, polidipsia y pérdida de peso no intencional",
                "history_present_illness": "Paciente masculino de 46 años que inicia hace 1 mes con aumento en la frecuencia urinaria, especialmente nocturna, acompañado de sed excesiva y pérdida de peso de aproximadamente 5 kg.",
                "family_history": "Madre y hermana con diabetes mellitus tipo 2. Padre con obesidad y síndrome metabólico. Tío paterno con complicaciones diabéticas (nefropatía).",
                "personal_pathological_history": "Diabetes mellitus tipo 2 diagnosticada hace 2 años. Sobrepeso crónico. Dislipidemia en tratamiento.",
                "personal_non_pathological_history": "Sedentarismo. Dieta alta en carbohidratos refinados. Tabaquismo negado. Consumo de alcohol esporádico.",
                "physical_examination": "TA: 135/85 mmHg, FC: 78 lpm, Peso: 82 kg, Talla: 1.70m, IMC: 28.4. Paciente en aparente buen estado general. Mucosas ligeramente deshidratadas. Cardiopulmonar normal. Abdomen con obesidad central.",
                "primary_diagnosis": "Diabetes mellitus tipo 2 descompensada (E11.9)",
                "secondary_diagnoses": "Sobrepeso (E66.3), Dislipidemia mixta (E78.2)",
                "treatment_plan": "Intensificación del control glucémico con metformina 850mg cada 12 horas y glibenclamida 5mg cada 12 horas. Plan nutricional con reducción de carbohidratos simples.",
                "follow_up_instructions": "Control en 1 semana para evaluación de glucemias. Automonitoreo glucémico 2 veces al día. Consulta con nutriólogo. Ejercicio aeróbico 30 min diarios.",
                "prognosis": "Reservado, depende del apego al tratamiento y cambios en el estilo de vida",
                "prescribed_medications": "Metformina 850mg cada 12 horas VO. Glibenclamida 5mg cada 12 horas VO. Atorvastatina 20mg cada 24 horas VO.",
                "laboratory_results": "Glucosa ayuno: 280 mg/dL, HbA1c: 9.2%, Colesterol total: 245 mg/dL, Triglicéridos: 380 mg/dL",
                "notes": "Se explica al paciente la importancia del control glucémico estricto para prevenir complicaciones. Se programa seguimiento estrecho."
            },
            
            # Record 3 - Third Patient - Asma
            {
                "patient": patients[2 % len(patients)],
                "consultation_date": datetime.now() - timedelta(days=7),
                "chief_complaint": "Dificultad respiratoria y tos seca nocturna",
                "history_present_illness": "Paciente femenina que presenta crisis asmática de 3 días de evolución, caracterizada por disnea de pequeños esfuerzos, tos seca nocturna que interrumpe el sueño y sensación de opresión torácica.",
                "family_history": "Madre con rinitis alérgica. Hermano con asma bronquial diagnosticado en la infancia. Sin otros antecedentes respiratorios familiares relevantes.",
                "personal_pathological_history": "Asma bronquial diagnosticada en la adolescencia, con crisis esporádicas. Rinitis alérgica estacional. Alergia conocida a polen y mariscos.",
                "personal_non_pathological_history": "No fumadora. Ejercicio regular (yoga y natación). Exposición reciente a ambientes con mucho polvo por mudanza de oficina.",
                "physical_examination": "TA: 120/70 mmHg, FC: 95 lpm, FR: 24 rpm, SatO2: 94%. Paciente con leve dificultad respiratoria. Tórax con sibilancias espiratorias bilaterales. Uso de músculos accesorios de la respiración.",
                "primary_diagnosis": "Crisis asmática leve-moderada (J45.9)",
                "secondary_diagnoses": "Rinitis alérgica (J30.4)",
                "treatment_plan": "Broncodilatador de acción rápida (salbutamol) para crisis. Corticoide inhalado (beclometasona) como controlador. Evitar desencadenantes ambientales.",
                "follow_up_instructions": "Control en 1 semana. Técnica correcta de inhaladores. Medidor de flujo espiratorio máximo. Plan de acción para crisis asmática.",
                "prognosis": "Bueno con tratamiento adecuado y evitar desencadenantes",
                "prescribed_medications": "Salbutamol 100mcg, 2 disparos cada 6 horas PRN. Beclometasona 250mcg cada 12 horas. Loratadina 10mg cada 24 horas.",
                "laboratory_results": "IgE total: 180 UI/mL (elevada), Eosinófilos: 6% (ligeramente elevados)",
                "notes": "Se refuerza educación sobre técnica de inhaladores y reconocimiento de síntomas de alarma. Paciente comprende plan de tratamiento."
            },
            
            # Record 4 - Fourth Patient - Chequeo general
            {
                "patient": patients[3 % len(patients)],
                "consultation_date": datetime.now() - timedelta(days=45),
                "chief_complaint": "Evaluación médica general y chequeo preventivo anual",
                "history_present_illness": "Paciente masculino de 59 años que acude para evaluación médica general como parte de su chequeo anual preventivo. Refiere sentirse bien en general, sin síntomas específicos.",
                "family_history": "Padre falleció por infarto agudo al miocardio a los 65 años. Madre viva con osteoporosis. Hermanos sanos.",
                "personal_pathological_history": "Alergia conocida a aspirina (rash cutáneo). Apendicectomía a los 25 años. Sin otras patologías conocidas.",
                "personal_non_pathological_history": "Ex-fumador (dejó hace 10 años, 20 cigarrillos/día por 15 años). Consume 2-3 copas de vino por semana. Ejercicio moderado 3 veces por semana.",
                "physical_examination": "TA: 125/80 mmHg, FC: 70 lpm, Peso: 75 kg, Talla: 1.72m, IMC: 25.3. Examen físico general normal. Fondo de ojo normal. Próstata de tamaño normal al tacto rectal.",
                "primary_diagnosis": "Paciente sano en evaluación preventiva (Z00.0)",
                "secondary_diagnoses": "Historia de tabaquismo (Z87.891)",
                "treatment_plan": "Continuar con hábitos saludables actuales. Mantener ejercicio regular y dieta balanceada. Vacunación de influenza estacional.",
                "follow_up_instructions": "Control anual. Colonoscopia a los 60 años. Antígeno prostático específico anual. Mantener peso ideal.",
                "prognosis": "Excelente, paciente en óptimas condiciones de salud",
                "prescribed_medications": "No requiere medicación. Multivitamínico diario opcional.",
                "laboratory_results": "Hemoglobina: 14.5 g/dL, Glucosa: 88 mg/dL, Colesterol total: 180 mg/dL, PSA: 1.2 ng/mL",
                "notes": "Paciente ejemplar en cuanto a cuidados preventivos. Se felicita por mantener estilo de vida saludable."
            },
            
            # Record 5 - Fifth Patient - Hipotiroidismo
            {
                "patient": patients[4 % len(patients)],
                "consultation_date": datetime.now() - timedelta(days=60),
                "chief_complaint": "Fatiga crónica, ganancia de peso y sensación de frío",
                "history_present_illness": "Paciente refiere fatiga progresiva de 6 meses de evolución, acompañada de ganancia de peso de 8 kg, intolerancia al frío, piel seca y estreñimiento. Dificultad para concentrarse en el trabajo.",
                "family_history": "Madre con hipotiroidismo. Tía materna con enfermedad de Hashimoto. Abuela materna con bocio.",
                "personal_pathological_history": "Hipotiroidismo primario diagnosticado hace 2 años, en tratamiento con levotiroxina. Alergia al látex (dermatitis de contacto).",
                "personal_non_pathological_history": "No fumadora. Alcohol ocasional. Dieta regular. Ejercicio limitado por fatiga crónica.",
                "physical_examination": "TA: 110/70 mmHg, FC: 58 lpm, Peso: 68 kg (previo 60 kg), Temp: 36.2°C. Piel seca y pálida. Tiroides palpable, no nodular. Reflejos osteotendinosos lentos.",
                "primary_diagnosis": "Hipotiroidismo primario no controlado (E03.9)",
                "secondary_diagnoses": "Sobrepeso secundario a hipotiroidismo (E66.1)",
                "treatment_plan": "Ajuste de dosis de levotiroxina a 100mcg diarios. Reevaluación de función tiroidea en 6 semanas.",
                "follow_up_instructions": "Control en 6 semanas con TSH y T4 libre. Tomar medicamento en ayunas, 1 hora antes del desayuno. Evitar suplementos de calcio y hierro simultáneamente.",
                "prognosis": "Bueno con ajuste adecuado de medicación",
                "prescribed_medications": "Levotiroxina 100mcg cada 24 horas en ayunas. Complejo B para fatiga.",
                "laboratory_results": "TSH: 8.5 mUI/L (elevada), T4 libre: 0.8 ng/dL (baja), Anticuerpos anti-TPO: positivos",
                "notes": "Se ajusta dosis de hormona tiroidea. Se explica importancia de toma correcta del medicamento y seguimiento."
            },
            
            # Record 6 - First Patient - Seguimiento HAS
            {
                "patient": patients[0],
                "consultation_date": datetime.now() - timedelta(days=14),
                "chief_complaint": "Control de seguimiento de hipertensión arterial",
                "history_present_illness": "Paciente en seguimiento por hipertensión arterial. Refiere mejoría en cefaleas después del ajuste de medicación. Ha llevado control domiciliario de presión arterial con cifras entre 130-140/80-90 mmHg.",
                "family_history": "Previamente documentado",
                "personal_pathological_history": "Hipertensión arterial en tratamiento",
                "personal_non_pathological_history": "Ha implementado dieta hiposódica y ejercicio regular",
                "physical_examination": "TA: 135/85 mmHg, FC: 78 lpm. Mejoría clínica evidente. Sin cefalea actual. Examen cardiovascular normal.",
                "primary_diagnosis": "Hipertensión arterial con mejoría del control (I10)",
                "treatment_plan": "Continuar con amlodipino 10mg. Reforzar medidas no farmacológicas.",
                "follow_up_instructions": "Control en 1 mes. Continuar monitoreo domiciliario.",
                "prognosis": "Favorable, buena respuesta al tratamiento",
                "prescribed_medications": "Continuar amlodipino 10mg cada 24 horas",
                "laboratory_results": "Pendientes estudios de control"
            }
        ]
        
        # Insert medical records
        for i, record_data in enumerate(medical_records_data, 1):
            patient = record_data.pop("patient")
            record_data["patient_id"] = patient.id
            record_data["doctor_id"] = doctor.id
            record_data["created_by"] = doctor.id
            
            # Generate record code
            record_code = f"MR{datetime.now().year}{i:04d}"
            record_data["record_code"] = record_code
            
            medical_record = MedicalRecord(**record_data)
            session.add(medical_record)
            print(f"✅ Created medical record {record_code} for {patient.first_name} {patient.paternal_surname}")
        
        session.commit()
        print("✅ All medical records created successfully!")
        
        # 4. Summary
        total_records = session.query(MedicalRecord).filter(MedicalRecord.doctor_id == doctor.id).count()
        print(f"\n🎉 TEST DATA INSERTION COMPLETE!")
        print(f"📊 Summary:")
        print(f"   - Doctor: {doctor.first_name} {doctor.paternal_surname} ({doctor.email})")
        print(f"   - Patients created: {len(patients)}")
        print(f"   - Medical records created: {len(medical_records_data)}")
        print(f"   - Total records for doctor: {total_records}")
        print(f"\n🚀 You can now test the Medical Records system with comprehensive data!")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error inserting test data: {str(e)}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    create_test_data()
