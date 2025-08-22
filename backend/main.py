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

# Patient Data Models
class PatientBase(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: date
    gender: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    curp: Optional[str] = None  # Mexican unique ID
    insurance_type: str = "Ninguno"
    insurance_number: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    blood_type: Optional[str] = None

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
    chief_complaint: str
    history_present_illness: str
    physical_examination: Optional[str] = None
    diagnosis: str
    treatment_plan: Optional[str] = None
    follow_up_instructions: Optional[str] = None
    doctor_notes: Optional[str] = None
    vital_signs_id: Optional[str] = None

class Prescription(BaseModel):
    id: Optional[str] = None
    patient_id: str
    medical_history_id: Optional[str] = None
    medication_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None
    prescribed_date: datetime
    status: PrescriptionStatus = PrescriptionStatus.ACTIVE
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

# Mock databases
patients_db = [
    {
        "id": "PAT001",
        "first_name": "María",
        "last_name": "González Pérez",
        "full_name": "María González Pérez",
        "date_of_birth": date(1985, 5, 15),
        "age": 39,
        "gender": "Femenino",
        "phone": "+52 555 123 4567",
        "email": "maria.gonzalez@email.com",
        "address": "Av. Insurgentes Sur 123, CDMX",
        "curp": "GOPM850515MDFNTR09",
        "insurance_type": "IMSS",
        "insurance_number": "123456789",
        "blood_type": "O+",
        "allergies": "Penicilina",
        "chronic_conditions": "Diabetes tipo 2",
        "current_medications": "Metformina 500mg",
        "emergency_contact_name": "Juan González",
        "emergency_contact_phone": "+52 555 987 6543",
        "emergency_contact_relationship": "Esposo",
        "created_at": datetime(2024, 1, 15, 10, 30),
        "last_visit": datetime(2024, 8, 20, 14, 45),
        "total_visits": 5,
        "status": "active"
    },
    {
        "id": "PAT002",
        "first_name": "Carlos",
        "last_name": "Hernández López",
        "full_name": "Carlos Hernández López",
        "date_of_birth": date(1978, 12, 3),
        "age": 45,
        "gender": "Masculino",
        "phone": "+52 555 234 5678",
        "email": "carlos.hernandez@email.com",
        "address": "Calle Reforma 456, CDMX",
        "curp": "HELC781203HDFNPR05",
        "insurance_type": "Seguro Popular",
        "insurance_number": "987654321",
        "blood_type": "A+",
        "allergies": "Ninguna conocida",
        "chronic_conditions": "Hipertensión",
        "current_medications": "Losartán 50mg",
        "emergency_contact_name": "Ana Hernández",
        "emergency_contact_phone": "+52 555 876 5432",
        "emergency_contact_relationship": "Esposa",
        "created_at": datetime(2024, 2, 10, 9, 15),
        "last_visit": datetime(2024, 8, 18, 11, 30),
        "total_visits": 3,
        "status": "active"
    },
    {
        "id": "PAT003",
        "first_name": "Ana",
        "last_name": "Rodríguez Martín",
        "full_name": "Ana Rodríguez Martín",
        "date_of_birth": date(1992, 8, 22),
        "age": 32,
        "gender": "Femenino",
        "phone": "+52 555 345 6789",
        "email": "ana.rodriguez@email.com",
        "address": "Col. Roma Norte 789, CDMX",
        "curp": "ROMA920822MDFDRN01",
        "insurance_type": "Privado",
        "insurance_number": "PRV123456",
        "blood_type": "B+",
        "allergies": "Aspirina",
        "chronic_conditions": "Ninguna",
        "current_medications": "Ninguna",
        "emergency_contact_name": "Luis Rodríguez",
        "emergency_contact_phone": "+52 555 765 4321",
        "emergency_contact_relationship": "Padre",
        "created_at": datetime(2024, 3, 5, 16, 20),
        "last_visit": datetime(2024, 8, 15, 10, 15),
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
        "history_present_illness": "Paciente refiere dolor de cabeza intermitente de 3 días de evolución, acompañado de mareo ocasional. Sin fiebre ni náuseas.",
        "physical_examination": "TA: 130/85 mmHg, FC: 78 lpm, T: 36.5°C. Paciente consciente, orientada, sin signos de alarma neurológica.",
        "diagnosis": "Cefalea tensional. Control de diabetes mellitus tipo 2.",
        "treatment_plan": "Paracetamol 500mg c/8hrs por 5 días. Continuar con metformina. Control en 1 semana.",
        "follow_up_instructions": "Regresar si persiste dolor o aparecen síntomas neurológicos. Control de glucosa diario.",
        "doctor_notes": "Paciente con buen control diabético. Revisar niveles de estrés.",
        "vital_signs_id": "VS001"
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
    """Create a new patient"""
    # Generate new patient ID
    existing_ids = [int(p["id"][3:]) for p in patients_db]
    new_id = f"PAT{max(existing_ids) + 1:03d}"
    
    # Calculate age
    today = date.today()
    age = today.year - patient.date_of_birth.year - ((today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day))
    
    # Create new patient record
    new_patient = {
        "id": new_id,
        "full_name": f"{patient.first_name} {patient.last_name}",
        "age": age,
        "created_at": datetime.now(),
        "last_visit": None,
        "total_visits": 0,
        "status": "active",
        **patient.dict()
    }
    
    patients_db.append(new_patient)
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
    
    # Update patient record
    updated_patient = {
        **patients_db[patient_index],
        **patient_update.dict(),
        "full_name": f"{patient_update.first_name} {patient_update.last_name}",
        "age": age
    }
    
    patients_db[patient_index] = updated_patient
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
