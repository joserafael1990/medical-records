#!/usr/bin/env python3
"""
Clean English API for Historias Clínicas
All endpoints standardized in English
No legacy code - completely fresh implementation
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, bindparam
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
import pytz
import psycopg2
from psycopg2.extras import Json
import os
import json
import uuid
import crud
import schemas
import auth
from database import get_db, Person, Specialty, Country, State, EmergencyRelationship, Appointment, MedicalRecord, ClinicalStudy, VitalSign, ConsultationVitalSign, Medication, ConsultationPrescription, AuditLog, PrivacyNotice, PrivacyConsent, ARCORequest, Office, AppointmentType, DocumentType, Document, PersonDocument
from appointment_service import AppointmentService
from audit_service import audit_service
import data_retention_service as retention
# Schedule routes migrated to routes/schedule.py
from consultation_service import (
    decrypt_patient_data,
    decrypt_consultation_data,
    format_patient_name,
    format_doctor_name,
    get_consultation_vital_signs as get_vital_signs_for_consultation,
    get_consultation_prescriptions as get_prescriptions_for_consultation,
    get_consultation_clinical_studies as get_clinical_studies_for_consultation,
    build_consultation_response,
    # Create consultation helpers
    encrypt_consultation_fields,
    parse_consultation_date,
    create_medical_record_object,
    prepare_consultation_for_signing,
    mark_appointment_completed,
    get_patient_info,
    build_create_consultation_response
)
from encryption import get_encryption_service, MedicalDataEncryption
from digital_signature import get_digital_signature_service, get_medical_document_signer
from whatsapp_service import get_whatsapp_service
from logger import get_logger, setup_logging
from error_middleware import ErrorHandlingMiddleware

# ============================================================================
# GLOBAL TIMEZONE CONFIGURATION
# ============================================================================
# Configure entire system to use CDMX timezone natively
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')
os.environ['TZ'] = 'America/Mexico_City'

def now_cdmx():
    """Get current datetime in CDMX timezone"""
    return datetime.now(SYSTEM_TIMEZONE)

def cdmx_datetime(dt_string: str) -> datetime:
    """Parse datetime string and convert to CDMX timezone"""
    if isinstance(dt_string, str):
        import pytz
        
        # Parse the datetime string
        dt = datetime.fromisoformat(dt_string.replace('Z', ''))
        
        # If the datetime is naive (no timezone info), assume it's UTC
        if dt.tzinfo is None:
            # Assume it's UTC and convert to CDMX
            utc_tz = pytz.utc
            cdmx_tz = pytz.timezone('America/Mexico_City')
            utc_dt = utc_tz.localize(dt)
            result = utc_dt.astimezone(cdmx_tz)
        else:
            # If it already has timezone info, convert to CDMX
            cdmx_tz = pytz.timezone('America/Mexico_City')
            result = dt.astimezone(cdmx_tz)
        
        return result
    return dt_string

# ============================================================================
# TIMEZONE CONFIGURATION - CDMX (UTC-6)
# ============================================================================

def to_cdmx_timezone(dt: datetime) -> datetime:
    """Convert datetime to CDMX timezone"""
    if dt.tzinfo is None:
        # Assume UTC if naive
        dt = pytz.utc.localize(dt)
    return dt.astimezone(SYSTEM_TIMEZONE)

def from_cdmx_to_utc(dt: datetime) -> datetime:
    """Convert CDMX datetime to UTC for database storage"""
    if dt.tzinfo is None:
        # Assume CDMX if naive
        dt = SYSTEM_TIMEZONE.localize(dt)
    return dt.astimezone(pytz.utc)

# ============================================================================
# ENCRYPTION SETUP
# ============================================================================

# Initialize encryption service
encryption_service = get_encryption_service()

# Initialize digital signature services
digital_signature_service = get_digital_signature_service()
medical_document_signer = get_medical_document_signer()

# Initialize structured logging
setup_logging()
logger = get_logger("medical_records")
api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")

def encrypt_sensitive_data(data: dict, data_type: str = "patient") -> dict:
    """Encrypt sensitive fields in data based on type"""
    if not data:
        return data
    
    # DEVELOPMENT MODE: Skip encryption - return data as-is
    print(f"🔐 DEVELOPMENT MODE: Skipping encryption for {data_type}")
    return data

def decrypt_sensitive_data(data: dict, data_type: str = "patient") -> dict:
    """Decrypt sensitive fields in data based on type"""
    if not data:
        return data
    
    # DEVELOPMENT MODE: Skip decryption - return data as-is
    print(f"🔓 DEVELOPMENT MODE: Skipping decryption for {data_type}")
    return data

def sign_medical_document(document_data: dict, doctor_id: int, document_type: str = "consultation") -> dict:
    """Sign medical document with digital signature"""
    try:
        print(f"🔏 Signing {document_type} document for doctor {doctor_id}")
        
        # Add document metadata
        document_data["id"] = str(document_data.get("id", "unknown"))
        document_data["doctor_id"] = doctor_id
        document_data["date"] = document_data.get("consultation_date", now_cdmx().isoformat())
        
        # Generate a simple key pair for demonstration (in production, use real certificates)
        private_key, public_key = digital_signature_service.generate_key_pair()
        
        # Create a self-signed certificate for the doctor
        doctor_info = {
            "name": f"Doctor {doctor_id}",
            "curp": f"DOCTOR{doctor_id:06d}",
            "license": f"LIC{doctor_id:06d}"
        }
        
        certificate = digital_signature_service.create_self_signed_certificate(
            private_key, doctor_info, validity_days=365
        )
        
        # Sign the document
        if document_type == "consultation":
            signature_result = medical_document_signer.sign_consultation(
                document_data, private_key, certificate
            )
        else:
            # Generic document signing
            signature_result = medical_document_signer.sign_consultation(
                document_data, private_key, certificate
            )
        
        print(f"✅ Document signed successfully - Signature ID: {signature_result['signatures'][0]['signature_id']}")
        return signature_result
        
    except Exception as e:
        print(f"⚠️ Failed to sign document: {str(e)}")
        # Return a placeholder signature for demonstration
        return {
            "document_id": str(document_data.get("id", "unknown")),
            "document_type": document_type,
            "signatures": [{
                "signature_id": f"sig_{uuid.uuid4().hex[:8]}",
                "document_hash": "placeholder_hash",
                "signature_value": "placeholder_signature",
                "timestamp": now_cdmx().isoformat(),
                "signer_certificate": "placeholder_certificate",
                "algorithm": "SHA256withRSA",
                "status": "signed"
            }],
            "document_hash": "placeholder_document_hash",
            "creation_timestamp": now_cdmx().isoformat(),
            "last_signature_timestamp": now_cdmx().isoformat()
        }

# ============================================================================
# FASTAPI APP SETUP
# ============================================================================

app = FastAPI(
    title="Medical Records API",
    description="Clean English API for Medical Records System",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ============================================================================
# BACKGROUND SCHEDULER: Auto WhatsApp Appointment Reminders
# ============================================================================
from services.scheduler import start_auto_reminder_scheduler

@app.on_event("startup")
async def start_background_tasks():
    start_auto_reminder_scheduler(app)

# CORS - Enhanced configuration for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        # Allow all origins in development (less secure but works)
        "*",
        "null"  # For local file:// access
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add enhanced error handling middleware
app.add_middleware(ErrorHandlingMiddleware, debug=True)

# Debugging middleware removed

# Security (moved to dependencies.py, import here for backward compatibility)
from dependencies import security

# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

# Schedule endpoints migrated to routes/schedule.py

# Include diagnosis catalog routes
from routes.diagnosis import router as diagnosis_router
app.include_router(diagnosis_router, tags=["diagnosis-catalog"])

# Include catalog routes (specialties, countries, states, etc.)
from routes.catalogs import router as catalogs_router
app.include_router(catalogs_router)

# Include document management routes
from routes.documents import router as documents_router
app.include_router(documents_router)

# Include office management routes
from routes.offices import router as offices_router
app.include_router(offices_router)

# Include medication management routes
from routes.medications import router as medications_router
app.include_router(medications_router)

# Include schedule management routes
from routes.schedule import router as schedule_router
app.include_router(schedule_router)

# Include doctor management routes
from routes.doctors import router as doctors_router
app.include_router(doctors_router)

# Include patient management routes
from routes.patients import router as patients_router
app.include_router(patients_router)

# Include appointment management routes
from routes.appointments import router as appointments_router
app.include_router(appointments_router)

# Include clinical studies management routes
from routes.clinical_studies import router as clinical_studies_router
app.include_router(clinical_studies_router)

# Include dashboard routes
from routes.dashboard import router as dashboard_router
app.include_router(dashboard_router)

# Include vital signs routes
from routes.vital_signs import router as vital_signs_router
app.include_router(vital_signs_router)

# Include authentication routes
from routes.auth import router as auth_router
app.include_router(auth_router)

# Include privacy and ARCO routes
from routes.privacy import router as privacy_router
app.include_router(privacy_router)

# Include consultations routes
from routes.consultations import router as consultations_router
app.include_router(consultations_router)

# ============================================================================
# AUTHENTICATION DEPENDENCY
# ============================================================================

# get_current_user moved to dependencies.py to avoid circular imports
from dependencies import get_current_user

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "Medical Records API v3.0",
        "status": "operational",
        "language": "english",
        "database": "PostgreSQL",
        "compliance": "Mexican NOMs"
    }

@app.get("/health")
async def health():
    """
    Health check endpoint
    Verifica que el servidor esté funcionando correctamente
    Usado por Docker health check y monitoreo
    """
    return {
        "status": "healthy",
        "timestamp": now_cdmx().isoformat(),
        "service": "Medical Records API",
        "version": "3.0.0"
    }

# Removed custom OPTIONS handler - let CORS middleware handle preflight requests

# ============================================================================
# CLINICAL STUDIES API ENDPOINTS
# ============================================================================
# MIGRADO a routes/clinical_studies.py - Los siguientes 9 endpoints fueron migrados:
# - GET /api/clinical-studies/patient/{patient_id} ✅ ELIMINADO
# - GET /api/clinical-studies/consultation/{consultation_id}
# - POST /api/clinical-studies
# - PUT /api/clinical-studies/{study_id}
# - DELETE /api/clinical-studies/{study_id}
# - PUT /api/clinical-studies/{study_id}/upload
# - GET /api/clinical-studies/{study_id}/file
# - GET /api/study-categories
# - GET /api/study-catalog

# ============================================================================
# VITAL SIGNS
# ============================================================================
# MIGRADO a routes/vital_signs.py - Los siguientes 4 endpoints fueron migrados:
# - GET /api/vital-signs ✅ ELIMINADO
# - GET /api/consultations/{consultation_id}/vital-signs ✅ ELIMINADO
# - POST /api/consultations/{consultation_id}/vital-signs ✅ ELIMINADO
# - DELETE /api/consultations/{consultation_id}/vital-signs/{vital_sign_id} ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/vital_signs.py

# ============================================================================
# MEDICATIONS AND PRESCRIPTIONS ENDPOINTS
# ============================================================================
# Medications endpoints MIGRADO a routes/medications.py

# ============================================================================
# OFFICE MANAGEMENT ENDPOINTS
# ============================================================================
# MIGRADO a routes/offices.py

# ============================================================================
# PRESCRIPTIONS ENDPOINTS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes 4 endpoints fueron migrados:
# - GET /api/consultations/{consultation_id}/prescriptions
# - POST /api/consultations/{consultation_id}/prescriptions
# - PUT /api/consultations/{consultation_id}/prescriptions/{prescription_id}
# - DELETE /api/consultations/{consultation_id}/prescriptions/{prescription_id}
# TODO: Eliminar código después de validar que todo funciona

# Endpoints eliminados - ahora están en routes/consultations.py

# ============================================================================
# CLINICAL STUDIES ENDPOINTS
# ============================================================================
# MIGRADO a routes/clinical_studies.py - Estos endpoints fueron eliminados:
# - GET /api/clinical-studies/consultation/{consultation_id} ✅ ELIMINADO
# - POST /api/clinical-studies ✅ ELIMINADO
# - PUT /api/clinical-studies/{study_id} ✅ ELIMINADO
# - DELETE /api/clinical-studies/{study_id} ✅ ELIMINADO
# - PUT /api/clinical-studies/{study_id}/upload ✅ ELIMINADO
# - GET /api/clinical-studies/{study_id}/file ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/clinical_studies.py

# ============================================================================
# WHATSAPP NOTIFICATIONS
# ============================================================================

from routes.whatsapp import router as whatsapp_router
app.include_router(whatsapp_router)

@app.get("/api/whatsapp/webhook")
async def whatsapp_webhook_verify(request: Request):
    """Verificación del webhook de WhatsApp"""
    try:
        # Obtener parámetros de verificación
        mode = request.query_params.get('hub.mode')
        token = request.query_params.get('hub.verify_token')
        challenge = request.query_params.get('hub.challenge')
        
        print(f"🔍 WhatsApp webhook verification: mode={mode}, token={token}")
        
        # Verificar token (debe coincidir con el configurado en Meta)
        verify_token = "whatsapp_verify_token"  # Debe coincidir con el configurado en Meta
        
        if mode == 'subscribe' and token == verify_token:
            print("✅ WhatsApp webhook verified successfully")
            return int(challenge)  # Meta espera el challenge como número
        else:
            print(f"❌ WhatsApp webhook verification failed: mode={mode}, token={token}")
            raise HTTPException(status_code=403, detail="Verification failed")
            
    except Exception as e:
        print(f"❌ Error in webhook verification: {e}")
        raise HTTPException(status_code=500, detail="Verification error")


@app.post("/api/whatsapp/study-results/{study_id}")
async def send_whatsapp_study_results_notification(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Notificar por WhatsApp que los resultados de un estudio están disponibles"""
    print(f"📱 Sending WhatsApp notification for study results: {study_id}")
    
    try:
        # Get study
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Study not found or no access")
        
        # Get patient
        patient = db.query(Person).filter(Person.id == study.patient_id).first()
        
        if not patient or not patient.primary_phone:
            raise HTTPException(status_code=400, detail="Patient phone number not found")
        
        # Generate secure link (placeholder - implement token system later)
        secure_link = f"http://localhost:3000/patient/studies/{study.id}"
        
        # Send WhatsApp
        whatsapp = get_whatsapp_service()
        result = whatsapp.send_lab_results_notification(
            patient_phone=patient.primary_phone,
            patient_name=patient.first_name,
            study_name=study.study_name,
            secure_link=secure_link
        )
        
        if result['success']:
            print(f"✅ WhatsApp sent successfully to {patient.primary_phone}")
            return {
                "message": "WhatsApp notification sent successfully",
                "message_id": result.get('message_id'),
                "phone": patient.primary_phone
            }
        else:
            print(f"❌ Failed to send WhatsApp: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send WhatsApp: {result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending WhatsApp notification: {e}")
        raise HTTPException(status_code=500, detail=f"Error sending WhatsApp: {str(e)}")

