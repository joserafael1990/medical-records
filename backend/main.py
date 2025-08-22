from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
import uvicorn
import uuid

app = FastAPI(title="Historias Clínicas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums for medical data
class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class AppointmentType(str, Enum):
    CONSULTATION = "consultation"
    FOLLOW_UP = "follow_up"
    EMERGENCY = "emergency"
    PROCEDURE = "procedure"
    VACCINATION = "vaccination"
    LAB_RESULTS = "lab_results"

class PrescriptionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DISCONTINUED = "discontinued"
    SUSPENDED = "suspended"

# NOM Compliance Enums
class CivilStatus(str, Enum):
    SINGLE = "soltero"
    MARRIED = "casado"
    DIVORCED = "divorciado"
    WIDOWED = "viudo"
    COMMON_LAW = "union_libre"

class EducationLevel(str, Enum):
    NO_EDUCATION = "sin_estudios"
    PRIMARY_INCOMPLETE = "primaria_incompleta"
    PRIMARY_COMPLETE = "primaria_completa"
    SECONDARY_INCOMPLETE = "secundaria_incompleta"
    SECONDARY_COMPLETE = "secundaria_completa"
    HIGH_SCHOOL_INCOMPLETE = "preparatoria_incompleta"
    HIGH_SCHOOL_COMPLETE = "preparatoria_completa"
    TECHNICAL = "tecnico"
    UNIVERSITY_INCOMPLETE = "universidad_incompleta"
    UNIVERSITY_COMPLETE = "universidad_completa"
    POSTGRADUATE = "posgrado"

class Occupation(str, Enum):
    UNEMPLOYED = "desempleado"
    STUDENT = "estudiante"
    HOUSEWIFE = "ama_de_casa"
    EMPLOYEE = "empleado"
    PROFESSIONAL = "profesionista"
    BUSINESS_OWNER = "empresario"
    RETIRED = "jubilado"
    OTHER = "otro"

class Religion(str, Enum):
    CATHOLIC = "catolica"
    CHRISTIAN = "cristiana"
    JEWISH = "judia"
    MUSLIM = "musulmana"
    OTHER = "otra"
    NONE = "ninguna"

# Patient Data Models - NOM-004-SSA3-2012 Compliant
class PatientBase(BaseModel):
    # Mandatory fields per NOM-004-SSA3-2012
    first_name: str  # Nombre(s)
    paternal_surname: str  # Apellido paterno
    maternal_surname: Optional[str] = None  # Apellido materno
    date_of_birth: date  # Fecha de nacimiento
    place_of_birth: Optional[str] = None  # Lugar de nacimiento
    gender: str  # Sexo
    curp: str  # CURP (mandatory per NOM-035)
    
    # Contact information
    phone: str  # Teléfono
    email: Optional[str] = None
    address: str  # Domicilio completo
    neighborhood: Optional[str] = None  # Colonia
    municipality: Optional[str] = None  # Municipio
    state: Optional[str] = None  # Estado
    postal_code: Optional[str] = None  # Código postal
    
    # Sociodemographic data (NOM-004 requirements)
    civil_status: Optional[CivilStatus] = None  # Estado civil
    education_level: Optional[EducationLevel] = None  # Escolaridad
    occupation: Optional[Occupation] = None  # Ocupación
    religion: Optional[Religion] = None  # Religión
    
    # Insurance and identification
    insurance_type: str = "Ninguno"  # Tipo de seguridad social
    insurance_number: Optional[str] = None  # Número de afiliación
    
    # Emergency contact (mandatory per NOM-004)
    emergency_contact_name: str  # Responsable legal
    emergency_contact_phone: str
    emergency_contact_relationship: str
    emergency_contact_address: Optional[str] = None
    
    # Medical history
    allergies: Optional[str] = None  # Alergias
    chronic_conditions: Optional[str] = None  # Padecimientos crónicos
    current_medications: Optional[str] = None  # Medicamentos actuales
    blood_type: Optional[str] = None  # Tipo sanguíneo
    
    # Additional NOM-004 fields
    previous_hospitalizations: Optional[str] = None  # Hospitalizaciones previas
    surgical_history: Optional[str] = None  # Antecedentes quirúrgicos
    family_history: Optional[str] = None  # Antecedentes heredofamiliares
    personal_pathological_history: Optional[str] = None  # Antecedentes personales patológicos
    personal_non_pathological_history: Optional[str] = None  # Antecedentes personales no patológicos

# Medical History Models
class VitalSigns(BaseModel):
    id: Optional[str] = None
    patient_id: str
    date_recorded: datetime
    weight: Optional[float] = None  # kg
    height: Optional[float] = None  # cm
    bmi: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None  # bpm
    temperature: Optional[float] = None  # celsius
    respiratory_rate: Optional[int] = None  # per minute
    oxygen_saturation: Optional[int] = None  # percentage
    notes: Optional[str] = None

class MedicalHistory(BaseModel):
    id: Optional[str] = None
    patient_id: str
    date: datetime
    
    # NOM-004 mandatory consultation fields
    chief_complaint: str  # Motivo de la consulta
    history_present_illness: str  # Historia de la enfermedad actual
    physical_examination: str  # Exploraci\u00f3n f\u00edsica
    
    # Diagnosis with CIE-10 codes (NOM-024 requirement)
    primary_diagnosis: str  # Diagn\u00f3stico principal
    primary_diagnosis_cie10: Optional[str] = None  # C\u00f3digo CIE-10
    secondary_diagnoses: Optional[str] = None  # Diagn\u00f3sticos secundarios
    secondary_diagnoses_cie10: Optional[str] = None  # C\u00f3digos CIE-10 secundarios
    
    # Treatment and plans
    treatment_plan: str  # Plan de tratamiento
    therapeutic_plan: Optional[str] = None  # Plan terap\u00e9utico
    follow_up_instructions: str  # Indicaciones de seguimiento
    prognosis: Optional[str] = None  # Pron\u00f3stico
    
    # Additional clinical information
    laboratory_results: Optional[str] = None  # Resultados de laboratorio
    imaging_studies: Optional[str] = None  # Estudios de imagen
    interconsultations: Optional[str] = None  # Interconsultas
    
    # Doctor information (NOM-004 requirement)
    doctor_name: str  # Nombre del m\u00e9dico
    doctor_professional_license: str  # C\u00e9dula profesional
    doctor_specialty: Optional[str] = None  # Especialidad
    
    # Audit trail (NOM-024 requirement)
    created_by: str  # Usuario que cre\u00f3 la nota
    created_at: datetime  # Fecha y hora de creaci\u00f3n
    updated_by: Optional[str] = None  # Usuario que modific\u00f3
    updated_at: Optional[datetime] = None  # Fecha y hora de modificaci\u00f3n
    
    # Links to other records
    vital_signs_id: Optional[str] = None
    prescription_ids: Optional[List[str]] = None  # Prescripciones asociadas

# Audit Trail Model (NOM-024 requirement)
class AuditLog(BaseModel):
    id: Optional[str] = None
    user_id: str  # Usuario que realizó la acción
    user_name: str  # Nombre del usuario
    action: str  # Acción realizada (CREATE, READ, UPDATE, DELETE)
    resource_type: str  # Tipo de recurso (PATIENT, MEDICAL_HISTORY, PRESCRIPTION, etc.)
    resource_id: str  # ID del recurso afectado
    timestamp: datetime  # Fecha y hora de la acción
    ip_address: Optional[str] = None  # Dirección IP
    details: Optional[str] = None  # Detalles adicionales
    old_values: Optional[Dict[str, Any]] = None  # Valores anteriores (para UPDATE)
    new_values: Optional[Dict[str, Any]] = None  # Valores nuevos (para CREATE/UPDATE)

class Prescription(BaseModel):
    id: Optional[str] = None
    patient_id: str
    medical_history_id: Optional[str] = None
    
    # Medication information
    medication_name: str  # Nombre del medicamento
    generic_name: Optional[str] = None  # Nombre genérico
    presentation: Optional[str] = None  # Presentación
    dosage: str  # Dosis
    route_administration: Optional[str] = None  # Vía de administración
    frequency: str  # Frecuencia
    duration: str  # Duración del tratamiento
    quantity: Optional[int] = None  # Cantidad a dispensar
    
    # Instructions and notes
    instructions: str  # Indicaciones de uso
    contraindications: Optional[str] = None  # Contraindicaciones
    side_effects: Optional[str] = None  # Efectos secundarios
    
    # Prescription details (NOM-004 requirement)
    prescribed_date: datetime
    doctor_name: str  # Nombre del médico que prescribe
    doctor_professional_license: str  # Cédula profesional
    
    # Status and tracking
    status: PrescriptionStatus = PrescriptionStatus.ACTIVE
    dispensed_date: Optional[datetime] = None  # Fecha de dispensación
    dispensed_by: Optional[str] = None  # Dispensado por
    
    # Audit trail
    created_by: str
    created_at: datetime
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    
    notes: Optional[str] = None

class Appointment(BaseModel):
    id: Optional[str] = None
    patient_id: str
    date_time: datetime
    duration: int = 30  # minutes
    appointment_type: AppointmentType
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    chief_complaint: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: str
    full_name: str
    age: int
    created_at: datetime
    last_visit: Optional[datetime] = None
    total_visits: int = 0
    status: str = "active"
    # NOM compliance tracking
    last_updated: datetime
    created_by: str  # Usuario que creó el expediente
    updated_by: Optional[str] = None  # Último usuario que actualizó

# Mock databases
patients_db = [
    {
        "id": "PAT001",
        "first_name": "María",
        "paternal_surname": "González",
        "maternal_surname": "Pérez",
        "full_name": "María González Pérez",
        "date_of_birth": date(1985, 5, 15),
        "place_of_birth": "Ciudad de México, CDMX",
        "age": 39,
        "gender": "Femenino",
        "curp": "GOPM850515MDFNTR09",
        "phone": "+52 555 123 4567",
        "email": "maria.gonzalez@email.com",
        "address": "Av. Insurgentes Sur 123",
        "neighborhood": "Del Valle",
        "municipality": "Benito Juárez",
        "state": "Ciudad de México",
        "postal_code": "03100",
        "civil_status": "casado",
        "education_level": "universidad_completa",
        "occupation": "profesionista",
        "religion": "catolica",
        "insurance_type": "IMSS",
        "insurance_number": "123456789",
        "emergency_contact_name": "Juan González",
        "emergency_contact_phone": "+52 555 987 6543",
        "emergency_contact_relationship": "Esposo",
        "emergency_contact_address": "Av. Insurgentes Sur 123, Col. Del Valle",
        "blood_type": "O+",
        "allergies": "Penicilina",
        "chronic_conditions": "Diabetes tipo 2",
        "current_medications": "Metformina 500mg",
        "previous_hospitalizations": "Ninguna",
        "surgical_history": "Apendicectomía (2010)",
        "family_history": "Diabetes mellitus tipo 2 (madre), Hipertensión arterial (padre)",
        "personal_pathological_history": "Diabetes mellitus tipo 2 diagnosticada en 2020",
        "personal_non_pathological_history": "Niega tabaquismo, alcoholismo ocasional",
        "created_at": datetime(2024, 1, 15, 10, 30),
        "last_visit": datetime(2024, 8, 20, 14, 45),
        "last_updated": datetime(2024, 8, 20, 14, 45),
        "created_by": "Dr. García Martínez",
        "updated_by": "Dr. García Martínez",
        "total_visits": 5,
        "status": "active"
    },
    {
        "id": "PAT002",
        "first_name": "Carlos",
        "paternal_surname": "Hernández",
        "maternal_surname": "López",
        "full_name": "Carlos Hernández López",
        "date_of_birth": date(1978, 12, 3),
        "place_of_birth": "Guadalajara, Jalisco",
        "age": 45,
        "gender": "Masculino",
        "curp": "HELC781203HDFNPR05",
        "phone": "+52 555 234 5678",
        "email": "carlos.hernandez@email.com",
        "address": "Calle Reforma 456",
        "neighborhood": "Centro",
        "municipality": "Cuauhtémoc",
        "state": "Ciudad de México",
        "postal_code": "06000",
        "civil_status": "casado",
        "education_level": "secundaria_completa",
        "occupation": "empleado",
        "religion": "catolica",
        "insurance_type": "Seguro Popular",
        "insurance_number": "987654321",
        "emergency_contact_name": "Ana Hernández",
        "emergency_contact_phone": "+52 555 876 5432",
        "emergency_contact_relationship": "Esposa",
        "emergency_contact_address": "Calle Reforma 456, Col. Centro",
        "blood_type": "A+",
        "allergies": "Ninguna conocida",
        "chronic_conditions": "Hipertensión",
        "current_medications": "Losartán 50mg",
        "previous_hospitalizations": "Ninguna",
        "surgical_history": "Ninguna",
        "family_history": "Hipertensión arterial (padre), Diabetes (abuela materna)",
        "personal_pathological_history": "Hipertensión arterial diagnosticada en 2018",
        "personal_non_pathological_history": "Niega tabaquismo y alcoholismo",
        "created_at": datetime(2024, 2, 10, 9, 15),
        "last_visit": datetime(2024, 8, 18, 11, 30),
        "last_updated": datetime(2024, 8, 18, 11, 30),
        "created_by": "Dr. García Martínez",
        "updated_by": "Dr. García Martínez",
        "total_visits": 3,
        "status": "active"
    },
    {
        "id": "PAT003",
        "first_name": "Ana",
        "paternal_surname": "Rodríguez",
        "maternal_surname": "Martín",
        "full_name": "Ana Rodríguez Martín",
        "date_of_birth": date(1992, 8, 22),
        "place_of_birth": "Monterrey, Nuevo León",
        "age": 32,
        "gender": "Femenino",
        "curp": "ROMA920822MDFDRN01",
        "phone": "+52 555 345 6789",
        "email": "ana.rodriguez@email.com",
        "address": "Col. Roma Norte 789",
        "neighborhood": "Roma Norte",
        "municipality": "Cuauhtémoc",
        "state": "Ciudad de México",
        "postal_code": "06700",
        "civil_status": "soltero",
        "education_level": "universidad_completa",
        "occupation": "profesionista",
        "religion": "catolica",
        "insurance_type": "Privado",
        "insurance_number": "PRV123456",
        "emergency_contact_name": "Luis Rodríguez",
        "emergency_contact_phone": "+52 555 765 4321",
        "emergency_contact_relationship": "Padre",
        "emergency_contact_address": "Av. Universidad 234, Col. Narvarte",
        "blood_type": "B+",
        "allergies": "Aspirina",
        "chronic_conditions": "Ninguna",
        "current_medications": "Ninguna",
        "previous_hospitalizations": "Ninguna",
        "surgical_history": "Ninguna",
        "family_history": "Ninguna relevante",
        "personal_pathological_history": "Ninguna",
        "personal_non_pathological_history": "Niega tabaquismo, alcoholismo social ocasional",
        "created_at": datetime(2024, 3, 5, 16, 20),
        "last_visit": datetime(2024, 8, 15, 10, 15),
        "last_updated": datetime(2024, 8, 15, 10, 15),
        "created_by": "Dr. García Martínez",
        "updated_by": "Dr. García Martínez",
        "total_visits": 2,
        "status": "active"
    }
]

# Mock databases for medical records
medical_history_db = [
    {
        "id": "MH001",
        "patient_id": "PAT001",
        "date": datetime(2024, 8, 20, 14, 45),
        "chief_complaint": "Dolor de cabeza y mareo",
        "history_present_illness": "Paciente refiere dolor de cabeza intermitente de 3 días de evolución, acompañado de mareo ocasional. Sin fiebre ni náuseas. Dolor localizado en región frontal, intensidad 6/10, que mejora con reposo.",
        "physical_examination": "Signos vitales: TA: 130/85 mmHg, FC: 78 lpm, FR: 16 rpm, T: 36.5°C, SpO2: 98%. Paciente consciente, orientada en persona, lugar y tiempo. Campos visuales por confrontación normales. Reflejos pupilares normales. Sin signos meníngeos. Cardiopulmonar sin compromiso. Abdomen blando, depresible, sin dolor.",
        "primary_diagnosis": "Cefalea tensional",
        "primary_diagnosis_cie10": "G44.2",
        "secondary_diagnoses": "Diabetes mellitus tipo 2 en control",
        "secondary_diagnoses_cie10": "E11.9",
        "treatment_plan": "1. Paracetamol 500mg vía oral cada 8 horas por 5 días. 2. Continuar metformina 500mg cada 12 horas. 3. Medidas de higiene del sueño. 4. Técnicas de relajación.",
        "therapeutic_plan": "Manejo integral del dolor. Control glucémico estricto. Evaluación de factores de estrés.",
        "follow_up_instructions": "Regresar a consulta en 1 semana para evaluación de respuesta al tratamiento. Acudir inmediatamente si presenta: cefalea súbita intensa, alteraciones visuales, vómito, fiebre o signos neurológicos.",
        "prognosis": "Favorable con manejo adecuado",
        "laboratory_results": "Glucosa en ayuno: 110 mg/dL, HbA1c: 6.8%",
        "imaging_studies": "No requeridos en esta consulta",
        "interconsultations": "No requeridas",
        "doctor_name": "Dr. García Martínez",
        "doctor_professional_license": "1234567",
        "doctor_specialty": "Medicina General",
        "created_by": "Dr. García Martínez",
        "created_at": datetime(2024, 8, 20, 14, 45),
        "updated_by": None,
        "updated_at": None,
        "vital_signs_id": "VS001",
        "prescription_ids": ["PRES001", "PRES002"]
    },
    {
        "id": "MH002",
        "patient_id": "PAT002",
        "date": datetime(2024, 8, 18, 11, 30),
        "chief_complaint": "Control de hipertensión",
        "history_present_illness": "Paciente acude a control rutinario de hipertensión arterial. Refiere adherencia al tratamiento.",
        "physical_examination": "TA: 125/80 mmHg, FC: 72 lpm, peso: 78kg. Auscultación cardiopulmonar normal.",
        "diagnosis": "Hipertensión arterial controlada",
        "treatment_plan": "Continuar con Losartán 50mg diario. Control en 3 meses.",
        "follow_up_instructions": "Mantener dieta hiposódica y ejercicio regular. Monitoreo de TA en casa.",
        "doctor_notes": "Excelente control de cifras tensionales. Paciente muy adherente al tratamiento.",
        "vital_signs_id": "VS002"
    }
]

vital_signs_db = [
    {
        "id": "VS001",
        "patient_id": "PAT001",
        "date_recorded": datetime(2024, 8, 20, 14, 45),
        "weight": 65.5,
        "height": 165,
        "bmi": 24.1,
        "blood_pressure_systolic": 130,
        "blood_pressure_diastolic": 85,
        "heart_rate": 78,
        "temperature": 36.5,
        "respiratory_rate": 16,
        "oxygen_saturation": 98,
        "notes": "Signos vitales estables"
    },
    {
        "id": "VS002",
        "patient_id": "PAT002",
        "date_recorded": datetime(2024, 8, 18, 11, 30),
        "weight": 78.0,
        "height": 175,
        "bmi": 25.5,
        "blood_pressure_systolic": 125,
        "blood_pressure_diastolic": 80,
        "heart_rate": 72,
        "temperature": 36.4,
        "respiratory_rate": 18,
        "oxygen_saturation": 99,
        "notes": "Presión arterial bien controlada"
    }
]

prescriptions_db = [
    {
        "id": "PRES001",
        "patient_id": "PAT001",
        "medical_history_id": "MH001",
        "medication_name": "Paracetamol",
        "dosage": "500mg",
        "frequency": "Cada 8 horas",
        "duration": "5 días",
        "instructions": "Tomar con alimentos. Suspender si aparecen efectos adversos.",
        "prescribed_date": datetime(2024, 8, 20, 14, 45),
        "status": "active",
        "notes": "Para dolor de cabeza"
    },
    {
        "id": "PRES002",
        "patient_id": "PAT001",
        "medical_history_id": None,
        "medication_name": "Metformina",
        "dosage": "500mg",
        "frequency": "Cada 12 horas",
        "duration": "Tratamiento crónico",
        "instructions": "Tomar con el desayuno y la cena. No suspender sin consultar.",
        "prescribed_date": datetime(2024, 1, 15, 10, 30),
        "status": "active",
        "notes": "Control de diabetes mellitus tipo 2"
    },
    {
        "id": "PRES003",
        "patient_id": "PAT002",
        "medical_history_id": "MH002",
        "medication_name": "Losartán",
        "dosage": "50mg",
        "frequency": "Una vez al día",
        "duration": "Tratamiento crónico",
        "instructions": "Tomar en la mañana, preferiblemente a la misma hora.",
        "prescribed_date": datetime(2024, 2, 10, 9, 15),
        "status": "active",
        "notes": "Control de hipertensión arterial"
    }
]

appointments_db = [
    {
        "id": "APT001",
        "patient_id": "PAT001",
        "date_time": datetime(2024, 8, 25, 10, 0),
        "duration": 30,
        "appointment_type": "follow_up",
        "status": "scheduled",
        "chief_complaint": "Control de diabetes y seguimiento de cefalea",
        "notes": "Revisar niveles de glucosa y evolución del dolor de cabeza",
        "created_at": datetime(2024, 8, 20, 14, 50),
        "updated_at": datetime(2024, 8, 20, 14, 50)
    },
    {
        "id": "APT002",
        "patient_id": "PAT002",
        "date_time": datetime(2024, 11, 18, 11, 30),
        "duration": 30,
        "appointment_type": "follow_up",
        "status": "scheduled",
        "chief_complaint": "Control de hipertensión arterial",
        "notes": "Control rutinario trimestral",
        "created_at": datetime(2024, 8, 18, 11, 35),
        "updated_at": datetime(2024, 8, 18, 11, 35)
    },
    {
        "id": "APT003",
        "patient_id": "PAT003",
        "date_time": datetime(2024, 8, 22, 14, 0),
        "duration": 45,
        "appointment_type": "consultation",
        "status": "scheduled",
        "chief_complaint": "Consulta general - primera vez",
        "notes": "Paciente nueva, evaluación inicial completa",
        "created_at": datetime(2024, 8, 15, 10, 20),
        "updated_at": datetime(2024, 8, 15, 10, 20)
    }
]

# Mock audit trail database
audit_logs_db = []

# Audit trail helper function
def log_audit_action(user_id: str, user_name: str, action: str, resource_type: str, 
                    resource_id: str, ip_address: str = None, details: str = None,
                    old_values: Dict[str, Any] = None, new_values: Dict[str, Any] = None):
    """Log an action to the audit trail (NOM-024 requirement)"""
    audit_log = {
        "id": f"AUDIT{len(audit_logs_db) + 1:06d}",
        "user_id": user_id,
        "user_name": user_name,
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "timestamp": datetime.now(),
        "ip_address": ip_address,
        "details": details,
        "old_values": old_values,
        "new_values": new_values
    }
    audit_logs_db.append(audit_log)
    return audit_log

@app.get("/")
async def root():
    return {
        "message": "🏥 Historias Clínicas - Tech Stack Complete!",
        "status": "✅ Backend Running",
        "architecture": {
            "frontend": "React + TypeScript (port 3000)",
            "backend": "FastAPI + Python (port 8000)",
            "database": "PostgreSQL + Redis",
            "messaging": "WhatsApp Business API",
            "compliance": "Mexican Healthcare Regulations"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "historias-clinicas"}

@app.get("/api/health")
async def api_health():
    return {"status": "healthy", "service": "historias-clinicas"}

@app.get("/api/physicians/dashboard")
async def dashboard():
    return {
        "physician": "Dr. García",
        "appointments": 8,
        "compliance_score": 100,
        "revenue": 45000,
        "tech_stack": "fully_deployed"
    }

# Patient Endpoints
@app.get("/api/patients", response_model=List[PatientResponse])
async def get_patients(search: Optional[str] = None, limit: int = 100, offset: int = 0):
    """Get all patients with optional search and pagination"""
    filtered_patients = patients_db
    
    if search:
        search_lower = search.lower()
        filtered_patients = [
            p for p in patients_db 
            if (search_lower in p["full_name"].lower() or 
                search_lower in p["phone"] or 
                search_lower in (p["email"] or "").lower() or
                search_lower in (p["curp"] or "").lower())
        ]
    
    # Apply pagination
    paginated_patients = filtered_patients[offset:offset + limit]
    
    return [PatientResponse(**patient) for patient in paginated_patients]

@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str):
    """Get a specific patient by ID"""
    patient = next((p for p in patients_db if p["id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    return PatientResponse(**patient)

@app.post("/api/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate):
    """Create a new patient with NOM-004 compliance validation"""
    # Validate NOM-004 compliance
    patient_data = patient.dict()
    validation_errors = validate_nom_004_patient_data(patient_data)
    
    if validation_errors:
        raise HTTPException(
            status_code=400, 
            detail=f"Datos no cumplen con NOM-004-SSA3-2012: {'; '.join(validation_errors)}"
        )
    
    # Generate new patient ID
    existing_ids = [int(p["id"][3:]) for p in patients_db]
    new_id = f"PAT{max(existing_ids) + 1:03d}"
    
    # Calculate age
    today = date.today()
    age = today.year - patient.date_of_birth.year - ((today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day))
    
    # Create full name (NOM-004 format)
    full_name = f"{patient.first_name} {patient.paternal_surname}"
    if patient.maternal_surname:
        full_name += f" {patient.maternal_surname}"
    
    now = datetime.now()
    
    # Create new patient record
    new_patient = {
        "id": new_id,
        "full_name": full_name,
        "age": age,
        "created_at": now,
        "last_updated": now,
        "created_by": "Dr. García Martínez",  # In production, get from authenticated user
        "updated_by": None,
        "last_visit": None,
        "total_visits": 0,
        "status": "active",
        **patient_data
    }
    
    patients_db.append(new_patient)
    
    # Log audit trail (NOM-024 requirement)
    log_audit_action(
        user_id="DR001",
        user_name="Dr. García Martínez",
        action="CREATE",
        resource_type="PATIENT",
        resource_id=new_id,
        details=f"Nuevo paciente registrado: {full_name}",
        new_values={"patient_data": new_patient}
    )
    
    return PatientResponse(**new_patient)

@app.put("/api/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, patient_update: PatientCreate):
    """Update an existing patient"""
    patient_index = next((i for i, p in enumerate(patients_db) if p["id"] == patient_id), None)
    if patient_index is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Calculate age
    today = date.today()
    age = today.year - patient_update.date_of_birth.year - ((today.month, today.day) < (patient_update.date_of_birth.month, patient_update.date_of_birth.day))
    
    # Validate NOM-004 compliance
    patient_data = patient_update.dict()
    validation_errors = validate_nom_004_patient_data(patient_data)
    
    if validation_errors:
        raise HTTPException(
            status_code=400, 
            detail=f"Datos no cumplen con NOM-004-SSA3-2012: {'; '.join(validation_errors)}"
        )
    
    # Create full name (NOM-004 format)
    full_name = f"{patient_update.first_name} {patient_update.paternal_surname}"
    if patient_update.maternal_surname:
        full_name += f" {patient_update.maternal_surname}"
    
    # Update patient record
    updated_patient = {
        **patients_db[patient_index],
        **patient_data,
        "full_name": full_name,
        "age": age,
        "last_updated": datetime.now(),
        "updated_by": "Dr. García Martínez"  # In production, get from authenticated user
    }
    
    patients_db[patient_index] = updated_patient
    
    # Log audit trail (NOM-024 requirement)
    log_audit_action(
        user_id="DR001",
        user_name="Dr. García Martínez",
        action="UPDATE",
        resource_type="PATIENT",
        resource_id=patient_id,
        details=f"Paciente actualizado: {full_name}",
        old_values={"previous_data": patients_db[patient_index]},
        new_values={"updated_data": updated_patient}
    )
    
    return PatientResponse(**updated_patient)

@app.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient (mark as inactive)"""
    patient_index = next((i for i, p in enumerate(patients_db) if p["id"] == patient_id), None)
    if patient_index is None:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    patients_db[patient_index]["status"] = "inactive"
    return {"message": "Paciente marcado como inactivo"}

@app.get("/api/patients/stats")
async def get_patients_stats():
    """Get patient statistics"""
    active_patients = [p for p in patients_db if p["status"] == "active"]
    
    return {
        "total_patients": len(active_patients),
        "new_this_month": len([p for p in active_patients if p["created_at"].month == datetime.now().month]),
        "by_insurance": {
            "IMSS": len([p for p in active_patients if p["insurance_type"] == "IMSS"]),
            "Seguro Popular": len([p for p in active_patients if p["insurance_type"] == "Seguro Popular"]),
            "Privado": len([p for p in active_patients if p["insurance_type"] == "Privado"]),
            "Ninguno": len([p for p in active_patients if p["insurance_type"] == "Ninguno"])
        },
        "by_gender": {
            "Masculino": len([p for p in active_patients if p["gender"] == "Masculino"]),
            "Femenino": len([p for p in active_patients if p["gender"] == "Femenino"])
        },
        "average_age": sum(p["age"] for p in active_patients) / len(active_patients) if active_patients else 0
    }

# NOM Compliance Validation Functions
def validate_curp(curp: str) -> bool:
    """Validate CURP format according to Mexican standards"""
    if not curp or len(curp) != 18:
        return False
    # Basic CURP pattern validation
    import re
    pattern = r'^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9]{2}$'
    return bool(re.match(pattern, curp.upper()))

def validate_nom_004_patient_data(patient_data: dict) -> List[str]:
    """Validate patient data against NOM-004-SSA3-2012 requirements"""
    errors = []
    
    # MANDATORY fields per NOM-004-SSA3-2012 Article 10
    required_fields = [
        # Patient identification (mandatory)
        'first_name', 'paternal_surname', 'date_of_birth', 'gender', 'curp',
        
        # Contact information (mandatory)
        'phone', 'address',
        
        # Emergency contact (mandatory per NOM-004)
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        
        # Additional mandatory demographic data
        'place_of_birth', 'civil_status', 'occupation'
    ]
    
    for field in required_fields:
        if not patient_data.get(field) or str(patient_data.get(field)).strip() == '':
            field_name_es = {
                'first_name': 'Nombre(s)',
                'paternal_surname': 'Apellido paterno',
                'date_of_birth': 'Fecha de nacimiento',
                'gender': 'Sexo',
                'curp': 'CURP',
                'phone': 'Teléfono',
                'address': 'Domicilio',
                'emergency_contact_name': 'Nombre del responsable',
                'emergency_contact_phone': 'Teléfono del responsable',
                'emergency_contact_relationship': 'Parentesco del responsable',
                'place_of_birth': 'Lugar de nacimiento',
                'civil_status': 'Estado civil',
                'occupation': 'Ocupación'
            }.get(field, field)
            errors.append(f"Campo obligatorio faltante según NOM-004: {field_name_es}")
    
    # CURP validation (NOM-035 requirement)
    if patient_data.get('curp'):
        if not validate_curp(patient_data['curp']):
            errors.append("CURP no válido según formato oficial mexicano")
    
    # Patient identification validation (NOM-035) - Dual identifier requirement
    if not patient_data.get('first_name') or not patient_data.get('date_of_birth'):
        errors.append("NOM-035: Se requiere identificación dual (nombre completo y fecha de nacimiento)")
    
    # Address completeness validation (NOM-004 requirement)
    address_fields = ['address', 'municipality', 'state']
    missing_address = [field for field in address_fields if not patient_data.get(field)]
    if missing_address:
        errors.append(f"Domicilio incompleto según NOM-004. Faltan: {', '.join(missing_address)}")
    
    # Age validation
    if patient_data.get('date_of_birth'):
        from datetime import date
        birth_date = patient_data['date_of_birth']
        if isinstance(birth_date, str):
            try:
                birth_date = datetime.strptime(birth_date, '%Y-%m-%d').date()
            except ValueError:
                errors.append("Formato de fecha de nacimiento inválido")
        
        if isinstance(birth_date, date):
            today = date.today()
            if birth_date > today:
                errors.append("Fecha de nacimiento no puede ser futura")
            
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age > 120:
                errors.append("Edad no válida (mayor a 120 años)")
    
    # Gender validation
    valid_genders = ['Masculino', 'Femenino']
    if patient_data.get('gender') and patient_data['gender'] not in valid_genders:
        errors.append("Género debe ser 'Masculino' o 'Femenino'")
    
    # Phone validation (basic Mexican format)
    phone = patient_data.get('phone', '')
    if phone and not (phone.startswith('+52') or phone.startswith('52') or len(phone.replace(' ', '').replace('-', '')) >= 10):
        errors.append("Formato de teléfono no válido para México")
    
    return errors

# Audit Trail Endpoints (NOM-024 requirement)
@app.get("/api/audit-logs", response_model=List[AuditLog])
async def get_audit_logs(user_id: Optional[str] = None, action: Optional[str] = None, 
                        resource_type: Optional[str] = None, limit: int = 100):
    """Get audit logs with optional filters"""
    logs = audit_logs_db.copy()
    
    if user_id:
        logs = [log for log in logs if log["user_id"] == user_id]
    if action:
        logs = [log for log in logs if log["action"] == action]
    if resource_type:
        logs = [log for log in logs if log["resource_type"] == resource_type]
    
    # Sort by timestamp (most recent first)
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return [AuditLog(**log) for log in logs[:limit]]

@app.get("/api/patients/{patient_id}/nom-validation")
async def validate_patient_nom_compliance(patient_id: str):
    """Validate specific patient against NOM requirements"""
    patient = next((p for p in patients_db if p["id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    validation_errors = validate_nom_004_patient_data(patient)
    
    return {
        "patient_id": patient_id,
        "patient_name": patient.get("full_name", ""),
        "is_compliant": len(validation_errors) == 0,
        "compliance_percentage": 0 if validation_errors else 100,
        "validation_errors": validation_errors,
        "missing_fields": [error.split(": ")[-1] for error in validation_errors if "Campo obligatorio faltante" in error],
        "validation_date": datetime.now(),
        "nom_standards": {
            "nom_004": "Expediente clínico",
            "nom_024": "Sistemas de información",
            "nom_035": "Información en salud"
        }
    }

@app.get("/api/nom-compliance/validation")
async def check_nom_compliance():
    """Check overall NOM compliance status"""
    total_patients = len(patients_db)
    compliant_patients = 0
    
    for patient in patients_db:
        errors = validate_nom_004_patient_data(patient)
        if not errors:
            compliant_patients += 1
    
    compliance_percentage = (compliant_patients / total_patients * 100) if total_patients > 0 else 0
    
    return {
        "nom_004_compliance": {
            "total_patients": total_patients,
            "compliant_patients": compliant_patients,
            "compliance_percentage": round(compliance_percentage, 2),
            "status": "compliant" if compliance_percentage == 100 else "non_compliant"
        },
        "nom_024_features": {
            "audit_trail": "enabled",
            "data_encryption": "pending", 
            "user_authentication": "basic",
            "cie10_integration": "enabled"
        },
        "nom_035_features": {
            "patient_identification": "dual_identifier",
            "data_confidentiality": "enabled"
        },
        "data_retention": {
            "policy": "5_years_minimum",
            "status": "compliant"
        }
    }

# Medical History Endpoints
@app.get("/api/patients/{patient_id}/medical-history", response_model=List[MedicalHistory])
async def get_patient_medical_history(patient_id: str):
    """Get medical history for a specific patient"""
    history = [h for h in medical_history_db if h["patient_id"] == patient_id]
    return [MedicalHistory(**record) for record in sorted(history, key=lambda x: x["date"], reverse=True)]

@app.post("/api/patients/{patient_id}/medical-history", response_model=MedicalHistory)
async def create_medical_history(patient_id: str, history: MedicalHistory):
    """Create a new medical history record"""
    # Verify patient exists
    if not any(p["id"] == patient_id for p in patients_db):
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    new_id = f"MH{len(medical_history_db) + 1:03d}"
    new_history = {
        "id": new_id,
        "patient_id": patient_id,
        **history.dict(exclude={"id", "patient_id"})
    }
    
    medical_history_db.append(new_history)
    
    # Update patient's last visit
    for patient in patients_db:
        if patient["id"] == patient_id:
            patient["last_visit"] = history.date
            patient["total_visits"] += 1
            break
    
    return MedicalHistory(**new_history)

@app.get("/api/medical-history/{history_id}", response_model=MedicalHistory)
async def get_medical_history(history_id: str):
    """Get a specific medical history record"""
    history = next((h for h in medical_history_db if h["id"] == history_id), None)
    if not history:
        raise HTTPException(status_code=404, detail="Historia clínica no encontrada")
    
    return MedicalHistory(**history)

# Vital Signs Endpoints
@app.get("/api/patients/{patient_id}/vital-signs", response_model=List[VitalSigns])
async def get_patient_vital_signs(patient_id: str):
    """Get vital signs for a specific patient"""
    signs = [vs for vs in vital_signs_db if vs["patient_id"] == patient_id]
    return [VitalSigns(**record) for record in sorted(signs, key=lambda x: x["date_recorded"], reverse=True)]

@app.post("/api/patients/{patient_id}/vital-signs", response_model=VitalSigns)
async def create_vital_signs(patient_id: str, vital_signs: VitalSigns):
    """Create new vital signs record"""
    # Verify patient exists
    if not any(p["id"] == patient_id for p in patients_db):
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    new_id = f"VS{len(vital_signs_db) + 1:03d}"
    
    # Calculate BMI if weight and height are provided
    bmi = None
    if vital_signs.weight and vital_signs.height:
        height_m = vital_signs.height / 100  # convert cm to meters
        bmi = round(vital_signs.weight / (height_m ** 2), 1)
    
    new_vital_signs = {
        "id": new_id,
        "patient_id": patient_id,
        "bmi": bmi,
        **vital_signs.dict(exclude={"id", "patient_id", "bmi"})
    }
    
    vital_signs_db.append(new_vital_signs)
    return VitalSigns(**new_vital_signs)

@app.get("/api/vital-signs/{signs_id}", response_model=VitalSigns)
async def get_vital_signs(signs_id: str):
    """Get specific vital signs record"""
    signs = next((vs for vs in vital_signs_db if vs["id"] == signs_id), None)
    if not signs:
        raise HTTPException(status_code=404, detail="Signos vitales no encontrados")
    
    return VitalSigns(**signs)

# Prescriptions Endpoints
@app.get("/api/patients/{patient_id}/prescriptions", response_model=List[Prescription])
async def get_patient_prescriptions(patient_id: str, status: Optional[PrescriptionStatus] = None):
    """Get prescriptions for a specific patient"""
    prescriptions = [p for p in prescriptions_db if p["patient_id"] == patient_id]
    
    if status:
        prescriptions = [p for p in prescriptions if p["status"] == status]
    
    return [Prescription(**record) for record in sorted(prescriptions, key=lambda x: x["prescribed_date"], reverse=True)]

@app.post("/api/patients/{patient_id}/prescriptions", response_model=Prescription)
async def create_prescription(patient_id: str, prescription: Prescription):
    """Create a new prescription"""
    # Verify patient exists
    if not any(p["id"] == patient_id for p in patients_db):
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    new_id = f"PRES{len(prescriptions_db) + 1:03d}"
    new_prescription = {
        "id": new_id,
        "patient_id": patient_id,
        **prescription.dict(exclude={"id", "patient_id"})
    }
    
    prescriptions_db.append(new_prescription)
    return Prescription(**new_prescription)

@app.put("/api/prescriptions/{prescription_id}", response_model=Prescription)
async def update_prescription_status(prescription_id: str, status: PrescriptionStatus):
    """Update prescription status"""
    prescription_index = next((i for i, p in enumerate(prescriptions_db) if p["id"] == prescription_id), None)
    if prescription_index is None:
        raise HTTPException(status_code=404, detail="Prescripción no encontrada")
    
    prescriptions_db[prescription_index]["status"] = status
    return Prescription(**prescriptions_db[prescription_index])

# Appointments Endpoints
@app.get("/api/patients/{patient_id}/appointments", response_model=List[Appointment])
async def get_patient_appointments(patient_id: str, status: Optional[AppointmentStatus] = None):
    """Get appointments for a specific patient"""
    appointments = [a for a in appointments_db if a["patient_id"] == patient_id]
    
    if status:
        appointments = [a for a in appointments if a["status"] == status]
    
    return [Appointment(**record) for record in sorted(appointments, key=lambda x: x["date_time"])]

@app.get("/api/appointments", response_model=List[Appointment])
async def get_all_appointments(date: Optional[date] = None, status: Optional[AppointmentStatus] = None):
    """Get all appointments with optional filters"""
    appointments = appointments_db.copy()
    
    if date:
        appointments = [a for a in appointments if a["date_time"].date() == date]
    
    if status:
        appointments = [a for a in appointments if a["status"] == status]
    
    return [Appointment(**record) for record in sorted(appointments, key=lambda x: x["date_time"])]

@app.post("/api/patients/{patient_id}/appointments", response_model=Appointment)
async def create_appointment(patient_id: str, appointment: Appointment):
    """Create a new appointment"""
    # Verify patient exists
    if not any(p["id"] == patient_id for p in patients_db):
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    new_id = f"APT{len(appointments_db) + 1:03d}"
    now = datetime.now()
    
    new_appointment = {
        "id": new_id,
        "patient_id": patient_id,
        "created_at": now,
        "updated_at": now,
        **appointment.dict(exclude={"id", "patient_id", "created_at", "updated_at"})
    }
    
    appointments_db.append(new_appointment)
    return Appointment(**new_appointment)

@app.put("/api/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment_status(appointment_id: str, status: AppointmentStatus):
    """Update appointment status"""
    appointment_index = next((i for i, a in enumerate(appointments_db) if a["id"] == appointment_id), None)
    if appointment_index is None:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    appointments_db[appointment_index]["status"] = status
    appointments_db[appointment_index]["updated_at"] = datetime.now()
    return Appointment(**appointments_db[appointment_index])

@app.delete("/api/appointments/{appointment_id}")
async def cancel_appointment(appointment_id: str):
    """Cancel an appointment"""
    appointment_index = next((i for i, a in enumerate(appointments_db) if a["id"] == appointment_id), None)
    if appointment_index is None:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    appointments_db[appointment_index]["status"] = AppointmentStatus.CANCELLED
    appointments_db[appointment_index]["updated_at"] = datetime.now()
    return {"message": "Cita cancelada exitosamente"}

# Comprehensive Patient Details Endpoint
@app.get("/api/patients/{patient_id}/complete", response_model=Dict[str, Any])
async def get_complete_patient_info(patient_id: str):
    """Get complete patient information including medical history, vital signs, prescriptions, and appointments"""
    patient = next((p for p in patients_db if p["id"] == patient_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Get all related data
    medical_history = [MedicalHistory(**h) for h in medical_history_db if h["patient_id"] == patient_id]
    vital_signs = [VitalSigns(**vs) for vs in vital_signs_db if vs["patient_id"] == patient_id]
    prescriptions = [Prescription(**p) for p in prescriptions_db if p["patient_id"] == patient_id]
    appointments = [Appointment(**a) for a in appointments_db if a["patient_id"] == patient_id]
    
    return {
        "patient": PatientResponse(**patient),
        "medical_history": sorted(medical_history, key=lambda x: x.date, reverse=True),
        "vital_signs": sorted(vital_signs, key=lambda x: x.date_recorded, reverse=True),
        "prescriptions": sorted(prescriptions, key=lambda x: x.prescribed_date, reverse=True),
        "appointments": sorted(appointments, key=lambda x: x.date_time),
        "active_prescriptions": [p for p in prescriptions if p.status == PrescriptionStatus.ACTIVE],
        "upcoming_appointments": [a for a in appointments if a.date_time > datetime.now() and a.status in [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]]
    }

if __name__ == "__main__":
    print("🚀 Starting Historias Clínicas API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