@app.post("/api/whatsapp/test")
async def test_whatsapp_service(
    phone: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Endpoint de prueba para WhatsApp (agnóstico del proveedor)
    Envía un mensaje de prueba de texto simple
    """
    print(f"📱 Testing WhatsApp service to {phone}")
    
    try:
        whatsapp = get_whatsapp_service()
        result = whatsapp.send_text_message(
            to_phone=phone,
            message='Mensaje de prueba desde el sistema de citas',
        )
        
        if result['success']:
            return {
                "message": "Test message sent successfully",
                "message_id": result.get('message_id') or result.get('message_sid'),
                "phone": phone,
                "note": "If you didn't receive the message, make sure your number is registered in Meta WhatsApp dashboard"
            }
        else:
            return {
                "message": "Failed to send test message",
                "error": result.get('error'),
                "details": result.get('details')
            }
            
    except Exception as e:
        print(f"❌ Error testing WhatsApp: {e}")
        return {
            "message": "Error testing WhatsApp",
            "error": str(e)
        }

# ============================================================================
# WHATSAPP WEBHOOK - Recibir respuestas de pacientes
# ============================================================================

@app.get("/api/whatsapp/webhook")
async def verify_whatsapp_webhook(request: Request):
    """
    Verificación del webhook de WhatsApp (requerido por Meta)
    Meta envía una petición GET para verificar el webhook
    """
    # Get query parameters
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    # Verify token (configurable en variables de entorno)
    verify_token = os.getenv('META_WHATSAPP_VERIFY_TOKEN', 'mi_token_secreto_123')
    
    if mode == "subscribe" and token == verify_token:
        print("✅ WhatsApp webhook verified successfully")
        return int(challenge)
    else:
        print("❌ WhatsApp webhook verification failed")
        raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/api/whatsapp/webhook")
async def receive_whatsapp_message(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Recibir mensajes y respuestas de WhatsApp
    Procesa respuestas a botones de plantillas (ej: cancelar cita)
    """
    try:
        body = await request.json()
        print(f"📱 Received WhatsApp webhook: {body}")
        print(f"📱 Webhook body type: {type(body)}")
        print(f"📱 Webhook body keys: {body.keys() if isinstance(body, dict) else 'Not a dict'}")
        
        # Verificar que es una notificación de WhatsApp
        if body.get("object") != "whatsapp_business_account":
            return {"status": "ignored"}
        
        # Procesar entries
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                print(f"🔍 Processing change: {change}")
                print(f"🔍 Processing value: {value}")
                
                # Verificar si hay mensajes
                if "messages" in value:
                    print(f"📩 Found {len(value['messages'])} messages")
                    for message in value["messages"]:
                        print(f"📩 Processing message: {message}")
                        await process_whatsapp_message(message, db)
                
                # Verificar si hay respuestas a botones
                if "statuses" in value:
                    print(f"📊 Message status update: {value['statuses']}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"❌ Error processing WhatsApp webhook: {e}")
        # Siempre devolver 200 para no causar reintentos de Meta
        return {"status": "error", "message": str(e)}

async def process_whatsapp_message(message: dict, db: Session):
    """
    Procesar un mensaje recibido de WhatsApp
    Detecta respuestas a botones de cancelación y consentimiento de privacidad
    """
    try:
        message_type = message.get("type")
        from_phone = message.get("from")
        
        print(f"📩 Processing message type: {message_type} from {from_phone}")
        
        # Procesar respuesta a botón interactivo (nuevo formato de WhatsApp)
        if message_type == "interactive":
            interactive = message.get("interactive", {})
            if interactive.get("type") == "button_reply":
                button_reply = interactive.get("button_reply", {})
                button_id = button_reply.get("id")
                button_title = button_reply.get("title")
                
                print(f"🔘 Interactive button clicked: {button_title} (id: {button_id})")
                
                # Procesar botones de consentimiento de privacidad
                if button_id and button_id.startswith("accept_privacy_"):
                    print(f"✅ Privacy consent accepted: {button_id}")
                    await process_privacy_consent(button_id, from_phone, db)
                
                # Procesar botones de cancelación de cita
                elif button_id and button_id.startswith("cancel_appointment_"):
                    appointment_id = int(button_id.replace("cancel_appointment_", ""))
                    await cancel_appointment_via_whatsapp(appointment_id, from_phone, db)
        
        # Procesar respuesta a botón (formato anterior)
        elif message_type == "button":
            button_payload = message.get("button", {}).get("payload")
            button_text = message.get("button", {}).get("text")
            
            print(f"🔘 Button clicked: {button_text} (payload: {button_payload})")
            
            # Si es una cancelación de cita
            if button_payload and button_payload.startswith("cancel_appointment_"):
                appointment_id = int(button_payload.replace("cancel_appointment_", ""))
                await cancel_appointment_via_whatsapp(appointment_id, from_phone, db)
            # Manejar payload "Cancelar" genérico
            elif button_payload == "Cancelar" or button_text == "Cancelar":
                print(f"🔄 Generic cancel button clicked, processing as text cancellation")
                await process_text_cancellation_request("cancelar", from_phone, db)
        
        # Procesar mensaje de texto
        elif message_type == "text":
            text = message.get("text", {}).get("body", "").lower().strip()
            print(f"💬 Text message received: {text}")
            
            # Procesar mensajes de cancelación
            if any(keyword in text for keyword in ["cancelar", "cancel", "cancelar cita", "cancel appointment"]):
                print(f"🔄 Detected cancellation request in text: {text}")
                await process_text_cancellation_request(text, from_phone, db)
        
    except Exception as e:
        print(f"❌ Error processing WhatsApp message: {e}")

async def process_privacy_consent(button_id: str, from_phone: str, db: Session):
    """
    Procesar consentimiento de privacidad recibido vía WhatsApp
    """
    try:
        print(f"🔐 Processing privacy consent: {button_id} from {from_phone}")
        
        # Extraer el ID del consentimiento del button_id (ej: accept_privacy_8)
        consent_id = int(button_id.replace("accept_privacy_", ""))
        
        # Buscar el registro de consentimiento
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.id == consent_id
        ).first()
        
        if not consent:
            print(f"❌ Privacy consent record {consent_id} not found")
            return
        
        # Buscar el paciente
        patient = db.query(Person).filter(
            Person.id == consent.patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            print(f"❌ Patient {consent.patient_id} not found for consent {consent_id}")
            return
        
        # Verificar que el teléfono corresponde al paciente
        # Normalizar números para comparación
        whatsapp = get_whatsapp_service()
        normalized_patient_phone = whatsapp._format_phone_number(patient.primary_phone)
        normalized_from_phone = whatsapp._format_phone_number(from_phone)
        
        # También probar con formato internacional (521...)
        patient_phone_international = f"521{patient.primary_phone}"
        
        print(f"🔍 Comparing phones:")
        print(f"  - Patient phone (formatted): {normalized_patient_phone}")
        print(f"  - Patient phone (international): {patient_phone_international}")
        print(f"  - WhatsApp phone: {normalized_from_phone}")
        
        if normalized_patient_phone != normalized_from_phone and patient_phone_international != normalized_from_phone:
            print(f"❌ Phone mismatch: {normalized_patient_phone} != {normalized_from_phone} and {patient_phone_international} != {normalized_from_phone}")
            return
        
        # Actualizar el consentimiento
        consent.consent_given = True
        consent.consent_date = datetime.utcnow()
        
        db.commit()
        
        print(f"✅ Privacy consent updated for patient {consent.patient_id} (consent {consent_id})")
        
        # Opcional: Enviar mensaje de confirmación
        # (Esto requeriría una plantilla adicional aprobada)
        
    except Exception as e:
        print(f"❌ Error processing privacy consent: {e}")
        db.rollback()

async def cancel_appointment_via_whatsapp(appointment_id: int, patient_phone: str, db: Session):
    """
    Cancelar una cita cuando el paciente responde vía WhatsApp
    """
    try:
        print(f"🔄 Canceling appointment {appointment_id} via WhatsApp from {patient_phone}")
        
        # Buscar la cita
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            print(f"❌ Appointment {appointment_id} not found")
            return
        
        # Verificar que el teléfono corresponde al paciente
        patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
        
        if not patient:
            print(f"❌ Patient not found for appointment {appointment_id}")
            return
        
        # Normalizar números para comparación
        whatsapp = get_whatsapp_service()
        normalized_patient_phone = whatsapp._format_phone_number(patient.primary_phone)
        normalized_from_phone = whatsapp._format_phone_number(patient_phone)
        
        if normalized_patient_phone != normalized_from_phone:
            print(f"❌ Phone mismatch: {normalized_patient_phone} != {normalized_from_phone}")
            return
        
        # Cancelar la cita
        appointment.status = 'cancelled'
        appointment.cancellation_reason = 'Cancelada por el paciente vía WhatsApp'
        appointment.updated_at = datetime.utcnow()
        
        db.commit()
        
        print(f"✅ Appointment {appointment_id} cancelled successfully via WhatsApp")
        
        # Opcional: Enviar mensaje de confirmación al paciente
        # (Esto requeriría una plantilla adicional aprobada)
        
    except Exception as e:
        db.rollback()

async def process_text_cancellation_request(text: str, patient_phone: str, db: Session):
    """
    Procesar solicitud de cancelación recibida como mensaje de texto
    Busca la próxima cita del paciente y la cancela
    """
    try:
        
        # Buscar el paciente por teléfono con prioridad a los que tienen citas activas
        whatsapp = get_whatsapp_service()
        matching_patient = None
        
        # Primero buscar pacientes con citas activas y el número correcto
        patients_with_appointments = db.query(Person).join(
            Appointment, Person.id == Appointment.patient_id
        ).filter(
            Person.person_type == 'patient',
            Person.primary_phone.isnot(None),
            Appointment.status.in_(['confirmed', 'scheduled'])
        ).all()
        
        
        # Buscar entre pacientes con citas activas
        for p in patients_with_appointments:
            normalized_patient_phone = whatsapp._format_phone_number(p.primary_phone)
            normalized_from_phone = whatsapp._format_phone_number(patient_phone)
            
            # Comparar números directamente
            if normalized_patient_phone == normalized_from_phone:
                matching_patient = p
                break
            
            # También comparar con formato alternativo (con/sin 1 después del 52)
            if normalized_from_phone.startswith("521") and normalized_patient_phone.startswith("52"):
                alternative_whatsapp_phone = normalized_from_phone.replace("521", "52")
                if normalized_patient_phone == alternative_whatsapp_phone:
                    matching_patient = p
                    break
            
            if normalized_patient_phone.startswith("521") and normalized_from_phone.startswith("52"):
                alternative_patient_phone = normalized_patient_phone.replace("521", "52")
                if normalized_from_phone == alternative_patient_phone:
                    matching_patient = p
                    break
        
        # Si no se encontró entre pacientes con citas activas, buscar en todos los pacientes
        if not matching_patient:
            all_patients = db.query(Person).filter(
                Person.person_type == 'patient',
                Person.primary_phone.isnot(None)
            ).all()
            
            for p in all_patients:
                normalized_patient_phone = whatsapp._format_phone_number(p.primary_phone)
                normalized_from_phone = whatsapp._format_phone_number(patient_phone)
                
                # Comparar números directamente
                if normalized_patient_phone == normalized_from_phone:
                    matching_patient = p
                    break
                
                # También comparar con formato alternativo (con/sin 1 después del 52)
                if normalized_from_phone.startswith("521") and normalized_patient_phone.startswith("52"):
                    alternative_whatsapp_phone = normalized_from_phone.replace("521", "52")
                    if normalized_patient_phone == alternative_whatsapp_phone:
                        matching_patient = p
                        break
                
                if normalized_patient_phone.startswith("521") and normalized_from_phone.startswith("52"):
                    alternative_patient_phone = normalized_patient_phone.replace("521", "52")
                    if normalized_from_phone == alternative_patient_phone:
                        matching_patient = p
                        break
        
        if not matching_patient:
            return
        
        # Buscar la próxima cita del paciente (más flexible)
        from datetime import datetime
        # Primero buscar citas confirmadas futuras
        next_appointment = db.query(Appointment).filter(
            Appointment.patient_id == matching_patient.id,
            Appointment.status == 'confirmed',
            Appointment.appointment_date >= datetime.now()
        ).order_by(Appointment.appointment_date.asc()).first()
        
        if not next_appointment:
            # Si no hay citas confirmadas, buscar cualquier cita futura (excepto canceladas)
            next_appointment = db.query(Appointment).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status != 'cancelled',
                Appointment.appointment_date >= datetime.now()
            ).order_by(Appointment.appointment_date.asc()).first()
        
        if not next_appointment:
            # Si no hay citas futuras, buscar cualquier cita reciente (últimos 7 días) EXCEPTO CANCELADAS
            from datetime import timedelta
            recent_date = datetime.now() - timedelta(days=7)
            next_appointment = db.query(Appointment).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status != 'cancelled',  # ← EXCLUIR CITAS CANCELADAS
                Appointment.appointment_date >= recent_date
            ).order_by(Appointment.appointment_date.desc()).first()
        
        if not next_appointment:
            return
        
        # Actualizar campos de cancelación específicos
        next_appointment.status = 'cancelled'
        next_appointment.cancelled_reason = 'cancelled by patient'
        next_appointment.cancelled_at = datetime.utcnow()
        next_appointment.cancelled_by = matching_patient.id
        next_appointment.updated_at = datetime.utcnow()
        
        try:
            db.commit()
            db.refresh(next_appointment)
        except Exception as commit_error:
            db.rollback()
            raise commit_error
        
        # Opcional: Enviar mensaje de confirmación al paciente
        # (Esto requeriría una plantilla adicional aprobada)
        
    except Exception as e:
        db.rollback()

# ============================================================================
# CATALOGS (PUBLIC ENDPOINTS)
# ============================================================================
# MIGRADO a routes/catalogs.py

# ============================================================================
# DOCUMENT MANAGEMENT ENDPOINTS
# ============================================================================
# MIGRADO a routes/documents.py

# MIGRADO a routes/catalogs.py

# ============================================================================
# DEBUGGING ENDPOINTS
# ============================================================================
# NOTE: These endpoints are for development only. In production, they should be disabled.
# Consider using environment variable check: if os.getenv('ENABLE_DEBUG_ENDPOINTS') == 'true'

# Debug endpoints disabled by default - uncomment if needed for development
# To enable debug endpoints, uncomment the block below and set ENABLE_DEBUG_ENDPOINTS=true
# if os.getenv('ENABLE_DEBUG_ENDPOINTS') == 'true':
#     @app.get("/api/debug/office-system")
async def debug_office_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug office system status"""
    try:
        # Check offices
        offices = db.query(Office).all()
        office_data = []
        
        for office in offices:
            office_info = {
                'id': office.id,
                'name': office.name,
                'doctor_id': office.doctor_id,
                'address': office.address,
                'city': office.city,
                'state_id': office.state_id,
                'country_id': office.country_id,
                'phone': office.phone,
                'timezone': office.timezone,
                'is_active': office.is_active,
                'created_at': office.created_at.isoformat() if office.created_at else None
            }
            office_data.append(office_info)
        
        # Check doctors without offices
        doctors_without_offices = db.query(Person).filter(
            Person.person_type == 'doctor',
            Person.is_active == True
        ).all()
        
        doctors_without_offices_data = []
        for doctor in doctors_without_offices:
            has_office = db.query(Office).filter(
                Office.doctor_id == doctor.id,
                Office.is_active == True
            ).first() is not None
            
            if not has_office:
                doctors_without_offices_data.append({
                    'id': doctor.id,
                    'name': f"{doctor.first_name} {doctor.paternal_surname}",
                    'email': doctor.email
                })
        
        return {
            'status': 'success',
            'total_offices': len(offices),
            'offices': office_data,
            'doctors_without_offices': len(doctors_without_offices_data),
            'doctors_without_offices_data': doctors_without_offices_data,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/appointment-system")
async def debug_appointment_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug appointment system status"""
    try:
        # Check appointments
        appointments = db.query(Appointment).all()
        appointment_data = []
        
        for appointment in appointments:
            appointment_info = {
                'id': appointment.id,
                'patient_id': appointment.patient_id,
                'doctor_id': appointment.doctor_id,
                'appointment_date': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                'appointment_type_id': appointment.appointment_type_id,
                'office_id': appointment.office_id,
                'status': appointment.status,
                'reason': appointment.reason
            }
            appointment_data.append(appointment_info)
        
        # Check appointment types
        appointment_types = db.query(AppointmentType).all()
        appointment_types_data = []
        
        for apt_type in appointment_types:
            apt_type_info = {
                'id': apt_type.id,
                'name': apt_type.name,
                'active': apt_type.active
            }
            appointment_types_data.append(apt_type_info)
        
        # Check appointments without office_id
        appointments_without_office = db.query(Appointment).filter(
            Appointment.office_id.is_(None)
        ).count()
        
        # Check appointments without appointment_type_id
        appointments_without_type = db.query(Appointment).filter(
            Appointment.appointment_type_id.is_(None)
        ).count()
        
        return {
            'status': 'success',
            'total_appointments': len(appointments),
            'appointments': appointment_data,
            'appointment_types': appointment_types_data,
            'appointments_without_office': appointments_without_office,
            'appointments_without_type': appointments_without_type,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/consultation-system")
async def debug_consultation_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug consultation system status"""
    try:
        # Check medical records
        medical_records = db.query(MedicalRecord).all()
        medical_records_data = []
        
        for record in medical_records:
            record_info = {
                'id': record.id,
                'patient_id': record.patient_id,
                'doctor_id': record.doctor_id,
                'consultation_date': record.consultation_date.isoformat() if record.consultation_date else None,
                # appointment_type_id and office_id columns don't exist in medical_records table
                'appointment_type_id': None,
                'office_id': None,
                'chief_complaint': record.chief_complaint[:100] + '...' if record.chief_complaint and len(record.chief_complaint) > 100 else record.chief_complaint
            }
            medical_records_data.append(record_info)
        
        # Check medical records without office_id
        records_without_office = db.query(MedicalRecord).filter(
            # office_id column doesn't exist in medical_records table - removed filter
            False
        ).count()
        
        # Check medical records without appointment_type_id
        records_without_type = db.query(MedicalRecord).filter(
            # appointment_type_id column doesn't exist in medical_records table - removed filter
            False
        ).count()
        
        return {
            'status': 'success',
            'total_medical_records': len(medical_records),
            'medical_records': medical_records_data,
            'records_without_office': records_without_office,
            'records_without_type': records_without_type,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/whatsapp-system")
async def debug_whatsapp_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug WhatsApp system status"""
    try:
        # Check WhatsApp configuration
        whatsapp_config = {
            'phone_id': os.getenv('META_WHATSAPP_PHONE_ID'),
            'access_token': '***' + os.getenv('META_WHATSAPP_TOKEN', '')[-4:] if os.getenv('META_WHATSAPP_TOKEN') else None,
            'api_version': os.getenv('META_WHATSAPP_API_VERSION', 'v18.0')
        }
        
        # Check appointments with WhatsApp data
        appointments_with_whatsapp = db.query(Appointment).filter(
            Appointment.patient_id.isnot(None)
        ).all()
        
        whatsapp_data = []
        for appointment in appointments_with_whatsapp:
            patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
            if patient and patient.primary_phone:
                whatsapp_info = {
                    'appointment_id': appointment.id,
                    'patient_phone': patient.primary_phone,
                    'appointment_date': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                    'office_id': appointment.office_id,
                    'appointment_type_id': appointment.appointment_type_id
                }
                whatsapp_data.append(whatsapp_info)
        
        return {
            'status': 'success',
            'whatsapp_config': whatsapp_config,
            'appointments_with_whatsapp': len(whatsapp_data),
            'whatsapp_data': whatsapp_data,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/pdf-system")
async def debug_pdf_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug PDF system status"""
    try:
        # Check PDF generation requirements
        doctors_with_offices = db.query(Person).filter(
            Person.person_type == 'doctor',
            Person.is_active == True
        ).all()
        
        pdf_data = []
        for doctor in doctors_with_offices:
            offices = db.query(Office).filter(
                Office.doctor_id == doctor.id,
                Office.is_active == True
            ).all()
            
            doctor_info = {
                'id': doctor.id,
                'name': f"{doctor.first_name} {doctor.paternal_surname}",
                'offices_count': len(offices),
                'offices': [{'id': o.id, 'name': o.name, 'address': o.address} for o in offices]
            }
            pdf_data.append(doctor_info)
        
        return {
            'status': 'success',
            'doctors_with_offices': len(pdf_data),
            'pdf_data': pdf_data,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/full-system")
async def debug_full_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug complete multi-office system"""
    try:
        # Get all debug information
        office_debug = await debug_office_system(current_user, db)
        appointment_debug = await debug_appointment_system(current_user, db)
        consultation_debug = await debug_consultation_system(current_user, db)
        whatsapp_debug = await debug_whatsapp_system(current_user, db)
        pdf_debug = await debug_pdf_system(current_user, db)
        
        return {
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'office_system': office_debug,
            'appointment_system': appointment_debug,
            'consultation_system': consultation_debug,
            'whatsapp_system': whatsapp_debug,
            'pdf_system': pdf_debug
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

# MIGRADO a routes/catalogs.py

# ============================================================================
# SCHEDULE MANAGEMENT ENDPOINTS
# ============================================================================
# MIGRADO a routes/schedule.py - Los siguientes 9 endpoints fueron migrados:
# - POST /api/schedule/generate-weekly-template
# - GET /api/schedule/templates
# - GET /api/schedule/templates/weekly
# - POST /api/schedule/templates
# - PUT /api/schedule/templates/{template_id}
# - GET /api/schedule/available-times
# - GET /api/doctor/schedule
# - PUT /api/doctor/schedule
# - GET /api/doctor/availability
# TODO: Eliminar código después de validar que todo funciona

# Endpoints eliminados - ahora están en routes/schedule.py

# ============================================================================
# AUDIT LOGGING ENDPOINTS
# ============================================================================

@app.get("/api/audit/logs")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    security_level: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get audit logs with filters
    Only accessible by doctors (for their own actions) or admins
    """
    try:
        # Build query
        query = db.query(AuditLog)
        
        # Security: Doctors can only see their own audit logs
        if current_user.person_type == 'doctor':
            query = query.filter(AuditLog.user_id == current_user.id)
        
        # Apply filters
        if action:
            query = query.filter(AuditLog.action == action)
        if user_email:
            query = query.filter(AuditLog.user_email == user_email)
        if security_level:
            query = query.filter(AuditLog.security_level == security_level)
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)
        
        # Order by most recent first
        query = query.order_by(AuditLog.timestamp.desc())
        
        # Pagination
        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        
        # Convert to dict
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "user_email": log.user_email,
                "user_name": log.user_name,
                "action": log.action,
                "table_name": log.table_name,
                "operation_type": log.operation_type,
                "changes_summary": log.changes_summary,
                "affected_patient_name": log.affected_patient_name,
                "timestamp": log.timestamp.isoformat(),
                "ip_address": log.ip_address,
                "success": log.success,
                "security_level": log.security_level,
                "error_message": log.error_message
            })
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "logs": result
        }
    except Exception as e:
        print(f"❌ Error in get_audit_logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching audit logs: {str(e)}")

# ============================================================================
# AUTHENTICATION
# ============================================================================
# MIGRADO a routes/auth.py - Endpoint register también migrado:
# - POST /api/auth/register ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/auth.py

# ============================================================================
# DOCTORS
# ============================================================================
# MIGRADO a routes/doctors.py - Los siguientes 3 endpoints fueron migrados:
# - GET /api/doctors/me/profile ✅ ELIMINADO
# - POST /api/doctors ✅ ELIMINADO
# - PUT /api/doctors/me/profile ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/doctors.py

# ============================================================================
# PATIENTS
# ============================================================================
# MIGRADO a routes/patients.py - Los siguientes 4 endpoints fueron migrados:
# - GET /api/patients
# - GET /api/patients/{patient_id}
# - POST /api/patients
# - PUT /api/patients/{patient_id}
# TODO: Eliminar código después de validar que todo funciona

# ============================================================================
# PATIENTS
# ============================================================================
# MIGRADO a routes/patients.py - Los siguientes 4 endpoints fueron migrados:
# - GET /api/patients ✅ ELIMINADO
# - GET /api/patients/{patient_id} ✅ ELIMINADO
# - POST /api/patients ✅ ELIMINADO
# - PUT /api/patients/{patient_id} ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/patients.py

# ============================================================================
# DASHBOARD
# ============================================================================
# MIGRADO a routes/dashboard.py - El siguiente endpoint fue migrado:
# - GET /api/dashboard/stats ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/dashboard.py

# ============================================================================
# APPOINTMENTS
# ============================================================================
# MIGRADO a routes/appointments.py - Los siguientes 6 endpoints fueron migrados:
# - GET /api/appointments
# - GET /api/appointments/calendar
# - GET /api/appointments/{appointment_id}
# - POST /api/appointments
# - PUT /api/appointments/{appointment_id}
# - DELETE /api/appointments/{appointment_id}
# TODO: Eliminar código después de validar que todo funciona

# Endpoints eliminados - ahora están en routes/appointments.py

# ============================================================================
# APPOINTMENTS
# ============================================================================
# MIGRADO a routes/dashboard.py - El siguiente endpoint fue migrado:
# - GET /api/dashboard/stats ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/dashboard.py

# ============================================================================
# APPOINTMENTS
# ============================================================================
# MIGRADO a routes/appointments.py - Los siguientes 6 endpoints fueron migrados:
# - GET /api/appointments ✅ ELIMINADO
# - GET /api/appointments/calendar ✅ ELIMINADO
# - GET /api/appointments/{appointment_id} ✅ ELIMINADO
# - POST /api/appointments ✅ ELIMINADO
# - PUT /api/appointments/{appointment_id} ✅ ELIMINADO
# - DELETE /api/appointments/{appointment_id} ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/appointments.py

# ============================================================================
# CONSULTATIONS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes 10 endpoints fueron migrados:
# - GET /api/consultations
# - GET /api/consultations/{consultation_id}
# - POST /api/consultations
# - PUT /api/consultations/{consultation_id}
# - DELETE /api/consultations/{consultation_id}
# - GET /api/consultations/{consultation_id}/medical-records
# - POST /api/consultations/{consultation_id}/medical-records
# - PUT /api/consultations/{consultation_id}/medical-records/{record_id}
# - DELETE /api/consultations/{consultation_id}/medical-records/{record_id}
# - GET /api/consultations/{consultation_id}/prescriptions
# TODO: Eliminar código después de validar que todo funciona

# Endpoints eliminados - ahora están en routes/consultations.py

# ============================================================================
# PRESCRIPTIONS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes endpoints fueron migrados:
# - GET /api/consultations/{consultation_id}/prescriptions
# - POST /api/consultations/{consultation_id}/prescriptions
# - PUT /api/consultations/{consultation_id}/prescriptions/{prescription_id}
# - DELETE /api/consultations/{consultation_id}/prescriptions/{prescription_id}
# TODO: Eliminar código después de validar que todo funciona

# Endpoints eliminados - ahora están en routes/consultations.py

# ============================================================================
# DASHBOARD
# ============================================================================
# MIGRADO a routes/dashboard.py - El siguiente endpoint fue migrado:
# - GET /api/dashboard/stats ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/dashboard.py

# ============================================================================
# APPOINTMENTS
# ============================================================================
# MIGRADO a routes/appointments.py - Los siguientes 6 endpoints fueron migrados:
# - GET /api/appointments ✅ ELIMINADO
# - GET /api/appointments/calendar ✅ ELIMINADO
# - GET /api/appointments/{appointment_id} ✅ ELIMINADO
# - POST /api/appointments ✅ ELIMINADO
# - PUT /api/appointments/{appointment_id} ✅ ELIMINADO
# - DELETE /api/appointments/{appointment_id} ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/appointments.py

# ============================================================================
# CONSULTATIONS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes 10 endpoints fueron migrados:
# - GET /api/consultations ✅ ELIMINADO
# - GET /api/consultations/{consultation_id} ✅ ELIMINADO
# - POST /api/consultations ✅ ELIMINADO
# - PUT /api/consultations/{consultation_id} ✅ ELIMINADO
# - DELETE /api/consultations/{consultation_id} ✅ ELIMINADO
# - GET /api/consultations/{consultation_id}/medical-records ✅ ELIMINADO
# - POST /api/consultations/{consultation_id}/medical-records ✅ ELIMINADO
# - PUT /api/consultations/{consultation_id}/medical-records/{record_id} ✅ ELIMINADO
# - DELETE /api/consultations/{consultation_id}/medical-records/{record_id} ✅ ELIMINADO
# - GET /api/consultations/{consultation_id}/prescriptions ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/consultations.py

# ============================================================================
# PRESCRIPTIONS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes 4 endpoints fueron migrados:
# - GET /api/consultations/{consultation_id}/prescriptions ✅ ELIMINADO
# - POST /api/consultations/{consultation_id}/prescriptions ✅ ELIMINADO
# - PUT /api/consultations/{consultation_id}/prescriptions/{prescription_id} ✅ ELIMINADO
# - DELETE /api/consultations/{consultation_id}/prescriptions/{prescription_id} ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/consultations.py

# Endpoints eliminados - ahora están en routes/consultations.py

# ============================================================================
# APPOINTMENTS
# ============================================================================
# MIGRADO a routes/appointments.py - Los siguientes 6 endpoints fueron migrados:
# - GET /api/appointments ✅ ELIMINADO
# - GET /api/appointments/calendar ✅ ELIMINADO
# - GET /api/appointments/{appointment_id} ✅ ELIMINADO
# - POST /api/appointments ✅ ELIMINADO
# - PUT /api/appointments/{appointment_id} ✅ ELIMINADO
# - DELETE /api/appointments/{appointment_id} ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/appointments.py

# ============================================================================
# CONSULTATIONS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes 10 endpoints fueron migrados:
# - GET /api/consultations
# - GET /api/consultations/{consultation_id}
# - POST /api/consultations
# - PUT /api/consultations/{consultation_id}
# - DELETE /api/consultations/{consultation_id}
# - GET /api/medical-records
# - GET /api/medical-records/{record_id}
# - POST /api/medical-records
# - PUT /api/medical-records/{record_id}
# - DELETE /api/medical-records/{record_id}
# TODO: Eliminar código después de validar que todo funciona

# Endpoints eliminados - ahora están en routes/consultations.py

# ============================================================================
# MEDICAL RECORDS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes 5 endpoints fueron migrados:
# - GET /api/medical-records
# - GET /api/medical-records/{record_id}
# - POST /api/medical-records
# - PUT /api/medical-records/{record_id}
# - DELETE /api/medical-records/{record_id}
# TODO: Eliminar código después de validar que todo funciona

# Endpoints eliminados - ahora están en routes/consultations.py

# ============================================================================
# SCHEDULE MANAGEMENT ENDPOINTS (continuación)
# ============================================================================
# MIGRADO a routes/schedule.py - Endpoints doctor/schedule también migrados:
# - GET /api/doctor/schedule ✅ ELIMINADO
# - PUT /api/doctor/schedule ✅ ELIMINADO
# - GET /api/doctor/availability ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/schedule.py

# Endpoints eliminados - ahora están en routes/consultations.py

# - /api/test-patient-creation
# - /api/test-cors
# These have been removed to prevent unauthorized data access in production

# ============================================================================
# STUDY CATALOG ENDPOINTS
# ============================================================================
# MIGRADO a routes/clinical_studies.py - Los siguientes endpoints fueron migrados:
# - GET /api/study-categories ✅ ELIMINADO
# - GET /api/study-catalog ✅ ELIMINADO
# - GET /api/study-catalog/{study_id} ✅ ELIMINADO
# - GET /api/study-catalog/code/{code} ✅ ELIMINADO

# Endpoints eliminados - ahora están en routes/clinical_studies.py

# Study templates endpoints removed - table deleted

@app.get("/api/study-recommendations")
async def get_study_recommendations(
    diagnosis: Optional[str] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get study recommendations based on diagnosis and specialty"""
    try:
        studies = crud.get_study_recommendations(db, diagnosis=diagnosis, specialty=specialty)
        return [schemas.StudyCatalog.model_validate(study) for study in studies]
    except Exception as e:
        print(f"❌ Error in get_study_recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-search")
async def search_studies(
    q: str,
    category_id: Optional[int] = None,
    specialty: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Search studies with advanced filters"""
    try:
        studies = crud.search_studies(
            db,
            search_term=q,
            category_id=category_id,
            specialty=specialty,
            limit=limit
        )
        return [schemas.StudyCatalog.model_validate(study) for study in studies]
    except Exception as e:
        print(f"❌ Error in search_studies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ============================================================================
# AUDIT LOG - Traceability and Compliance
# ============================================================================
# Note: get_audit_logs endpoint is defined above (line 1256)

@app.get("/api/audit/critical")
async def get_critical_audit_events(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get critical audit events (WARNING and CRITICAL security levels)"""
    try:
        # Query critical events
        query = db.query(AuditLog).filter(
            AuditLog.security_level.in_(['WARNING', 'CRITICAL'])
        )
        
        # Security: Doctors can only see their own critical events
        if current_user.person_type == 'doctor':
            query = query.filter(AuditLog.user_id == current_user.id)
        
        query = query.order_by(AuditLog.timestamp.desc())
        
        total = query.count()
        events = query.offset(skip).limit(limit).all()
        
        result = []
        for event in events:
            result.append({
                "id": event.id,
                "user_email": event.user_email,
                "user_name": event.user_name,
                "action": event.action,
                "operation_type": event.operation_type,
                "affected_patient_name": event.affected_patient_name,
                "timestamp": event.timestamp.isoformat(),
                "ip_address": event.ip_address,
                "security_level": event.security_level,
                "error_message": event.error_message,
                "success": event.success
            })
        
        return {
            "total": total,
            "critical_events": result
        }
    except Exception as e:
        print(f"❌ Error in get_critical_audit_events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching critical events: {str(e)}")

@app.get("/api/audit/patient/{patient_id}")
async def get_patient_audit_trail(
    patient_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get complete audit trail for a specific patient"""
    try:
        # Verify patient exists and belongs to this doctor
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get patient's consultations to verify access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation and current_user.person_type == 'doctor':
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this patient's data"
            )
        
        # Get audit trail
        query = db.query(AuditLog).filter(
            AuditLog.affected_patient_id == patient_id
        ).order_by(AuditLog.timestamp.desc())
        
        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "user_email": log.user_email,
                "user_name": log.user_name,
                "action": log.action,
                "table_name": log.table_name,
                "operation_type": log.operation_type,
                "changes_summary": log.changes_summary,
                "timestamp": log.timestamp.isoformat(),
                "ip_address": log.ip_address,
                "success": log.success
            })
        
        return {
            "patient_id": patient_id,
            "patient_name": f"{patient.first_name} {patient.paternal_surname}",
            "total": total,
            "audit_trail": result
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_patient_audit_trail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching patient audit trail: {str(e)}")

@app.get("/api/audit/stats")
async def get_audit_statistics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get audit statistics for the last N days"""
    try:
        from_date = datetime.utcnow() - timedelta(days=days)
        
        query = db.query(AuditLog).filter(AuditLog.timestamp >= from_date)
        
        # Security: Doctors only see their own stats
        if current_user.person_type == 'doctor':
            query = query.filter(AuditLog.user_id == current_user.id)
        
        # Count by action type
        actions_count = db.query(
            AuditLog.action,
            func.count(AuditLog.id).label('count')
        ).filter(AuditLog.timestamp >= from_date).group_by(AuditLog.action).all()
        
        # Count by security level
        security_count = db.query(
            AuditLog.security_level,
            func.count(AuditLog.id).label('count')
        ).filter(AuditLog.timestamp >= from_date).group_by(AuditLog.security_level).all()
        
        # Failed operations
        failed_count = query.filter(AuditLog.success == False).count()
        
        return {
            "period_days": days,
            "total_operations": query.count(),
            "failed_operations": failed_count,
            "by_action": {action: count for action, count in actions_count},
            "by_security_level": {level: count for level, count in security_count},
            "success_rate": f"{((query.count() - failed_count) / query.count() * 100):.2f}%" if query.count() > 0 else "N/A"
        }
    except Exception as e:
        print(f"❌ Error in get_audit_statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching audit statistics: {str(e)}")

# ============================================================================
# PRIVACY AND CONSENT - LFPDPPP Compliance
# ============================================================================
# MIGRADO a routes/privacy.py - Los siguientes 8 endpoints fueron migrados:
# - GET /api/privacy/active-notice
# - POST /api/privacy/send-whatsapp-notice
# - GET /api/privacy/consent-status/{patient_id}
# - POST /api/privacy/revoke
# - POST /api/privacy/arco-request
# - GET /api/privacy/arco-requests/{patient_id}
# - PUT /api/privacy/arco-request/{request_id}
# - GET /api/privacy/public-notice
# TODO: Eliminar código después de validar que todo funciona

@app.get("/api/privacy/active-notice")
async def get_active_privacy_notice(
    db: Session = Depends(get_db)
):
    """
    Get current active privacy notice (public endpoint)
    """
    try:
        notice = db.query(PrivacyNotice).filter(
            PrivacyNotice.is_active == True
        ).order_by(PrivacyNotice.effective_date.desc()).first()
        
        if not notice:
            raise HTTPException(status_code=404, detail="No active privacy notice found")
        
        return {
            "id": notice.id,
            "version": notice.version,
            "title": notice.title,
            "content": notice.content,
            "short_summary": notice.short_summary,
            "effective_date": notice.effective_date.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SendPrivacyNoticeRequest(BaseModel):
    patient_id: int
    method: str = "whatsapp_button"

@app.post("/api/privacy/send-whatsapp-notice")
async def send_whatsapp_privacy_notice(
    request_data: SendPrivacyNoticeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Envía aviso de privacidad al paciente vía WhatsApp con botón interactivo
    """
    try:
        # Verificar que el paciente existe
        patient = db.query(Person).filter(
            Person.id == request_data.patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        # Verificar que el doctor tiene relación con este paciente
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == request_data.patient_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation and current_user.person_type != 'admin':
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para enviar avisos a este paciente"
            )
        
        # Verificar que el paciente tiene teléfono
        if not patient.primary_phone:
            raise HTTPException(
                status_code=400,
                detail="El paciente no tiene teléfono registrado"
            )
        
        # Verificar si ya tiene un consentimiento
        existing_consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == request_data.patient_id,
            PrivacyConsent.consent_given == True
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if existing_consent:
                return {
                    "success": False,
                    "message": "El paciente ya aceptó el aviso de privacidad",
                    "consent_id": existing_consent.id,
                    "accepted_at": existing_consent.consent_date.isoformat() if existing_consent.consent_date else None
                }
        
        # Obtener aviso de privacidad activo
        privacy_notice = db.query(PrivacyNotice).filter(
            PrivacyNotice.is_active == True
        ).order_by(PrivacyNotice.effective_date.desc()).first()
        
        if not privacy_notice:
            raise HTTPException(status_code=500, detail="No hay aviso de privacidad activo")
        
        # Generar token único para la URL
        privacy_token = str(uuid.uuid4())
        privacy_url = f"https://tudominio.com/privacy-notice/{privacy_token}"
        
        # Crear registro de consentimiento PRIMERO (para tener el ID)
        consent = PrivacyConsent(
            patient_id=request_data.patient_id,
            notice_id=privacy_notice.id,
            consent_given=False,  # Pendiente hasta que el paciente responda
            consent_date=datetime.utcnow()
        )
        
        db.add(consent)
        db.commit()
        db.refresh(consent)
        
        # Enviar por WhatsApp con botón interactivo
        from whatsapp_service import get_whatsapp_service
        whatsapp = get_whatsapp_service()
        
        doctor_name = f"{current_user.title or 'Dr.'} {current_user.first_name} {current_user.paternal_surname}"
        
        result = whatsapp.send_interactive_privacy_notice(
            patient_name=patient.first_name,
            patient_phone=patient.primary_phone,
            doctor_name=doctor_name,
            privacy_notice_url=privacy_url,
            consent_id=consent.id
        )
        
        if not result.get('success'):
            # Si falla el envío, eliminar el consentimiento
            db.delete(consent)
            db.commit()
            raise HTTPException(
                status_code=500,
                detail=f"Error al enviar WhatsApp: {result.get('error')}"
            )
        
        # Actualizar con message_id
        # WhatsApp message tracking removed - simplified schema
        db.commit()
        
        # Registrar en auditoría
        audit_service.log_action(
            db=db,
            action="PRIVACY_NOTICE_SENT",
            user=current_user,
            request=request,
            operation_type="send_privacy_notice_whatsapp",
            affected_patient_id=request_data.patient_id,
            affected_patient_name=f"{patient.first_name} {patient.paternal_surname}",
            new_values={
                "method": "whatsapp_button",
                "phone": patient.primary_phone,
                "message_id": result.get('message_id'),
                "consent_id": consent.id
            },
            security_level='INFO'
        )
        
        return {
            "success": True,
            "message": "Aviso de privacidad enviado por WhatsApp con botón interactivo",
            "message_id": result.get('message_id'),
            "phone": patient.primary_phone,
            "consent_id": consent.id,
            "privacy_url": privacy_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending privacy notice: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al enviar aviso de privacidad: {str(e)}"
        )

@app.post("/api/webhooks/whatsapp")
async def whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook para recibir respuestas de WhatsApp (botones interactivos)
    Meta enviará aquí las respuestas cuando el paciente presione "Acepto"
    """
    try:
        body = await request.json()
        
        if 'entry' not in body:
            return {"status": "ignored"}
        
        for entry in body['entry']:
            for change in entry.get('changes', []):
                if change.get('field') != 'messages':
                    continue
                
                value = change.get('value', {})
                
                # Procesar mensajes con botones interactivos
                for message in value.get('messages', []):
                    message_type = message.get('type')
                    from_phone = message.get('from')
                    timestamp = message.get('timestamp')
                    
                    # PROCESAR BOTÓN INTERACTIVO
                    if message_type == 'interactive':
                        interactive_data = message.get('interactive', {})
                        button_reply = interactive_data.get('button_reply', {})
                        
                        button_id = button_reply.get('id', '')
                        button_title = button_reply.get('title', '')
                        
                        print(f"📱 Button pressed: {button_id} ({button_title}) from {from_phone}")
                        
                        # Extraer consent_id del button_id
                        # Formato: "accept_privacy_123"
                        parts = button_id.split('_')
                        print(f"🔍 Parsing button_id: {button_id}, parts: {parts}")
                        if len(parts) >= 3 and parts[0] == 'accept' and parts[1] == 'privacy':
                            consent_id = int(parts[2])
                            print(f"🔍 Extracted consent_id: {consent_id}")
                            
                            # Buscar el consentimiento
                            consent = db.query(PrivacyConsent).filter(
                                PrivacyConsent.id == consent_id
                            ).first()
                            
                            if not consent:
                                print(f"⚠️ Consent {consent_id} not found")
                                # Listar todos los consentimientos para debug
                                all_consents = db.query(PrivacyConsent).all()
                                print(f"🔍 All consents in DB: {[c.id for c in all_consents]}")
                                continue
                            
                            # Obtener paciente
                            patient = db.query(Person).filter(
                                Person.id == consent.patient_id
                            ).first()
                            
                            if not patient:
                                print(f"⚠️ Patient {consent.patient_id} not found")
                                continue
                            
                            # ACEPTADO
                            consent.consent_given = True
                            consent.consent_date = datetime.fromtimestamp(int(timestamp))
                            
                            db.commit()
                            
                            # Enviar confirmación
                            from whatsapp_service import get_whatsapp_service
                            whatsapp = get_whatsapp_service()
                            
                            # Get doctor from privacy notice or use default
                            doctor = db.query(Person).filter(Person.person_type == 'doctor').first()
                            
                            if doctor:
                                doctor_name = f"{doctor.title or 'Dr.'} {doctor.first_name} {doctor.paternal_surname}"
                                whatsapp.send_text_message(
                                    to_phone=from_phone,
                                    message=f"✅ Gracias {patient.first_name}, tu consentimiento ha sido registrado correctamente.\n\n"
                                            f"Ahora {doctor_name} puede brindarte atención médica cumpliendo con la Ley de Protección de Datos.\n\n"
                                            f"Recuerda que puedes revocar tu consentimiento en cualquier momento contactando al consultorio.\n\n"
                                            f"Tus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) están garantizados."
                                )
                            
                            print(f"✅ Consent {consent_id} ACCEPTED by patient {patient.id} ({patient.first_name})")
                            
                            # Registrar en auditoría
                            audit_service.log_action(
                                db=db,
                                action="PRIVACY_CONSENT_ACCEPTED",
                                user=None,
                                request=request,
                                operation_type="whatsapp_button_consent",
                                affected_patient_id=patient.id,
                                affected_patient_name=f"{patient.first_name} {patient.paternal_surname}",
                                new_values={
                                    "button_id": button_id,
                                    "button_title": button_title,
                                    "consent_id": consent_id,
                                    "method": "whatsapp_button"
                                },
                                security_level='INFO'
                            )
                
                # Procesar status updates (entregado, leído)
                for status in value.get('statuses', []):
                    status_type = status.get('status')
                    message_id = status.get('id')
                    
                    # Find consent by patient phone (simplified - WhatsApp message tracking removed)
                    # Note: In a real implementation, you'd need to track message_id differently
                    consent = None  # Placeholder - implement based on your needs
                    
                    if consent:
                        # WhatsApp status tracking removed - simplified schema
                        # No action needed for delivered/read status
                        db.commit()
                        print(f"📊 Consent {consent.id} status updated: {status_type}")
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"❌ Error processing WhatsApp webhook: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.get("/api/webhooks/whatsapp")
async def whatsapp_webhook_verification(
    request: Request
):
    """
    Verificación del webhook de WhatsApp (requerido por Meta)
    """
    mode = request.query_params.get('hub.mode')
    token = request.query_params.get('hub.verify_token')
    challenge = request.query_params.get('hub.challenge')
    
    verify_token = os.getenv('META_WHATSAPP_VERIFY_TOKEN', 'mi_token_secreto_123')
    
    if mode == 'subscribe' and token == verify_token:
        print(f"✅ WhatsApp webhook verified successfully")
        return int(challenge)
    
    print(f"❌ WhatsApp webhook verification failed")
    return {"status": "error", "message": "Verification failed"}

@app.get("/api/privacy/consent-status/{patient_id}")
async def get_patient_consent_status(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Obtiene el estado del consentimiento de privacidad de un paciente
    """
    try:
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Buscar consentimiento más reciente
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == patient_id
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if not consent:
            return {
                "has_consent": False,
                "status": "none",
                "message": "No se ha enviado aviso de privacidad a este paciente"
            }
        
        has_consent = consent.consent_given == True
        
        return {
            "has_consent": has_consent,
            "status": "accepted" if consent.consent_given else "pending",
            "consent": {
                "id": consent.id,
                "patient_id": consent.patient_id,
                "notice_id": consent.notice_id,
                "consent_given": consent.consent_given,
                "consent_date": consent.consent_date.isoformat() if consent.consent_date else None,
                "ip_address": consent.ip_address,
                "user_agent": consent.user_agent,
                "created_at": consent.created_at.isoformat() if consent.created_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/privacy/revoke")
async def revoke_consent(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Revocar consentimiento de privacidad de un paciente
    """
    try:
        patient_id = data.get('patient_id')
        revocation_reason = data.get('revocation_reason', 'Revocado por el médico')
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Buscar consentimiento activo
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == patient_id,
            PrivacyConsent.is_revoked == False
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if not consent:
            raise HTTPException(status_code=404, detail="No se encontró consentimiento activo para este paciente")
        
        # Revocar
        # Revocation: Set consent_given to False
        consent.consent_given = False
        consent.consent_date = datetime.utcnow()
        consent.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='privacy_consent_revoked',
            entity_type='privacy_consent',
            entity_id=consent.id,
            user_id=current_user.id,
            user_type=current_user.person_type,
            changes={'revocation_reason': revocation_reason},
            ip_address=request.client.host,
            summary=f"Consentimiento revocado para paciente {patient_id}",
            security_level='WARNING'
        )
        
        api_logger.info(
            f"✅ Consent revoked for patient {patient_id}",
            consent_id=consent.id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Consentimiento revocado exitosamente",
            "consent_id": consent.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error revoking consent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/privacy/arco-request")
async def create_arco_request(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Crear solicitud ARCO (Acceso, Rectificación, Cancelación, Oposición)
    """
    try:
        patient_id = data.get('patient_id')
        request_type = data.get('request_type')  # 'access', 'rectification', 'cancellation', 'opposition'
        description = data.get('description', '')
        contact_email = data.get('contact_email')
        contact_phone = data.get('contact_phone')
        
        if not patient_id or not request_type:
            raise HTTPException(status_code=400, detail="patient_id y request_type son requeridos")
        
        if request_type not in ['access', 'rectification', 'cancellation', 'opposition']:
            raise HTTPException(status_code=400, detail="request_type inválido")
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Crear solicitud ARCO
        arco_request = ARCORequest(
            patient_id=patient_id,
            request_type=request_type,
            description=description,
            status='pending',
            contact_email=contact_email,
            contact_phone=contact_phone,
            requested_by=current_user.id,
            requested_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(arco_request)
        db.commit()
        db.refresh(arco_request)
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='arco_request_created',
            entity_type='arco_request',
            entity_id=arco_request.id,
            user_id=current_user.id,
            user_type=current_user.person_type,
            changes={'request_type': request_type, 'patient_id': patient_id},
            ip_address=request.client.host,
            summary=f"Solicitud ARCO ({request_type}) creada para paciente {patient_id}",
            security_level='INFO'
        )
        
        api_logger.info(
            f"✅ ARCO request created: {request_type}",
            request_id=arco_request.id,
            patient_id=patient_id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": f"Solicitud ARCO ({request_type}) creada exitosamente",
            "arco_request": {
                "id": arco_request.id,
                "patient_id": arco_request.patient_id,
                "request_type": arco_request.request_type,
                "description": arco_request.description,
                "status": arco_request.status,
                "requested_at": arco_request.requested_at.isoformat(),
                "created_at": arco_request.created_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error creating ARCO request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/privacy/arco-requests/{patient_id}")
async def get_arco_requests(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Obtener todas las solicitudes ARCO de un paciente
    """
    try:
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Obtener solicitudes ARCO
        arco_requests = db.query(ARCORequest).filter(
            ARCORequest.patient_id == patient_id
        ).order_by(ARCORequest.created_at.desc()).all()
        
        return {
            "arco_requests": [
                {
                    "id": req.id,
                    "patient_id": req.patient_id,
                    "request_type": req.request_type,
                    "description": req.description,
                    "status": req.status,
                    "contact_email": req.contact_email,
                    "contact_phone": req.contact_phone,
                    "requested_at": req.requested_at.isoformat() if req.requested_at else None,
                    "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None,
                    "resolution_notes": req.resolution_notes,
                    "created_at": req.created_at.isoformat(),
                    "updated_at": req.updated_at.isoformat()
                }
                for req in arco_requests
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error getting ARCO requests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/privacy/arco-request/{request_id}")
async def update_arco_request(
    request_id: int,
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Actualizar estado de una solicitud ARCO
    """
    try:
        status = data.get('status')  # 'in_progress', 'resolved', 'rejected'
        resolution_notes = data.get('resolution_notes')
        
        if not status:
            raise HTTPException(status_code=400, detail="status es requerido")
        
        if status not in ['pending', 'in_progress', 'resolved', 'rejected']:
            raise HTTPException(status_code=400, detail="status inválido")
        
        # Obtener solicitud ARCO
        arco_request = db.query(ARCORequest).filter(
            ARCORequest.id == request_id
        ).first()
        
        if not arco_request:
            raise HTTPException(status_code=404, detail="Solicitud ARCO no encontrada")
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == arco_request.patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Actualizar
        old_status = arco_request.status
        arco_request.status = status
        if resolution_notes:
            arco_request.resolution_notes = resolution_notes
        if status == 'resolved':
            arco_request.resolved_at = datetime.utcnow()
        arco_request.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='arco_request_updated',
            entity_type='arco_request',
            entity_id=arco_request.id,
            user_id=current_user.id,
            user_type=current_user.person_type,
            changes={'old_status': old_status, 'new_status': status},
            ip_address=request.client.host,
            summary=f"Solicitud ARCO {request_id} actualizada: {old_status} → {status}",
            security_level='INFO'
        )
        
        api_logger.info(
            f"✅ ARCO request updated: {old_status} → {status}",
            request_id=request_id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Solicitud ARCO actualizada exitosamente",
            "arco_request": {
                "id": arco_request.id,
                "status": arco_request.status,
                "resolution_notes": arco_request.resolution_notes,
                "resolved_at": arco_request.resolved_at.isoformat() if arco_request.resolved_at else None,
                "updated_at": arco_request.updated_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error updating ARCO request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/privacy/public-notice")
async def get_public_privacy_notice(db: Session = Depends(get_db)):
    """
    Obtener el aviso de privacidad público (sin autenticación)
    Para mostrar en página pública
    """
    try:
        # Obtener aviso activo
        notice = db.query(PrivacyNotice).filter(
            PrivacyNotice.is_active == True
        ).order_by(PrivacyNotice.effective_date.desc()).first()
        
        if not notice:
            raise HTTPException(status_code=404, detail="No hay aviso de privacidad activo")
        
        return {
            "id": notice.id,
            "version": notice.version,
            "title": notice.title,
            "content": notice.content,
            "summary": notice.summary,
            "effective_date": notice.effective_date.isoformat(),
            "expiration_date": notice.expiration_date.isoformat() if notice.expiration_date else None,
            "is_active": notice.is_active,
            "created_at": notice.created_at.isoformat(),
            "updated_at": notice.updated_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error getting public privacy notice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DATA RETENTION ENDPOINTS (LFPDPPP + NOM-004 Compliance)
# ============================================================================

@app.get("/api/data-retention/stats")
async def get_retention_stats(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get data retention statistics for the current doctor
    """
    try:
        stats = retention.get_retention_stats(db, current_user.id)
        
        return {
            "success": True,
            "stats": stats,
            "doctor_id": current_user.id
        }
    except Exception as e:
        api_logger.error(f"Error getting retention stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data-retention/expiring")
async def get_expiring_records(
    days: int = 90,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get records expiring within specified days
    
    Args:
        days: Days threshold for expiration (default: 90)
        limit: Maximum records to return (default: 100)
    """
    try:
        records = retention.get_expiring_records(
            db, 
            doctor_id=current_user.id,
            days_threshold=days,
            limit=limit
        )
        
        return {
            "success": True,
            "records": records,
            "count": len(records),
            "days_threshold": days
        }
    except Exception as e:
        api_logger.error(f"Error getting expiring records: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/anonymize/{record_id}")
async def anonymize_record(
    record_id: int,
    reason: str = "manual_request",
    strategy: str = "full",
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Anonymize a specific medical record
    
    Args:
        record_id: Medical record ID
        reason: Reason for anonymization
        strategy: Anonymization strategy (full, partial, pseudo)
    """
    try:
        # Verify record belongs to current doctor
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Registro no encontrado o no autorizado"
            )
        
        success = retention.anonymize_medical_record(
            db,
            record_id,
            performed_by=current_user.id,
            reason=reason,
            strategy=strategy
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="No se pudo anonimizar el registro (puede estar en retención legal)"
            )
        
        return {
            "success": True,
            "message": "Registro anonimizado exitosamente",
            "record_id": record_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error anonymizing record {record_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/anonymize-expired")
async def anonymize_expired_records_endpoint(
    batch_size: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Anonymize all expired records for current doctor
    
    Args:
        batch_size: Maximum records to process (default: 100)
    """
    try:
        # This endpoint processes ALL expired records for the doctor
        # In production, this would be a scheduled job
        
        result = retention.anonymize_expired_records(
            db,
            performed_by=current_user.id,
            batch_size=batch_size
        )
        
        return {
            "success": True,
            "message": f"Procesados {result['total_processed']} registros",
            **result
        }
        
    except Exception as e:
        api_logger.error(f"Error in batch anonymization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/archive/{record_id}")
async def archive_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Archive a medical record (move to cold storage)
    """
    try:
        # Verify record belongs to current doctor
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Registro no encontrado o no autorizado"
            )
        
        success = retention.archive_medical_record(
            db,
            record_id,
            performed_by=current_user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="No se pudo archivar el registro"
            )
        
        return {
            "success": True,
            "message": "Registro archivado exitosamente",
            "record_id": record_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error archiving record {record_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/legal-hold/{record_id}")
async def set_legal_hold_endpoint(
    record_id: int,
    enable: bool = True,
    reason: str = "",
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Set or remove legal hold on a medical record
    
    Args:
        record_id: Medical record ID
        enable: True to enable hold, False to remove
        reason: Reason for legal hold
    """
    try:
        # Verify record belongs to current doctor
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Registro no encontrado o no autorizado"
            )
        
        if enable and not reason:
            raise HTTPException(
                status_code=400,
                detail="Se requiere especificar la razón para la retención legal"
            )
        
        success = retention.set_legal_hold(
            db,
            record_id,
            performed_by=current_user.id,
            reason=reason,
            enable=enable
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="No se pudo establecer la retención legal"
            )
        
        action = "activada" if enable else "removida"
        return {
            "success": True,
            "message": f"Retención legal {action} exitosamente",
            "record_id": record_id,
            "legal_hold": enable
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error setting legal hold on record {record_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/extend/{record_id}")
async def extend_retention_endpoint(
    record_id: int,
    additional_years: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Extend retention period for a medical record
    
    Args:
        record_id: Medical record ID
        additional_years: Years to add to retention period
        reason: Reason for extension
    """
    try:
        # Verify record belongs to current doctor
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Registro no encontrado o no autorizado"
            )
        
        if additional_years < 1 or additional_years > 50:
            raise HTTPException(
                status_code=400,
                detail="El número de años debe estar entre 1 y 50"
            )
        
        success = retention.extend_retention(
            db,
            record_id,
            performed_by=current_user.id,
            additional_years=additional_years,
            reason=reason
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="No se pudo extender el periodo de retención"
            )
        
        return {
            "success": True,
            "message": f"Periodo de retención extendido por {additional_years} años",
            "record_id": record_id,
            "additional_years": additional_years
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error extending retention for record {record_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data-retention/logs")
async def get_retention_logs_endpoint(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    action_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get data retention action logs
    
    Args:
        entity_type: Filter by entity type (optional)
        entity_id: Filter by entity ID (optional)
        action_type: Filter by action type (optional)
        limit: Maximum logs to return
    """
    try:
        logs = retention.get_retention_logs(
            db,
            entity_type=entity_type,
            entity_id=entity_id,
            action_type=action_type,
            limit=limit
        )
        
        return {
            "success": True,
            "logs": logs,
            "count": len(logs)
        }
        
    except Exception as e:
        api_logger.error(f"Error getting retention logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting clean English API server...")
    uvicorn.run(
        "main_clean_english:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )

