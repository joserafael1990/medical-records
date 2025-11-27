#!/usr/bin/env python3
"""
Clean English API for Historias Clínicas
All endpoints standardized in English
No legacy code - completely fresh implementation
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Request, Body
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
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
import asyncio
import time
from collections import defaultdict, deque
from pathlib import Path
from starlette.responses import StreamingResponse
import crud
import schemas
import auth
from database import get_db, Person, Specialty, Country, State, EmergencyRelationship, Appointment, AppointmentReminder, MedicalRecord, ClinicalStudy, VitalSign, ConsultationVitalSign, Medication, ConsultationPrescription, AuditLog, PrivacyNotice, PrivacyConsent, ARCORequest, Office, AppointmentType, DocumentType, Document, PersonDocument, utc_now
from appointment_service import AppointmentService
from audit_service import audit_service
# import data_retention_service as retention  # Commented: endpoints disabled for MVP
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
from config import settings
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

try:
    from starlette.middleware.security import SecurityMiddleware
    SECURITY_MIDDLEWARE_AVAILABLE = True
except ImportError:
    # Fallback for newer versions of starlette
    try:
        from starlette.middleware import SecurityMiddleware
        SECURITY_MIDDLEWARE_AVAILABLE = True
    except ImportError:
        # If SecurityMiddleware is not available, create a dummy class
        SECURITY_MIDDLEWARE_AVAILABLE = False
        class SecurityMiddleware(BaseHTTPMiddleware):
            def __init__(self, app, *args, **kwargs):
                super().__init__(app)

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

# ============================================================================
# SECURITY & RATE LIMIT MIDDLEWARE
# ============================================================================


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple in-memory rate limiter per client IP."""

    def __init__(self, app, max_requests: int, window_seconds: int):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def dispatch(self, request, call_next):
        if self.max_requests <= 0 or self.window_seconds <= 0:
            return await call_next(request)

        # Skip rate limiting for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        client_ip = request.client.host if request.client else "anonymous"
        now = time.monotonic()

        async with self._lock:
            bucket = self._hits[client_ip]
            while bucket and now - bucket[0] > self.window_seconds:
                bucket.popleft()

            if len(bucket) >= self.max_requests:
                retry_after = max(1, int(self.window_seconds - (now - bucket[0])))
                # Get CORS origins for headers
                allowed_origins = _get_cors_origins()
                origin = request.headers.get("origin")
                
                # Build headers with CORS support
                headers = {
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Window": str(self.window_seconds)
                }
                
                # Add CORS headers if origin is allowed
                if origin and (origin in allowed_origins or "*" in allowed_origins):
                    headers["Access-Control-Allow-Origin"] = origin
                    headers["Access-Control-Allow-Credentials"] = "true"
                    headers["Access-Control-Allow-Methods"] = "*"
                    headers["Access-Control-Allow-Headers"] = "*"
                elif "*" in allowed_origins:
                    headers["Access-Control-Allow-Origin"] = "*"
                
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                    headers=headers
                )

            bucket.append(now)
            remaining = max(self.max_requests - len(bucket), 0)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(self.window_seconds)
        return response

def encrypt_sensitive_data(data: dict, data_type: str = "patient") -> dict:
    """Encrypt sensitive fields in data based on type"""
    if not data:
        return data
    
    # DEVELOPMENT MODE: Skip encryption - return data as-is
    api_logger.debug(f"🔐 DEVELOPMENT MODE: Skipping encryption for {data_type}")
    return data

def decrypt_sensitive_data(data: dict, data_type: str = "patient") -> dict:
    """Decrypt sensitive fields in data based on type"""
    if not data:
        return data
    
    # DEVELOPMENT MODE: Skip decryption - return data as-is
    api_logger.debug(f"🔓 DEVELOPMENT MODE: Skipping decryption for {data_type}")
    return data

def sign_medical_document(document_data: dict, doctor_id: int, document_type: str = "consultation") -> dict:
    """Sign medical document with digital signature"""
    try:
        api_logger.info(
            f"🔏 Signing {document_type} document for doctor {doctor_id}",
            extra={"doctor_id": doctor_id, "document_type": document_type}
        )
        
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
        
        api_logger.info(
            "✅ Document signed successfully",
            extra={
                "doctor_id": doctor_id,
                "document_type": document_type,
                "signature_id": signature_result["signatures"][0]["signature_id"]
            }
        )
        return signature_result
        
    except Exception as e:
        api_logger.error(
            f"⚠️ Failed to sign document: {str(e)}",
            extra={"doctor_id": doctor_id, "document_type": document_type},
            exc_info=True
        )
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

# Sentry initialization (backend)
# Solo se activa en producción si SENTRY_DSN_BACKEND está definido
sentry_dsn = os.getenv("SENTRY_DSN_BACKEND")
app_env = os.getenv("APP_ENV", "development").lower()
is_production = app_env == "production"

if sentry_dsn and is_production:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[FastApiIntegration()],
        environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
        traces_sample_rate=0.1,
        enable_tracing=True,
        send_default_pii=False,
    )
    print("✅ Sentry inicializado para producción")
elif sentry_dsn and not is_production:
    print("ℹ️ Sentry DSN configurado pero deshabilitado (solo se activa en producción)")
else:
    print("ℹ️ Sentry no configurado (SENTRY_DSN_BACKEND no definido)")

# ============================================================================
# BACKGROUND SCHEDULER: Auto WhatsApp Appointment Reminders
# ============================================================================
from services.scheduler import start_auto_reminder_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    start_auto_reminder_scheduler(app)
    yield
    # Shutdown (if needed in the future)
    pass

app = FastAPI(
    title="Medical Records API",
    description="Clean English API for Medical Records System",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_FILES_DIR = BASE_DIR / "static"
UPLOADS_DIR = BASE_DIR / "uploads"

def _get_cors_origins():
    configured = [origin for origin in settings.CORS_ORIGINS or [] if origin not in {"*", "null"}]
    if not configured:
        # Sensible default for local development
        return ["http://localhost:3000"]
    return configured

# Middleware to add CORS headers to static file responses
# This must be added BEFORE mounting static files
class StaticFilesCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Add CORS headers to static file responses
        if request.url.path.startswith(("/static/", "/uploads/")):
            origin = request.headers.get("origin")
            allowed_origins = _get_cors_origins()
            
            if origin and (origin in allowed_origins or "*" in allowed_origins):
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "*"
            elif not origin and "*" in allowed_origins:
                # Allow requests without origin header (e.g., from fetch in PDF generation)
                response.headers["Access-Control-Allow-Origin"] = "*"
        
        return response

# Add static files CORS middleware FIRST (will execute last due to reverse order)
app.add_middleware(StaticFilesCORSMiddleware)

app.mount(
    "/static",
    StaticFiles(directory=str(STATIC_FILES_DIR), check_dir=False),
    name="static"
)
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOADS_DIR), check_dir=False),
    name="uploads"
)

# ============================================================================
# SERVER-SENT EVENTS (SSE) - Real-time updates for frontend
# ============================================================================
# Global event queue for SSE
# SSE DISABLED FOR PRODUCTION - Using polling-based updates instead
# appointment_events_queue: asyncio.Queue = asyncio.Queue()

async def emit_appointment_event(event_type: str, data: dict):
    """Emit an appointment event to all connected SSE clients - DISABLED FOR PRODUCTION"""
    # SSE disabled - no-op function
    return

@app.get("/api/events/appointments")
async def stream_appointment_events(
    request: Request,
    token: Optional[str] = Query(None, description="JWT token (alternative to Authorization header)"),
    db: Session = Depends(get_db)
):
    """
    Server-Sent Events endpoint - DISABLED FOR PRODUCTION
    Returns 501 Not Implemented as SSE is disabled in production mode
    """
    raise HTTPException(status_code=501, detail="SSE endpoint disabled in production mode. Use polling-based updates instead.")

if settings.SECURITY_HEADERS_ENABLED and SECURITY_MIDDLEWARE_AVAILABLE:
    app.add_middleware(
        SecurityMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
        ssl_redirect=settings.is_production,
        sts_seconds=63072000,
        sts_include_subdomains=True,
        sts_preload=True,
        content_security_policy=settings.CONTENT_SECURITY_POLICY,
        referrer_policy="strict-origin-when-cross-origin",
        permissions_policy="camera=(), microphone=(), geolocation=()"
    )

# CORS - locked down to explicit origins to prevent credential leakage
app.add_middleware(
    CORSMiddleware,
    allow_origins=_get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add enhanced error handling middleware
app.add_middleware(ErrorHandlingMiddleware, debug=True)

if settings.RATE_LIMIT_ENABLED and settings.RATE_LIMIT_MAX_REQUESTS > 0:
    app.add_middleware(
        RateLimitMiddleware,
        max_requests=settings.RATE_LIMIT_MAX_REQUESTS,
        window_seconds=settings.RATE_LIMIT_WINDOW_SECONDS
    )

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

# Include license management routes
from routes.licenses import router as licenses_router
app.include_router(licenses_router)

# Include avatar management routes
from routes.avatars import router as avatars_router
app.include_router(avatars_router)

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

# ============================================================================
# DEBUG/DIAGNOSTICS
# ============================================================================
# Disabled for security - endpoint without authentication
# @app.get("/debug-sentry")
# async def debug_sentry():
#     # Endpoint de prueba para verificar Sentry en backend
#     # Solo funciona si SENTRY_DSN_BACKEND está configurado
#     sentry_dsn = os.getenv("SENTRY_DSN_BACKEND")
#     if not sentry_dsn:
#         return {
#             "message": "Sentry no está configurado (SENTRY_DSN_BACKEND no definido)",
#             "sentry_enabled": False
#         }
#     raise RuntimeError("Sentry backend test")

# Include patient management routes
from routes.patients import router as patients_router
app.include_router(patients_router)

# Include appointment management routes
from routes.appointments import router as appointments_router

# IMPORTANT: Define specific routes BEFORE including the router with dynamic routes
# This ensures FastAPI matches /api/appointments/available-times before /api/appointments/{appointment_id}
# Import get_current_user here to ensure it's available for the route definition
from dependencies import get_current_user

@app.get("/api/appointments/available-times")
async def get_available_times_for_booking_endpoint(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get available appointment times for booking on a specific date - Defined in main to avoid route conflicts"""
    from routes.appointments import get_available_times_for_booking as get_available_times_impl
    return await get_available_times_impl(date, db, current_user)

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

# Include analytics routes
from routes.analytics import router as analytics_router
app.include_router(analytics_router)

# Include admin routes (encryption status, catalog status, system status)
from routes.admin import router as admin_router
app.include_router(admin_router)

# Include compliance routes (compliance reports)
from routes.compliance import router as compliance_router
app.include_router(compliance_router)

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

# ✅ Migrados a routes/vital_signs.py

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

# ✅ Migrados a routes/consultations.py

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

# ✅ Migrados a routes/clinical_studies.py

# ============================================================================
# WHATSAPP NOTIFICATIONS
# ============================================================================

from routes.whatsapp import router as whatsapp_router
app.include_router(whatsapp_router)

# Include Google Calendar routes
from routes.google_calendar import router as google_calendar_router
app.include_router(google_calendar_router)

# Removed duplicate webhook endpoint - using the one at line 844


@app.post("/api/whatsapp/study-results/{study_id}")
async def send_whatsapp_study_results_notification(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Notificar por WhatsApp que los resultados de un estudio están disponibles"""
    api_logger.info(
        "📱 Sending WhatsApp notification for study results",
        extra={"study_id": study_id, "doctor_id": current_user.id}
    )
    
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
        # Get patient first name (first word of full name)
        patient_first_name = patient.name.split()[0] if patient.name else 'Paciente'
        
        result = whatsapp.send_lab_results_notification(
            patient_phone=patient.primary_phone,
            patient_name=patient_first_name,
            study_name=study.study_name,
            secure_link=secure_link
        )
        
        if result['success']:
            api_logger.info(
                "✅ WhatsApp notification sent successfully",
                extra={
                    "study_id": study.id,
                    "patient_id": patient.id,
                    "phone": patient.primary_phone
                }
            )
            return {
                "message": "WhatsApp notification sent successfully",
                "message_id": result.get('message_id'),
                "phone": patient.primary_phone
            }
        else:
            api_logger.error(
                "❌ Failed to send WhatsApp notification",
                extra={
                    "study_id": study.id,
                    "patient_id": patient.id,
                    "phone": patient.primary_phone,
                    "error": result.get('error')
                }
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send WhatsApp: {result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error sending WhatsApp notification",
            extra={"study_id": study_id, "doctor_id": current_user.id},
            exc_info=True
        )
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
    api_logger.info(
        "📱 Testing WhatsApp service",
        extra={"phone": phone, "doctor_id": current_user.id}
    )
    
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
        api_logger.error(
            "❌ Error testing WhatsApp",
            extra={"phone": phone, "doctor_id": current_user.id},
            exc_info=True
        )
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
    
    # Verify token (MUST be set in environment variables - no default for security)
    verify_token = os.getenv('META_WHATSAPP_VERIFY_TOKEN')
    if not verify_token:
        api_logger.error("❌ META_WHATSAPP_VERIFY_TOKEN not configured")
        raise HTTPException(status_code=500, detail="Webhook verification token not configured")
    
    if mode == "subscribe" and token == verify_token:
        api_logger.info("✅ WhatsApp webhook verified successfully")
        return int(challenge)
    else:
        api_logger.warning(
            "❌ WhatsApp webhook verification failed",
            extra={"mode": mode, "token_provided": bool(token)}
        )
        raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/api/whatsapp/webhook")
async def receive_whatsapp_message(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Recibir mensajes y respuestas de WhatsApp
    Procesa respuestas a botones de plantillas (ej: cancelar cita)
    
    Security: Validates X-Hub-Signature-256 header to ensure request is from Meta
    """
    # Log inmediato al recibir el request
    api_logger.warning(
        "🚨 WEBHOOK RECEIVED: /api/whatsapp/webhook",
        extra={
            "method": request.method,
            "url": str(request.url),
            "headers": dict(request.headers),
            "client": request.client.host if request.client else None
        }
    )
    print("=" * 80)
    print("🚨 WEBHOOK RECEIVED: /api/whatsapp/webhook")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Client: {request.client.host if request.client else None}")
    print("=" * 80)
    try:
        # Get raw body for signature validation
        raw_body = await request.body()
        
        # Validate webhook signature from Meta
        import hmac
        import hashlib
        
        # Get signature from header
        signature_header = request.headers.get("X-Hub-Signature-256", "")
        is_production = os.getenv("APP_ENV", "development").lower() == "production"
        
        # In production, signature validation is mandatory
        if is_production and not signature_header:
            api_logger.error("❌ WhatsApp webhook request without signature header in production")
            raise HTTPException(status_code=403, detail="Missing signature header")
        
        if signature_header:
            # Extract signature (format: sha256=<signature>)
            if not signature_header.startswith("sha256="):
                api_logger.error("❌ Invalid signature format")
                if is_production:
                    raise HTTPException(status_code=403, detail="Invalid signature format")
                else:
                    api_logger.warning("⚠️ Invalid signature format - allowing in development")
            else:
                received_signature = signature_header[7:]  # Remove "sha256=" prefix
                
                # Get app secret from environment
                app_secret = os.getenv("META_WHATSAPP_APP_SECRET")
                if not app_secret:
                    api_logger.error("❌ META_WHATSAPP_APP_SECRET not configured")
                    if is_production:
                        raise HTTPException(status_code=500, detail="Webhook secret not configured")
                    else:
                        api_logger.warning("⚠️ META_WHATSAPP_APP_SECRET not configured - skipping signature validation")
                else:
                    # Compute expected signature
                    expected_signature = hmac.new(
                        app_secret.encode('utf-8'),
                        raw_body,
                        hashlib.sha256
                    ).hexdigest()
                    
                    # Compare signatures using constant-time comparison
                    if not hmac.compare_digest(received_signature, expected_signature):
                        api_logger.error("❌ WhatsApp webhook signature validation failed")
                        raise HTTPException(status_code=403, detail="Invalid signature")
                    
                    api_logger.debug("✅ WhatsApp webhook signature validated")
        elif not is_production:
            api_logger.warning("⚠️ WhatsApp webhook request without signature header - allowing in development")
        
        # Log raw request for debugging
        # Print directly to ensure visibility
        print("=" * 80)
        print("📱 WHATSAPP WEBHOOK RECEIVED")
        print(f"Content-Type: {request.headers.get('content-type')}")
        print(f"Body Length: {len(raw_body)}")
        if raw_body:
            try:
                body_preview = raw_body[:500].decode('utf-8', errors='ignore')
                print(f"Body Preview: {body_preview}")
            except:
                print(f"Body Preview: {raw_body[:100]}")
        print("=" * 80)
        # Use warning level to ensure it shows up in logs
        api_logger.warning(
            "📱 Received WhatsApp webhook request",
            extra={
                "content_type": request.headers.get("content-type"),
                "body_length": len(raw_body),
                "body_preview": raw_body[:500].decode('utf-8', errors='ignore') if raw_body else None
            }
        )
        
        # Parse JSON body
        try:
            body = json.loads(raw_body.decode('utf-8'))
        except Exception as json_error:
            api_logger.error(
                "❌ Failed to parse WhatsApp webhook JSON",
                extra={"error": str(json_error), "raw_body": raw_body[:500].decode('utf-8', errors='ignore') if raw_body else None},
                exc_info=True
            )
            return {"status": "error", "message": "Invalid JSON"}
        
        print(f"📱 Parsed WhatsApp webhook body: {type(body).__name__}")
        print(f"Body keys: {list(body.keys()) if isinstance(body, dict) else None}")
        print(f"Object: {body.get('object') if isinstance(body, dict) else None}")
        api_logger.warning(
            "📱 Parsed WhatsApp webhook body",
            extra={
                "body_type": type(body).__name__,
                "body_keys": list(body.keys()) if isinstance(body, dict) else None,
                "object": body.get("object") if isinstance(body, dict) else None
            }
        )
        
        # Verificar que es una notificación de WhatsApp
        # WhatsApp puede enviar diferentes formatos, verificar múltiples variantes
        webhook_object = body.get("object")
        api_logger.info(
            "🔍 Checking webhook object type",
            extra={"object": webhook_object, "body_keys": list(body.keys()) if isinstance(body, dict) else None}
        )
        
        # Aceptar diferentes formatos de webhook de WhatsApp
        # Meta puede enviar "whatsapp_business_account" o "page" dependiendo de la configuración
        if webhook_object not in ["whatsapp_business_account", "page"]:
            # Si no tiene "object", puede ser un formato diferente - intentar procesar de todas formas
            if "entry" in body:
                api_logger.info(
                    "⚠️ Webhook object not recognized but has 'entry' field, attempting to process",
                    extra={"object": webhook_object}
                )
            else:
                api_logger.warning(
                    "⚠️ Ignoring webhook - not a WhatsApp notification",
                    extra={"object": webhook_object, "body_keys": list(body.keys()) if isinstance(body, dict) else None}
                )
                return {"status": "ignored", "reason": f"object is {webhook_object}"}
        
        # Procesar entries
        entries = body.get("entry", [])
        print(f"📥 Processing {len(entries)} WhatsApp entries")
        api_logger.warning(
            "📥 Processing WhatsApp entries",
            extra={"entry_count": len(entries)}
        )
        
        processed_messages = 0
        for entry in entries:
            changes = entry.get("changes", [])
            api_logger.debug(
                "🔍 Processing entry",
                extra={"entry_id": entry.get("id"), "changes_count": len(changes)}
            )
            
            for change in changes:
                value = change.get("value", {})
                field = change.get("field")
                
                api_logger.warning(
                    "🔍 Processing WhatsApp change",
                    extra={
                        "field": field,
                        "value_keys": list(value.keys()) if isinstance(value, dict) else None
                    }
                )
                
                # Verificar si hay mensajes
                if "messages" in value:
                    messages = value["messages"]
                    print(f"📩 Found {len(messages)} messages in webhook")
                    api_logger.warning(
                        "📩 Found messages in webhook",
                        extra={"count": len(messages)}
                    )
                    for message in messages:
                        msg_type = message.get("type")
                        from_phone = message.get("from")
                        msg_id = message.get("id")
                        print(f"📩 Processing WhatsApp message: type={msg_type}, from={from_phone}, id={msg_id}")
                        api_logger.warning(
                            "📩 Processing WhatsApp message",
                            extra={
                                "message_type": msg_type,
                                "from_phone": from_phone,
                                "message_id": msg_id
                            }
                        )
                        try:
                            await process_whatsapp_message(message, db)
                            processed_messages += 1
                        except Exception as msg_error:
                            api_logger.error(
                                "❌ Error processing individual message",
                                extra={
                                    "message_id": message.get("id"),
                                    "from_phone": message.get("from"),
                                    "error": str(msg_error)
                                },
                                exc_info=True
                            )
                
                # Verificar si hay respuestas a botones interactivos
                if "messages" in value:
                    for message in value["messages"]:
                        if message.get("type") == "interactive":
                            interactive = message.get("interactive", {})
                            api_logger.info(
                                "🔘 Found interactive message",
                                extra={
                                    "interactive_type": interactive.get("type"),
                                    "button_id": interactive.get("button_reply", {}).get("id"),
                                    "from_phone": message.get("from")
                                }
                            )
                
                # Verificar si hay actualizaciones de estado
                if "statuses" in value:
                    api_logger.info(
                        "📊 Message status update",
                        extra={"statuses": value["statuses"]}
                    )
        
        print(f"✅ WhatsApp webhook processed: {processed_messages} messages from {len(entries)} entries")
        api_logger.warning(
            "✅ WhatsApp webhook processed successfully",
            extra={"processed_messages": processed_messages, "total_entries": len(entries)}
        )
        
        return {"status": "success", "processed_messages": processed_messages}
        
    except Exception as e:
        api_logger.error(
            "❌ Error processing WhatsApp webhook",
            extra={"error": str(e)},
            exc_info=True
        )
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
        message_id = message.get("id")
        timestamp = message.get("timestamp")
        
        print(f"📩 Processing WhatsApp message: type={message_type}, from={from_phone}, id={message_id}, timestamp={timestamp}")
        api_logger.warning(
            "📩 Processing WhatsApp message",
            extra={
                "message_type": message_type,
                "from_phone": from_phone,
                "message_id": message_id,
                "timestamp": timestamp,
                "message_keys": list(message.keys())
            }
        )
        
        # Procesar respuesta a botón interactivo (nuevo formato de WhatsApp)
        if message_type == "interactive":
            interactive = message.get("interactive", {})
            
            # Log completo del mensaje interactivo para debugging
            api_logger.warning(
                "🔍 Processing interactive message",
                extra={
                    "interactive_type": interactive.get("type"),
                    "interactive_keys": list(interactive.keys()) if isinstance(interactive, dict) else None,
                    "full_interactive": interactive,
                    "full_message": message,
                    "from_phone": from_phone
                }
            )
            
            # Procesar button_reply
            if interactive.get("type") == "button_reply":
                button_reply = interactive.get("button_reply", {})
                button_id = button_reply.get("id")
                button_title = button_reply.get("title")
                
                api_logger.warning(
                    "🔘 Interactive button clicked",
                    extra={
                        "button_id": button_id,
                        "button_title": button_title,
                        "from_phone": from_phone,
                        "button_reply_full": button_reply
                    }
                )
                
                # Procesar botones de consentimiento de privacidad
                if button_id and button_id.startswith("accept_privacy_"):
                    security_logger.info(
                        "✅ Privacy consent accepted via interactive button",
                        extra={"button_id": button_id, "from_phone": from_phone}
                    )
                    await process_privacy_consent(button_id, from_phone, db)
                
                # Procesar botones de cancelación de cita
                elif button_id and button_id.startswith("cancel_appointment_"):
                    appointment_id = int(button_id.replace("cancel_appointment_", ""))
                    api_logger.warning(
                        "🔄 Processing cancel appointment button",
                        extra={"button_id": button_id, "appointment_id": appointment_id, "from_phone": from_phone}
                    )
                    await cancel_appointment_via_whatsapp(appointment_id, from_phone, db)
                elif button_id and button_id.startswith("confirm_appointment_"):
                    appointment_id = int(button_id.replace("confirm_appointment_", ""))
                    api_logger.warning(
                        "✅ Processing confirm appointment button",
                        extra={"button_id": button_id, "appointment_id": appointment_id, "from_phone": from_phone}
                    )
                    await confirm_appointment_via_whatsapp(appointment_id, from_phone, db)
                elif button_title and button_title.lower() == "confirmar":
                    # Intentar usar context.message_id para eliminar ambigüedad
                    context = message.get("context", {})
                    original_message_id = context.get("id") if context else None
                    
                    api_logger.warning(
                        "✅ Processing confirm appointment button by title",
                        extra={
                            "button_title": button_title,
                            "from_phone": from_phone,
                            "original_message_id": original_message_id,
                            "has_context": bool(context)
                        }
                    )
                    
                    # Si tenemos el message_id original, buscar el recordatorio por ese ID
                    if original_message_id:
                        appointment_id_from_message = await _find_appointment_by_whatsapp_message_id(original_message_id, db)
                        if appointment_id_from_message:
                            api_logger.info(
                                "✅ Found appointment by WhatsApp message_id",
                                extra={
                                    "whatsapp_message_id": original_message_id,
                                    "appointment_id": appointment_id_from_message
                                }
                            )
                            await confirm_appointment_via_whatsapp(appointment_id_from_message, from_phone, db)
                            return
                    
                    # Fallback: búsqueda por teléfono (comportamiento anterior)
                    await confirm_appointment_via_whatsapp(None, from_phone, db)
                else:
                    # Si no coincide con ninguna condición, log para debugging
                    api_logger.warning(
                        "⚠️ Interactive button not matched",
                        extra={
                            "button_id": button_id,
                            "button_title": button_title,
                            "from_phone": from_phone,
                            "button_id_starts_with_confirm": button_id.startswith("confirm_appointment_") if button_id else False,
                            "button_id_starts_with_cancel": button_id.startswith("cancel_appointment_") if button_id else False
                        }
                    )
            else:
                # Otros tipos de mensajes interactivos (list_reply, etc.)
                api_logger.warning(
                    "⚠️ Interactive message type not handled",
                    extra={
                        "interactive_type": interactive.get("type"),
                        "interactive": interactive,
                        "from_phone": from_phone
                    }
                )
        
        # Procesar respuesta a botón (formato anterior)
        elif message_type == "button":
            button_payload = message.get("button", {}).get("payload")
            button_text = message.get("button", {}).get("text")
            
            api_logger.info(
                "🔘 Button clicked (legacy)",
                extra={"payload": button_payload, "text": button_text, "from_phone": from_phone}
            )
            
            # Si es una cancelación de cita
            if button_payload and button_payload.startswith("cancel_appointment_"):
                appointment_id = int(button_payload.replace("cancel_appointment_", ""))
                await cancel_appointment_via_whatsapp(appointment_id, from_phone, db)
            # Manejar payload "Cancelar" genérico
            elif button_payload == "Cancelar" or button_text == "Cancelar":
                # Intentar usar context.message_id para eliminar ambigüedad
                context = message.get("context", {})
                original_message_id = context.get("id") if context else None
                
                api_logger.info(
                    "🔄 Generic cancel button clicked, processing as cancellation request",
                    extra={
                        "from_phone": from_phone,
                        "original_message_id": original_message_id,
                        "has_context": bool(context)
                    }
                )
                
                # Si tenemos el message_id original, buscar el recordatorio por ese ID
                if original_message_id:
                    appointment_id_from_message = await _find_appointment_by_whatsapp_message_id(original_message_id, db)
                    if appointment_id_from_message:
                        api_logger.info(
                            "✅ Found appointment by WhatsApp message_id for cancellation",
                            extra={
                                "whatsapp_message_id": original_message_id,
                                "appointment_id": appointment_id_from_message
                            }
                        )
                        await cancel_appointment_via_whatsapp(appointment_id_from_message, from_phone, db)
                        return
                
                # Fallback: búsqueda por teléfono (comportamiento anterior)
                await process_text_cancellation_request("cancelar", from_phone, db)
            elif (button_payload and button_payload.startswith("confirm_appointment_")):
                appointment_id = int(button_payload.replace("confirm_appointment_", ""))
                api_logger.info(
                    "🔘 Confirm appointment button clicked (legacy) with payload",
                    extra={"button_payload": button_payload, "appointment_id": appointment_id, "from_phone": from_phone}
                )
                await confirm_appointment_via_whatsapp(appointment_id, from_phone, db)
            elif (button_payload == "Confirmar" or button_text == "Confirmar"):
                # Intentar usar context.message_id para eliminar ambigüedad
                context = message.get("context", {})
                original_message_id = context.get("id") if context else None
                
                api_logger.info(
                    "🔘 Confirm appointment button clicked (legacy) by text",
                    extra={
                        "button_payload": button_payload,
                        "button_text": button_text,
                        "from_phone": from_phone,
                        "original_message_id": original_message_id,
                        "has_context": bool(context)
                    }
                )
                
                # Si tenemos el message_id original, buscar el recordatorio por ese ID
                if original_message_id:
                    appointment_id_from_message = await _find_appointment_by_whatsapp_message_id(original_message_id, db)
                    if appointment_id_from_message:
                        api_logger.info(
                            "✅ Found appointment by WhatsApp message_id (legacy)",
                            extra={
                                "whatsapp_message_id": original_message_id,
                                "appointment_id": appointment_id_from_message
                            }
                        )
                        await confirm_appointment_via_whatsapp(appointment_id_from_message, from_phone, db)
                        return
                
                # Fallback: búsqueda por teléfono (comportamiento anterior)
                await confirm_appointment_via_whatsapp(None, from_phone, db)
            # Manejar consentimiento de privacidad cuando viene como "Acepto" (formato antiguo)
            elif button_payload == "Acepto" or button_text == "Acepto":
                security_logger.info(
                    "✅ Privacy consent accepted via legacy button format",
                    extra={"payload": button_payload, "from_phone": from_phone}
                )
                await process_privacy_consent_by_phone(from_phone, db)
        
        # Procesar mensaje de texto
        elif message_type == "text":
            text = message.get("text", {}).get("body", "").lower().strip()
            api_logger.info(
                "💬 Text message received",
                extra={"from_phone": from_phone, "text": text}
            )
            
            if any(keyword in text for keyword in ["confirmar", "confirmación", "confirm"]):
                api_logger.info(
                    "✅ Detected confirmation request in text",
                    extra={"from_phone": from_phone}
                )
                await confirm_appointment_via_whatsapp(None, from_phone, db)
                return
            
            # Procesar mensajes de cancelación
            if any(keyword in text for keyword in ["cancelar", "cancel", "cancelar cita", "cancel appointment"]):
                api_logger.info(
                    "🔄 Detected cancellation request in text",
                    extra={"from_phone": from_phone}
                )
                await process_text_cancellation_request(text, from_phone, db)
        
    except Exception as e:
        api_logger.error(
            "❌ Error processing WhatsApp message",
            extra={"from_phone": message.get("from")},
            exc_info=True
        )

async def process_privacy_consent_by_phone(from_phone: str, db: Session):
    """
    Procesar consentimiento de privacidad cuando solo tenemos el teléfono (formato antiguo de botón)
    Busca el consentimiento pendiente más reciente del paciente con ese teléfono
    """
    try:
        security_logger.info(
            "🔐 Processing privacy consent by phone",
            extra={"from_phone": from_phone}
        )
        
        # Normalizar el número de teléfono
        whatsapp = get_whatsapp_service()
        normalized_from_phone = whatsapp._format_phone_number(from_phone)
        
        # Normalizar el número entrante para búsqueda
        # El formato puede ser: 5215579449672, +5215579449672, 525579449672, +525579449672, etc.
        # Necesitamos extraer solo los últimos 10 dígitos para comparar
        def extract_digits(phone_str):
            """Extrae solo los dígitos de un número de teléfono"""
            return ''.join(filter(str.isdigit, str(phone_str)))
        
        from_digits = extract_digits(from_phone)
        # Los últimos 10 dígitos son el número local en México
        from_local_digits = from_digits[-10:] if len(from_digits) >= 10 else from_digits
        
        security_logger.debug(
            "🔍 Searching for patient by phone digits",
            extra={"from_phone": from_phone, "from_local_digits": from_local_digits}
        )
        
        # Buscar pacientes cuyo teléfono termine en los mismos últimos 10 dígitos
        all_patients = db.query(Person).filter(
            Person.person_type == 'patient',
            Person.primary_phone.isnot(None)
        ).all()
        
        matching_patient = None
        for patient in all_patients:
            if not patient.primary_phone:
                continue
            
            patient_digits = extract_digits(patient.primary_phone)
            patient_local_digits = patient_digits[-10:] if len(patient_digits) >= 10 else patient_digits
            
            # También normalizar con el servicio de WhatsApp para comparación exacta
            normalized_patient_phone = whatsapp._format_phone_number(patient.primary_phone)
            
            security_logger.debug(
                "🔍 Comparing patient phone",
                extra={
                    "patient_id": patient.id,
                    "patient_phone": patient.primary_phone,
                    "patient_digits": patient_local_digits,
                    "incoming_digits": from_local_digits
                }
            )
            
            # Comparar por últimos 10 dígitos o por formato normalizado
            if (patient_local_digits == from_local_digits or 
                normalized_patient_phone == normalized_from_phone or
                normalized_patient_phone.endswith(from_local_digits) or
                normalized_from_phone.endswith(patient_local_digits)):
                matching_patient = patient
                security_logger.info(
                    "✅ Found matching patient by phone",
                    extra={"patient_id": patient.id, "from_phone": from_phone}
                )
                break
        
        if not matching_patient:
            security_logger.warning(
                "❌ No patient found matching phone",
                extra={"from_phone": from_phone, "normalized_from_phone": normalized_from_phone}
            )
            return
        
        # Buscar el consentimiento pendiente más reciente del paciente
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == matching_patient.id,
            PrivacyConsent.consent_given == False  # Solo pendientes
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if not consent:
            security_logger.info(
                "⚠️ No pending consent found for patient",
                extra={"patient_id": matching_patient.id}
            )
            # Buscar si ya tiene un consentimiento aceptado
            accepted_consent = db.query(PrivacyConsent).filter(
                PrivacyConsent.patient_id == matching_patient.id,
                PrivacyConsent.consent_given == True
            ).order_by(PrivacyConsent.created_at.desc()).first()
            
            if accepted_consent:
                security_logger.info(
                    "ℹ️ Patient already has accepted consent",
                    extra={"patient_id": matching_patient.id, "consent_id": accepted_consent.id}
                )
                return
            
            # Si no hay ningún consentimiento, crear uno nuevo automáticamente
            security_logger.info(
                "📝 Creating new consent record for patient",
                extra={"patient_id": matching_patient.id}
            )
            
            # Obtener aviso de privacidad activo
            privacy_notice = db.query(PrivacyNotice).filter(
                PrivacyNotice.is_active == True
            ).order_by(PrivacyNotice.effective_date.desc()).first()
            
            if not privacy_notice:
                security_logger.error(
                    "❌ No active privacy notice found, cannot create consent",
                    extra={"patient_id": matching_patient.id}
                )
                return
            
            # Crear nuevo consentimiento
            consent = PrivacyConsent(
                patient_id=matching_patient.id,
                notice_id=privacy_notice.id,
                consent_given=False,  # Se establecerá a True abajo
                consent_date=utc_now()
            )
            db.add(consent)
            db.flush()  # Para obtener el ID sin hacer commit todavía
            security_logger.info(
                "✅ Created new consent record",
                extra={"patient_id": matching_patient.id, "consent_id": consent.id}
            )
        
        # Actualizar el consentimiento
        consent.consent_given = True
        consent.consent_date = utc_now()
        # Nota: consent_method no existe en la tabla, se elimina esa asignación
        
        db.commit()
        
        security_logger.info(
            "✅ Privacy consent updated for patient",
            extra={"patient_id": matching_patient.id, "consent_id": consent.id}
        )
        
        # Enviar mensaje de confirmación (best-effort)
        try:
            # Usar la instancia de whatsapp que ya creamos al principio
            patient_first_name = matching_patient.name.split()[0] if matching_patient.name else 'Paciente'
            whatsapp.send_text_message(
                to_phone=from_phone,
                message=(
                    f"✅ Gracias {patient_first_name}, tu consentimiento ha sido registrado correctamente.\n\n"
                    f"Ahora podemos brindarte atención médica cumpliendo con la Ley de Protección de Datos.\n\n"
                    f"Recuerda que puedes revocar tu consentimiento en cualquier momento contactando al consultorio.\n\n"
                    f"Tus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) están garantizados."
                ),
            )
        except Exception:
            security_logger.warning(
                "⚠️ Could not send consent confirmation message",
                extra={"patient_id": matching_patient.id, "from_phone": from_phone},
                exc_info=True,
            )
        
    except Exception as e:
        security_logger.error(
            "❌ Error processing privacy consent by phone",
            extra={"from_phone": from_phone},
            exc_info=True
        )
        db.rollback()

async def process_privacy_consent(button_id: str, from_phone: str, db: Session):
    """
    Procesar consentimiento de privacidad recibido vía WhatsApp
    """
    try:
        security_logger.info(
            "🔐 Processing privacy consent by button",
            extra={"button_id": button_id, "from_phone": from_phone}
        )
        
        # Extraer el ID del consentimiento del button_id (ej: accept_privacy_8)
        consent_id = int(button_id.replace("accept_privacy_", ""))
        
        # Buscar el registro de consentimiento
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.id == consent_id
        ).first()
        
        if not consent:
            security_logger.warning(
                "❌ Privacy consent record not found",
                extra={"consent_id": consent_id}
            )
            return
        
        # Buscar el paciente
        patient = db.query(Person).filter(
            Person.id == consent.patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            security_logger.error(
                "❌ Patient not found for consent",
                extra={"consent_id": consent_id, "patient_id": consent.patient_id}
            )
            return
        
        # Verificar que el teléfono corresponde al paciente
        # Normalizar números para comparación
        whatsapp = get_whatsapp_service()
        normalized_patient_phone = whatsapp._format_phone_number(patient.primary_phone)
        normalized_from_phone = whatsapp._format_phone_number(from_phone)
        
        # También probar con formato internacional (521...)
        patient_phone_international = f"521{patient.primary_phone}"
        
        security_logger.debug(
            "🔍 Comparing phones for consent",
            extra={
                "patient_id": patient.id,
                "patient_phone_formatted": normalized_patient_phone,
                "patient_phone_international": patient_phone_international,
                "incoming_phone_formatted": normalized_from_phone
            }
        )
        
        if normalized_patient_phone != normalized_from_phone and patient_phone_international != normalized_from_phone:
            security_logger.warning(
                "❌ Phone mismatch while processing consent",
                extra={
                    "patient_id": patient.id,
                    "consent_id": consent.id,
                    "patient_phone_formatted": normalized_patient_phone,
                    "incoming_phone_formatted": normalized_from_phone
                }
            )
            return
        
        # Actualizar el consentimiento
        consent.consent_given = True
        consent.consent_date = utc_now()
        # Nota: consent_method no existe en la tabla, se elimina esa asignación
        
        db.commit()
        
        security_logger.info(
            "✅ Privacy consent updated for patient",
            extra={"patient_id": consent.patient_id, "consent_id": consent_id}
        )
        
        # Opcional: Enviar mensaje de confirmación
        # (Esto requeriría una plantilla adicional aprobada)
        
    except Exception as e:
        security_logger.error(
            "❌ Error processing privacy consent",
            extra={"button_id": button_id, "from_phone": from_phone},
            exc_info=True
        )
        db.rollback()

async def _find_appointment_by_whatsapp_message_id(whatsapp_message_id: str, db: Session) -> Optional[int]:
    """
    Buscar appointment_id usando el whatsapp_message_id del recordatorio
    Esto elimina completamente la ambigüedad cuando se usa template
    """
    try:
        from database import AppointmentReminder
        
        reminder = db.query(AppointmentReminder).filter(
            AppointmentReminder.whatsapp_message_id == whatsapp_message_id
        ).first()
        
        if reminder and reminder.appointment_id:
            api_logger.info(
                "✅ Found appointment by WhatsApp message_id",
                extra={
                    "whatsapp_message_id": whatsapp_message_id,
                    "appointment_id": reminder.appointment_id,
                    "reminder_id": reminder.id
                }
            )
            return reminder.appointment_id
        
        api_logger.warning(
            "⚠️ No appointment found for WhatsApp message_id",
            extra={"whatsapp_message_id": whatsapp_message_id}
        )
        return None
    except Exception as e:
        api_logger.error(
            "❌ Error finding appointment by WhatsApp message_id",
            extra={"whatsapp_message_id": whatsapp_message_id},
            exc_info=True
        )
        return None

async def cancel_appointment_via_whatsapp(appointment_id: int, patient_phone: str, db: Session):
    """
    Cancelar una cita cuando el paciente responde vía WhatsApp
    """
    try:
        api_logger.info(
            "🔄 Canceling appointment via WhatsApp",
            extra={"appointment_id": appointment_id, "patient_phone": patient_phone}
        )
        
        # Buscar la cita
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            api_logger.warning(
                "❌ Appointment not found when cancelling via WhatsApp",
                extra={"appointment_id": appointment_id}
            )
            return
        
        # Verificar que el teléfono corresponde al paciente
        patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
        
        if not patient:
            api_logger.error(
                "❌ Patient not found for appointment when cancelling via WhatsApp",
                extra={"appointment_id": appointment_id}
            )
            return
        
        # No verificar teléfono cuando tenemos appointment_id del botón
        # El appointment_id viene directamente del botón, así que es confiable
        
        doctor_id = appointment.doctor_id
        
        # Cancelar la cita
        appointment.status = 'cancelled'
        appointment.cancelled_reason = 'Cancelada por el paciente vía WhatsApp'
        appointment.updated_at = utc_now()
        
        db.commit()
        db.refresh(appointment)
        
        # Sincronizar con Google Calendar si está configurado
        if doctor_id:
            try:
                from services.google_calendar_service import GoogleCalendarService
                GoogleCalendarService.delete_calendar_event(db, doctor_id, appointment_id)
            except Exception as e:
                # No fallar si Google Calendar no está configurado o hay error
                api_logger.warning("Error al sincronizar eliminación con Google Calendar (no crítico)", exc_info=True, extra={
                    "doctor_id": doctor_id,
                    "appointment_id": appointment_id
                })
        
        # Track WhatsApp cancellation in Amplitude
        try:
            from services.amplitude_service import AmplitudeService
            AmplitudeService.track_whatsapp_reminder_cancelled(
                appointment_id=appointment_id,
                patient_id=patient.id
            )
        except Exception as e:
            # Silently fail - Amplitude tracking is non-critical
            pass
        
        api_logger.info(
            "✅ Appointment cancelled successfully via WhatsApp",
            extra={"appointment_id": appointment_id}
        )
        
        # Emit SSE event to notify frontend
        try:
            await emit_appointment_event("appointment_cancelled", {
                "appointment_id": appointment_id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "status": appointment.status,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
            })
        except Exception as e:
            api_logger.warning("Failed to emit SSE event", extra={"error": str(e)})
        
        # Opcional: Enviar mensaje de confirmación al paciente
        # (Esto requeriría una plantilla adicional aprobada)
        
    except Exception as e:
        db.rollback()
        api_logger.error(
            "❌ Error cancelling appointment via WhatsApp",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )

async def confirm_appointment_via_whatsapp(appointment_id: Optional[int], patient_phone: str, db: Session):
    """
    Confirmar una cita cuando el paciente responde vía WhatsApp
    """
    try:
        api_logger.info(
            "✅ Confirming appointment via WhatsApp",
            extra={"appointment_id": appointment_id, "patient_phone": patient_phone}
        )
        
        # Log entrada completa para debugging
        api_logger.debug(
            "🔍 confirm_appointment_via_whatsapp called",
            extra={
                "appointment_id": appointment_id,
                "patient_phone": patient_phone,
                "appointment_id_type": type(appointment_id).__name__
            }
        )
        
        whatsapp = get_whatsapp_service()
        normalized_from_phone = whatsapp._format_phone_number(patient_phone)
        
        appointment = None
        patient = None
        
        if appointment_id is not None:
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                api_logger.warning(
                    "❌ Appointment not found for confirmation via WhatsApp",
                    extra={"appointment_id": appointment_id}
                )
                return
            
            patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
            if not patient:
                api_logger.error(
                    "❌ Patient not found for appointment confirmation",
                    extra={"appointment_id": appointment_id}
                )
                return
            
            # No verificar teléfono cuando tenemos appointment_id del botón
            # El appointment_id viene directamente del botón, así que es confiable
        else:
            # Buscar paciente por teléfono
            patients = db.query(Person).filter(
                Person.person_type == 'patient',
                Person.primary_phone.isnot(None)
            ).all()
            
            matching_patient = None
            for candidate in patients:
                normalized_candidate_phone = whatsapp._format_phone_number(candidate.primary_phone)
                
                alternate_candidate_phone = normalized_candidate_phone.replace("521", "52") if normalized_candidate_phone.startswith("521") else normalized_candidate_phone
                alternate_from_phone = normalized_from_phone.replace("521", "52") if normalized_from_phone.startswith("521") else normalized_from_phone
                
                if (normalized_candidate_phone == normalized_from_phone or
                    normalized_candidate_phone == alternate_from_phone or
                    alternate_candidate_phone == normalized_from_phone):
                    matching_patient = candidate
                    break
            
            if not matching_patient:
                api_logger.info(
                    "❌ No matching patient found for confirmation",
                    extra={"patient_phone": patient_phone}
                )
                return
            
            # Buscar la cita correcta: priorizar citas con recordatorios enviados recientemente
            # y luego buscar por fecha cercana para asegurar que sea la cita correcta
            from datetime import timedelta
            from sqlalchemy.orm import joinedload
            from sqlalchemy import func
            
            now = utc_now()
            recent_threshold = now - timedelta(hours=2)  # Últimas 2 horas
            
            # Primero intentar encontrar una cita con recordatorio enviado recientemente
            # Esto asegura que sea la cita del recordatorio que acabamos de enviar
            appointment_with_recent_reminder = db.query(Appointment).join(
                AppointmentReminder
            ).options(
                joinedload(Appointment.reminders)
            ).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status == 'por_confirmar',
                AppointmentReminder.sent == True,
                AppointmentReminder.sent_at >= recent_threshold
            ).order_by(
                AppointmentReminder.sent_at.desc()  # El recordatorio más reciente primero
            ).first()
            
            if appointment_with_recent_reminder:
                appointment = appointment_with_recent_reminder
                patient = matching_patient
                # Obtener el sent_at del recordatorio más reciente
                recent_reminder = next(
                    (r for r in appointment.reminders if r.sent and r.sent_at and r.sent_at >= recent_threshold),
                    None
                ) if appointment.reminders else None
                api_logger.info(
                    "✅ Found appointment with recent reminder",
                    extra={
                        "appointment_id": appointment.id,
                        "appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                        "reminder_sent_at": recent_reminder.sent_at.isoformat() if recent_reminder and recent_reminder.sent_at else None
                    }
                )
            else:
                # Si no hay recordatorio reciente, buscar la cita más próxima en el tiempo
                # Restringir a un rango más estrecho: desde hace 1 día hasta 7 días en el futuro
                # Esto asegura que sea una cita relevante y reciente
                past_threshold = now - timedelta(days=1)  # Máximo 1 día en el pasado
                future_threshold = now + timedelta(days=7)  # Máximo 7 días en el futuro
                
                appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status == 'por_confirmar',
                    Appointment.appointment_date >= past_threshold,  # No más de 1 día en el pasado
                    Appointment.appointment_date <= future_threshold  # No más de 7 días en el futuro
                ).order_by(
                    Appointment.appointment_date.asc()  # La más próxima primero
                ).first()
                
                if appointment:
                    patient = matching_patient
                    api_logger.info(
                        "✅ Found nearest appointment in date range",
                        extra={
                            "appointment_id": appointment.id,
                            "appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                            "date_range": f"{past_threshold.isoformat()} to {future_threshold.isoformat()}"
                        }
                    )
                else:
                    api_logger.info(
                        "❌ No matching pending appointment found for confirmation in date range",
                        extra={
                            "patient_phone": patient_phone,
                            "patient_id": matching_patient.id,
                            "date_range": f"{past_threshold.isoformat()} to {future_threshold.isoformat()}"
                        }
                    )
                    return
        
        if appointment.status == 'cancelled':
            api_logger.info(
                "⚠️ Appointment already cancelled, skipping confirmation",
                extra={"appointment_id": appointment.id}
            )
            return
        
        if appointment.status == 'confirmada':
            api_logger.info(
                "⚠️ Appointment already confirmed, skipping",
                extra={"appointment_id": appointment.id}
            )
            return
        
        # Log estado antes del cambio
        api_logger.info(
            "🔄 Updating appointment status",
            extra={
                "appointment_id": appointment.id,
                "old_status": appointment.status,
                "new_status": "confirmada"
            }
        )
        
        appointment.status = 'confirmada'
        # Note: Appointment model doesn't have confirmed_at field
        appointment.updated_at = utc_now()
        appointment.cancelled_reason = None
        
        # Log antes del commit
        api_logger.debug(
            "💾 Committing appointment status change",
            extra={
                "appointment_id": appointment.id,
                "status": appointment.status,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
            }
        )
        
        try:
            db.commit()
            # Verificar que el cambio se guardó
            db.refresh(appointment)
            
            # Double-check that the status was saved correctly
            if appointment.status != 'confirmada':
                api_logger.error(
                    "❌ Status not saved correctly after commit",
                    extra={
                        "appointment_id": appointment.id,
                        "expected_status": "confirmada",
                        "actual_status": appointment.status
                    }
                )
                # Try to fix it
                appointment.status = 'confirmada'
                db.commit()
                db.refresh(appointment)
        except Exception as commit_error:
            db.rollback()
            api_logger.error(
                "❌ Error committing appointment status change",
                extra={
                    "appointment_id": appointment.id,
                    "error": str(commit_error)
                },
                exc_info=True
            )
            raise
        api_logger.info(
            "✅ Appointment confirmed successfully via WhatsApp",
            extra={
                "appointment_id": appointment.id,
                "final_status": appointment.status,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
            }
        )
        
        # Emit SSE event to notify frontend
        try:
            await emit_appointment_event("appointment_confirmed", {
                "appointment_id": appointment.id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "status": appointment.status,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
            })
        except Exception as e:
            api_logger.warning("Failed to emit SSE event", extra={"error": str(e)})
        
        # Track WhatsApp confirmation in Amplitude
        try:
            from services.amplitude_service import AmplitudeService
            AmplitudeService.track_whatsapp_reminder_confirmed(
                appointment_id=appointment.id,
                patient_id=appointment.patient_id
            )
        except Exception as e:
            # Silently fail - Amplitude tracking is non-critical
            pass
    except Exception as e:
        db.rollback()
        api_logger.error(
            "❌ Error confirming appointment via WhatsApp",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )

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
            Appointment.status.in_(['confirmada', 'por_confirmar'])
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
        
        # Buscar la cita correcta del paciente: priorizar por fecha cercana
        # Restringir a un rango razonable para asegurar que sea la cita correcta
        from datetime import datetime, timedelta
        from sqlalchemy.orm import joinedload
        
        now = utc_now()
        past_threshold = now - timedelta(days=1)  # Máximo 1 día en el pasado
        future_threshold = now + timedelta(days=7)  # Máximo 7 días en el futuro
        
        # Primero buscar citas con recordatorios enviados recientemente (últimas 2 horas)
        # Esto asegura que sea la cita del recordatorio que acabamos de enviar
        recent_threshold = now - timedelta(hours=2)
        appointment_with_recent_reminder = db.query(Appointment).join(
            AppointmentReminder
        ).options(
            joinedload(Appointment.reminders)
        ).filter(
            Appointment.patient_id == matching_patient.id,
            Appointment.status.in_(['confirmada', 'por_confirmar']),
            AppointmentReminder.sent == True,
            AppointmentReminder.sent_at >= recent_threshold
        ).order_by(
            AppointmentReminder.sent_at.desc()  # El recordatorio más reciente primero
        ).first()
        
        if appointment_with_recent_reminder:
            next_appointment = appointment_with_recent_reminder
            api_logger.info(
                "✅ Found appointment with recent reminder for cancellation",
                extra={
                    "appointment_id": next_appointment.id,
                    "appointment_date": next_appointment.appointment_date.isoformat() if next_appointment.appointment_date else None
                }
            )
        else:
            # Si no hay recordatorio reciente, buscar en un rango de fechas estrecho
            # Primero buscar citas confirmadas en el rango
            next_appointment = db.query(Appointment).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status == 'confirmada',
                Appointment.appointment_date >= past_threshold,
                Appointment.appointment_date <= future_threshold
            ).order_by(Appointment.appointment_date.asc()).first()
            
            if not next_appointment:
                # Si no hay citas confirmadas, buscar cualquier cita en el rango (excepto canceladas)
                next_appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status != 'cancelled',
                    Appointment.appointment_date >= past_threshold,
                    Appointment.appointment_date <= future_threshold
                ).order_by(Appointment.appointment_date.asc()).first()
            
            if next_appointment:
                api_logger.info(
                    "✅ Found appointment in date range for cancellation",
                    extra={
                        "appointment_id": next_appointment.id,
                        "appointment_date": next_appointment.appointment_date.isoformat() if next_appointment.appointment_date else None,
                        "date_range": f"{past_threshold.isoformat()} to {future_threshold.isoformat()}"
                    }
                )
        
        if not next_appointment:
            # Si no hay citas en el rango, buscar cualquier cita reciente (últimos 7 días) EXCEPTO CANCELADAS
            recent_date = now - timedelta(days=7)
            next_appointment = db.query(Appointment).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status != 'cancelled',  # ← EXCLUIR CITAS CANCELADAS
                Appointment.appointment_date >= recent_date
            ).order_by(Appointment.appointment_date.desc()).first()
        
        if not next_appointment:
            return
        
        doctor_id = next_appointment.doctor_id
        
        # Actualizar campos de cancelación específicos
        next_appointment.status = 'cancelled'
        next_appointment.cancelled_reason = 'cancelled by patient'
        next_appointment.cancelled_at = utc_now()
        next_appointment.cancelled_by = matching_patient.id
        next_appointment.updated_at = utc_now()
        
        try:
            db.commit()
            db.refresh(next_appointment)
        except Exception as commit_error:
            db.rollback()
            raise commit_error
        
        # Sincronizar con Google Calendar si está configurado
        if doctor_id:
            try:
                from services.google_calendar_service import GoogleCalendarService
                GoogleCalendarService.delete_calendar_event(db, doctor_id, next_appointment.id)
            except Exception as e:
                # No fallar si Google Calendar no está configurado o hay error
                api_logger.warning("Error al sincronizar eliminación con Google Calendar (no crítico)", exc_info=True, extra={
                    "doctor_id": doctor_id,
                    "appointment_id": next_appointment.id
                })
        
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

# Debug endpoints removed - were disabled for security and not needed for MVP

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
# ✅ Migrados a routes/schedule.py

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
        api_logger.error("❌ Error in get_audit_logs", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching audit logs: {str(e)}")

# ============================================================================
# AUTHENTICATION
# ============================================================================
# MIGRADO a routes/auth.py - Endpoint register también migrado:
# - POST /api/auth/register ✅ ELIMINADO

# ✅ Migrados a routes/auth.py

# ============================================================================
# DOCTORS
# ============================================================================
# MIGRADO a routes/doctors.py - Los siguientes 3 endpoints fueron migrados:
# - GET /api/doctors/me/profile ✅ ELIMINADO
# - POST /api/doctors ✅ ELIMINADO
# - PUT /api/doctors/me/profile ✅ ELIMINADO

# ✅ Migrados a routes/doctors.py

# ============================================================================
# PATIENTS
# ============================================================================
# MIGRADO a routes/patients.py - Los siguientes 4 endpoints fueron migrados:
# - GET /api/patients
# - GET /api/patients/{patient_id}
# - POST /api/patients
# - PUT /api/patients/{patient_id}
# ✅ Migrados a routes/patients.py

# ============================================================================
# PATIENTS
# ============================================================================
# MIGRADO a routes/patients.py - Los siguientes 4 endpoints fueron migrados:
# - GET /api/patients ✅ ELIMINADO
# - GET /api/patients/{patient_id} ✅ ELIMINADO
# - POST /api/patients ✅ ELIMINADO
# - PUT /api/patients/{patient_id} ✅ ELIMINADO

# ✅ Migrados a routes/patients.py

# ============================================================================
# DASHBOARD
# ============================================================================
# MIGRADO a routes/dashboard.py - El siguiente endpoint fue migrado:
# - GET /api/dashboard/stats ✅ ELIMINADO

# ✅ Migrados a routes/dashboard.py

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

# ✅ Migrados a routes/appointments.py

# ============================================================================
# APPOINTMENTS
# ============================================================================
# MIGRADO a routes/dashboard.py - El siguiente endpoint fue migrado:
# - GET /api/dashboard/stats ✅ ELIMINADO

# ✅ Migrados a routes/dashboard.py

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

# ✅ Migrados a routes/appointments.py

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

# ✅ Migrados a routes/consultations.py

# ============================================================================
# PRESCRIPTIONS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes endpoints fueron migrados:
# - GET /api/consultations/{consultation_id}/prescriptions
# - POST /api/consultations/{consultation_id}/prescriptions
# - PUT /api/consultations/{consultation_id}/prescriptions/{prescription_id}
# - DELETE /api/consultations/{consultation_id}/prescriptions/{prescription_id}

# ✅ Migrados a routes/consultations.py

# ============================================================================
# DASHBOARD
# ============================================================================
# MIGRADO a routes/dashboard.py - El siguiente endpoint fue migrado:
# - GET /api/dashboard/stats ✅ ELIMINADO

# ✅ Migrados a routes/dashboard.py

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

# ✅ Migrados a routes/appointments.py

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

# ✅ Migrados a routes/consultations.py

# ============================================================================
# PRESCRIPTIONS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes 4 endpoints fueron migrados:
# - GET /api/consultations/{consultation_id}/prescriptions ✅ ELIMINADO
# - POST /api/consultations/{consultation_id}/prescriptions ✅ ELIMINADO
# - PUT /api/consultations/{consultation_id}/prescriptions/{prescription_id} ✅ ELIMINADO
# - DELETE /api/consultations/{consultation_id}/prescriptions/{prescription_id} ✅ ELIMINADO

# ✅ Migrados a routes/consultations.py

# ✅ Migrados a routes/consultations.py

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

# ✅ Migrados a routes/appointments.py

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

# ✅ Migrados a routes/consultations.py

# ============================================================================
# MEDICAL RECORDS
# ============================================================================
# MIGRADO a routes/consultations.py - Los siguientes 5 endpoints fueron migrados:
# - GET /api/medical-records
# - GET /api/medical-records/{record_id}
# - POST /api/medical-records
# - PUT /api/medical-records/{record_id}
# - DELETE /api/medical-records/{record_id}

# ✅ Migrados a routes/consultations.py

# ============================================================================
# SCHEDULE MANAGEMENT ENDPOINTS (continuación)
# ============================================================================
# MIGRADO a routes/schedule.py - Endpoints doctor/schedule también migrados:
# - GET /api/doctor/schedule ✅ ELIMINADO
# - PUT /api/doctor/schedule ✅ ELIMINADO
# - GET /api/doctor/availability ✅ ELIMINADO

# ✅ Migrados a routes/schedule.py

# ✅ Migrados a routes/consultations.py

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

# ✅ Migrados a routes/clinical_studies.py

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
        api_logger.error("❌ Error in get_study_recommendations", exc_info=True)
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
        api_logger.error("❌ Error in search_studies", exc_info=True)
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
        api_logger.error("❌ Error in get_critical_audit_events", exc_info=True)
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
            "patient_name": patient.name or "Paciente",
            "total": total,
            "audit_trail": result
        }
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("❌ Error in get_patient_audit_trail", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching patient audit trail: {str(e)}")

@app.get("/api/audit/stats")
async def get_audit_statistics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get audit statistics for the last N days"""
    try:
        from_date = utc_now() - timedelta(days=days)
        
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
        api_logger.error("❌ Error in get_audit_statistics", exc_info=True)
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
        # Permitir si:
        # 1. El paciente fue creado por este doctor (created_by)
        # 2. O existe una consulta entre el doctor y el paciente
        # 3. O el usuario es admin
        has_consultation = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == request_data.patient_id,
            MedicalRecord.doctor_id == current_user.id
        ).first() is not None
        
        is_patient_creator = patient.created_by == current_user.id
        
        if not has_consultation and not is_patient_creator and current_user.person_type != 'admin':
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
        
        # Desencriptar el teléfono del paciente si está encriptado
        from encryption import EncryptionService
        encryption_service = EncryptionService()
        try:
            patient_phone_decrypted = encryption_service.decrypt_sensitive_data(patient.primary_phone)
            api_logger.debug(f"Phone decrypted: {patient_phone_decrypted[:15]}...")
        except Exception as e:
            # Si falla la desencriptación, usar el número tal cual (puede no estar encriptado)
            api_logger.warning(f"Could not decrypt phone, using as-is: {str(e)}")
            patient_phone_decrypted = patient.primary_phone
        
        # Log del número que se va a usar
        api_logger.info(f"📞 Sending WhatsApp to patient phone: {patient_phone_decrypted}")
        
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
            raise HTTPException(status_code=404, detail="No hay aviso de privacidad activo. Por favor, contacta al administrador del sistema.")
        
        # URL del aviso de privacidad público
        privacy_url = "https://cortexclinico.com/privacy"
        
        # Crear registro de consentimiento PRIMERO (para tener el ID)
        consent = PrivacyConsent(
            patient_id=request_data.patient_id,
            notice_id=privacy_notice.id,
            consent_given=False,  # Pendiente hasta que el paciente responda
            consent_date=utc_now()
        )
        
        db.add(consent)
        db.commit()
        db.refresh(consent)
        
        # Enviar por WhatsApp con botón interactivo
        from whatsapp_service import get_whatsapp_service
        whatsapp = get_whatsapp_service()
        
        # Construir nombre del doctor con título separado para el template
        doctor_title = current_user.title or 'Dr.'
        doctor_full_name = current_user.name or 'Médico'
        doctor_name = f"{doctor_title} {doctor_full_name}"
        
        # Get patient first name (first word of full name)
        patient_first_name = patient.name.split()[0] if patient.name else 'Paciente'
        
        result = whatsapp.send_interactive_privacy_notice(
            patient_name=patient_first_name,
            patient_phone=patient_phone_decrypted,
            doctor_name=doctor_name,
            doctor_title=doctor_title,  # Título separado para el template
            doctor_full_name=doctor_full_name,  # Nombre completo sin título
            privacy_notice_url=privacy_url,
            consent_id=consent.id
        )
        
        api_logger.debug(f"WhatsApp result: {result}")
        
        if not result.get('success'):
            error_msg = result.get('error', 'Error desconocido')
            api_logger.warning(f"WhatsApp send failed: {error_msg}")
            
            # Si falla el envío, eliminar el consentimiento
            db.delete(consent)
            db.commit()
            
            # Detectar tipo de error y devolver código HTTP apropiado
            error_lower = str(error_msg).lower()
            if 'not configured' in error_lower or 'not configured' in error_msg:
                api_logger.info("Detected WhatsApp not configured error, returning 503")
                raise HTTPException(
                    status_code=503,
                    detail="Servicio de WhatsApp no configurado. Por favor, contacta al administrador del sistema para configurar las credenciales."
                )
            elif 'could not find a channel' in error_lower or 'channel_not_found' in error_lower or '63007' in error_msg:
                api_logger.warning("Detected WhatsApp channel not found error, returning 503")
                raise HTTPException(
                    status_code=503,
                    detail="El número de WhatsApp no está configurado en el Sandbox de Twilio. Por favor, conecta tu número de WhatsApp al Sandbox desde la consola de Twilio (Console > Messaging > WhatsApp Sandbox)."
                )
            else:
                api_logger.error(f"WhatsApp error (not configuration): {error_msg}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Error al enviar WhatsApp: {error_msg}"
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
            affected_patient_name=patient.name or "Paciente",
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
        api_logger.error("❌ Error sending privacy notice", exc_info=True)
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
    
    Security: Validates X-Hub-Signature-256 header to ensure request is from Meta
    """
    # Log inmediato al recibir el request
    api_logger.warning(
        "🚨 WEBHOOK RECEIVED: /api/webhooks/whatsapp",
        extra={
            "method": request.method,
            "url": str(request.url),
            "headers": dict(request.headers),
            "client": request.client.host if request.client else None
        }
    )
    print("=" * 80)
    print("🚨 WEBHOOK RECEIVED: /api/webhooks/whatsapp")
    print(f"Method: {request.method}")
    print(f"URL: {request.url}")
    print(f"Client: {request.client.host if request.client else None}")
    print("=" * 80)
    
    try:
        # Validate webhook signature from Meta
        import hmac
        import hashlib
        
        # Get raw body for signature validation
        raw_body = await request.body()
        
        # Get signature from header
        signature_header = request.headers.get("X-Hub-Signature-256", "")
        is_production = os.getenv("APP_ENV", "development").lower() == "production"
        
        # In production, signature validation is mandatory
        if is_production and not signature_header:
            api_logger.error("❌ WhatsApp webhook request without signature header in production")
            raise HTTPException(status_code=403, detail="Missing signature header")
        
        if signature_header:
            # Extract signature (format: sha256=<signature>)
            if not signature_header.startswith("sha256="):
                api_logger.error("❌ Invalid signature format")
                if is_production:
                    raise HTTPException(status_code=403, detail="Invalid signature format")
                else:
                    api_logger.warning("⚠️ Invalid signature format - allowing in development")
            else:
                received_signature = signature_header[7:]  # Remove "sha256=" prefix
                
                # Get app secret from environment
                app_secret = os.getenv("META_WHATSAPP_APP_SECRET")
                if not app_secret:
                    api_logger.error("❌ META_WHATSAPP_APP_SECRET not configured")
                    if is_production:
                        raise HTTPException(status_code=500, detail="Webhook secret not configured")
                    else:
                        api_logger.warning("⚠️ META_WHATSAPP_APP_SECRET not configured - skipping signature validation")
                else:
                    # Compute expected signature
                    expected_signature = hmac.new(
                        app_secret.encode('utf-8'),
                        raw_body,
                        hashlib.sha256
                    ).hexdigest()
                    
                    # Compare signatures using constant-time comparison
                    if not hmac.compare_digest(received_signature, expected_signature):
                        api_logger.error("❌ WhatsApp webhook signature validation failed")
                        raise HTTPException(status_code=403, detail="Invalid signature")
                    
                    api_logger.debug("✅ WhatsApp webhook signature validated")
        elif not is_production:
            api_logger.warning("⚠️ WhatsApp webhook request without signature header - allowing in development")
        
        # Parse body as JSON
        body = json.loads(raw_body.decode('utf-8'))
        
        if 'entry' not in body:
            return {"status": "ignored"}
        
        processed_messages = 0
        for entry in body['entry']:
            api_logger.info(
                "📥 Processing entry (alternative endpoint)",
                extra={"entry_id": entry.get("id"), "changes_count": len(entry.get('changes', []))}
            )
            
            for change in entry.get('changes', []):
                field = change.get('field')
                value = change.get('value', {})
                
                api_logger.info(
                    "🔍 Processing change (alternative endpoint)",
                    extra={
                        "field": field,
                        "value_keys": list(value.keys()) if isinstance(value, dict) else None
                    }
                )
                
                # Procesar cambios del campo 'messages'
                if field != 'messages':
                    api_logger.debug(
                        "⏭️ Skipping change - field is not 'messages'",
                        extra={"field": field}
                    )
                    continue
                
                # Procesar mensajes con botones interactivos
                messages = value.get('messages', [])
                api_logger.info(
                    "📩 Found messages in webhook (alternative endpoint)",
                    extra={"count": len(messages)}
                )
                
                for message in messages:
                    message_type = message.get('type')
                    from_phone = message.get('from')
                    timestamp = message.get('timestamp')
                    message_id = message.get('id')
                    
                    api_logger.info(
                        "📩 Processing WhatsApp message (alternative endpoint)",
                        extra={
                            "message_id": message_id,
                            "message_type": message_type,
                            "from_phone": from_phone,
                            "timestamp": timestamp
                        }
                    )
                    
                    # PROCESAR BOTÓN INTERACTIVO
                    if message_type == 'interactive':
                        interactive_data = message.get('interactive', {})
                        button_reply = interactive_data.get('button_reply', {})
                        
                        button_id = button_reply.get('id', '')
                        button_title = button_reply.get('title', '')
                        
                        # Log detallado para debugging
                        api_logger.warning(
                            "📱 WhatsApp interactive message received (alternative endpoint)",
                            extra={
                                "button_id": button_id,
                                "button_title": button_title,
                                "from_phone": from_phone,
                                "timestamp": timestamp,
                                "interactive_data": interactive_data,
                                "message": message
                            }
                        )
                        
                        security_logger.info(
                            "📱 WhatsApp consent button pressed",
                            extra={
                                "button_id": button_id,
                                "button_title": button_title,
                                "from_phone": from_phone,
                                "timestamp": timestamp
                            }
                        )
                        
                        # Extraer consent_id del button_id
                        # Formato: "accept_privacy_123"
                        parts = button_id.split('_')
                        api_logger.warning(
                            "🔍 Parsing consent button_id (alternative endpoint)",
                            extra={"button_id": button_id, "parts": parts, "parts_count": len(parts)}
                        )
                        security_logger.debug(
                            "🔍 Parsing consent button_id",
                            extra={"button_id": button_id, "parts": parts}
                        )
                        if len(parts) >= 3 and parts[0] == 'accept' and parts[1] == 'privacy':
                            consent_id = int(parts[2])
                            security_logger.debug(
                                "🔍 Extracted consent_id from button",
                                extra={"consent_id": consent_id}
                            )
                            
                            # Buscar el consentimiento
                            consent = db.query(PrivacyConsent).filter(
                                PrivacyConsent.id == consent_id
                            ).first()
                            
                            if not consent:
                                security_logger.warning(
                                    "⚠️ Consent not found for button press",
                                    extra={"consent_id": consent_id}
                                )
                                # Listar todos los consentimientos para debug
                                all_consents = db.query(PrivacyConsent).all()
                                security_logger.debug(
                                    "🔍 Existing consents in DB",
                                    extra={"consent_ids": [c.id for c in all_consents]}
                                )
                                continue
                            
                            # Obtener paciente
                            patient = db.query(Person).filter(
                                Person.id == consent.patient_id
                            ).first()
                            
                            if not patient:
                                security_logger.error(
                                    "⚠️ Patient not found while processing consent",
                                    extra={"consent_id": consent_id, "patient_id": consent.patient_id}
                                )
                                continue
                            
                            # ACEPTADO
                            api_logger.warning(
                                "✅ Updating consent to accepted (alternative endpoint)",
                                extra={
                                    "consent_id": consent_id,
                                    "patient_id": patient.id,
                                    "before_consent_given": consent.consent_given,
                                    "timestamp": timestamp
                                }
                            )
                            consent.consent_given = True
                            consent.consent_date = datetime.fromtimestamp(int(timestamp))
                            
                            db.commit()
                            db.refresh(consent)
                            
                            api_logger.warning(
                                "✅ Consent updated successfully (alternative endpoint)",
                                extra={
                                    "consent_id": consent_id,
                                    "patient_id": patient.id,
                                    "after_consent_given": consent.consent_given,
                                    "consent_date": consent.consent_date.isoformat() if consent.consent_date else None
                                }
                            )
                            
                            # Enviar confirmación
                            from whatsapp_service import get_whatsapp_service
                            whatsapp = get_whatsapp_service()
                            
                            # Get doctor from privacy notice or use default
                            doctor = db.query(Person).filter(Person.person_type == 'doctor').first()
                            
                            if doctor:
                                doctor_name = f"{doctor.title or 'Dr.'} {doctor.name}" if doctor.name else "Doctor"
                                # Get patient first name
                                patient_first_name = patient.name.split()[0] if patient.name else 'Paciente'
                                
                                whatsapp.send_text_message(
                                    to_phone=from_phone,
                                    message=f"✅ Gracias {patient_first_name}, tu consentimiento ha sido registrado correctamente.\n\n"
                                            f"Ahora {doctor_name} puede brindarte atención médica cumpliendo con la Ley de Protección de Datos.\n\n"
                                            f"Recuerda que puedes revocar tu consentimiento en cualquier momento contactando al consultorio.\n\n"
                                            f"Tus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) están garantizados."
                                )
                            
                            security_logger.info(
                                "✅ Consent accepted via WhatsApp button",
                                extra={
                                    "consent_id": consent_id,
                                    "patient_id": patient.id,
                                    "patient_name": patient.name
                                }
                            )
                            
                            # Registrar en auditoría
                            audit_service.log_action(
                                db=db,
                                action="PRIVACY_CONSENT_ACCEPTED",
                                user=None,
                                request=request,
                                operation_type="whatsapp_button_consent",
                                affected_patient_id=patient.id,
                                affected_patient_name=patient.name or "Paciente",
                                new_values={
                                    "button_id": button_id,
                                    "button_title": button_title,
                                    "consent_id": consent_id,
                                    "method": "whatsapp_button"
                                },
                                security_level='INFO'
                            )
                            processed_messages += 1
                
                # Procesar status updates (entregado, leído)
                statuses = value.get('statuses', [])
                if statuses:
                    api_logger.info(
                        "📊 Message status updates received (alternative endpoint)",
                        extra={"count": len(statuses)}
                    )
                    for status in statuses:
                        status_type = status.get('status')
                        status_message_id = status.get('id')
                        
                        api_logger.debug(
                            "📊 Processing status update",
                            extra={"status": status_type, "message_id": status_message_id}
                        )
                        
                        # Find consent by patient phone (simplified - WhatsApp message tracking removed)
                        # Note: In a real implementation, you'd need to track message_id differently
                        consent = None  # Placeholder - implement based on your needs
                        
                        if consent:
                            # WhatsApp status tracking removed - simplified schema
                            # No action needed for delivered/read status
                            db.commit()
                            security_logger.debug(
                                "📊 Consent status update received",
                                extra={"consent_id": consent.id, "status": status_type, "message_id": status_message_id}
                            )
        
        api_logger.info(
            "✅ WhatsApp webhook processed successfully (alternative endpoint)",
            extra={"processed_messages": processed_messages, "total_entries": len(body.get('entry', []))}
        )
        
        return {"status": "ok", "processed_messages": processed_messages}
        
    except Exception as e:
        security_logger.error(
            "❌ Error processing WhatsApp webhook",
            exc_info=True
        )
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
        api_logger.info("✅ WhatsApp webhook verified successfully")
        return int(challenge)
    
    api_logger.warning(
        "❌ WhatsApp webhook verification failed",
        extra={"mode": mode, "token": token}
    )
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
            # Obtener el paciente para verificar created_by
            patient = db.query(Person).filter(
                Person.id == patient_id,
                Person.person_type == 'patient'
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            
            # Permitir si:
            # 1. El paciente fue creado por este doctor (created_by)
            # 2. O existe una consulta entre el doctor y el paciente
            # 3. O el usuario es admin
            has_consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first() is not None
            
            is_patient_creator = patient.created_by == current_user.id
            
            if not has_consultation and not is_patient_creator:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Buscar consentimiento más reciente (no revocado, es decir, consent_given puede ser True o False pero debe existir)
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == patient_id
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if not consent:
            raise HTTPException(status_code=404, detail="No se encontró consentimiento para este paciente")
        
        # Si ya está revocado (consent_given = False), no hacer nada
        if not consent.consent_given:
            raise HTTPException(status_code=400, detail="El consentimiento ya está revocado")
        
        # Revocar: Set consent_given to False
        # Usar timezone CDMX para la fecha
        import pytz
        cdmx_tz = pytz.timezone('America/Mexico_City')
        consent.consent_given = False
        consent.consent_date = datetime.now(cdmx_tz)
        
        db.commit()
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='privacy_consent_revoked',
            user=current_user,
            request=request,
            table_name='privacy_consents',
            record_id=consent.id,
            new_values={'revocation_reason': revocation_reason, 'consent_given': False},
            operation_type='privacy_consent_revoke',
            affected_patient_id=patient_id,
            affected_patient_name=patient.name or "Paciente",
            security_level='WARNING',
            change_reason=revocation_reason
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
            # Obtener el paciente para verificar created_by
            patient = db.query(Person).filter(
                Person.id == patient_id,
                Person.person_type == 'patient'
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            
            # Permitir si:
            # 1. El paciente fue creado por este doctor (created_by)
            # 2. O existe una consulta entre el doctor y el paciente
            # 3. O el usuario es admin
            has_consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first() is not None
            
            is_patient_creator = patient.created_by == current_user.id
            
            if not has_consultation and not is_patient_creator:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Crear solicitud ARCO
        arco_request = ARCORequest(
            patient_id=patient_id,
            request_type=request_type,
            description=description,  # En BD es "description"
            status='pending',
            processed_by=current_user.id,  # En BD es "processed_by"
            created_at=utc_now()
        )
        
        db.add(arco_request)
        db.commit()
        db.refresh(arco_request)
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='arco_request_created',
            user=current_user,
            request=request,
            table_name='arco_requests',
            record_id=arco_request.id,
            new_values={'request_type': request_type, 'patient_id': patient_id},
            operation_type='arco_request_create',
            affected_patient_id=patient_id,
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
                "requested_at": arco_request.created_at.isoformat() if arco_request.created_at else None,
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
            # Obtener el paciente para verificar created_by
            patient = db.query(Person).filter(
                Person.id == patient_id,
                Person.person_type == 'patient'
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            
            # Permitir si:
            # 1. El paciente fue creado por este doctor (created_by)
            # 2. O existe una consulta entre el doctor y el paciente
            # 3. O el usuario es admin
            has_consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first() is not None
            
            is_patient_creator = patient.created_by == current_user.id
            
            if not has_consultation and not is_patient_creator:
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
                    "description": getattr(req, 'description', None),  # En BD es "description"
                    "status": req.status,
                    "contact_email": getattr(req, 'contact_email', None),  # Field may not exist in model
                    "contact_phone": getattr(req, 'contact_phone', None),  # Field may not exist in model
                    "requested_at": req.created_at.isoformat() if req.created_at else None,  # Usar created_at ya que request_date no existe
                    "resolved_at": req.processed_at.isoformat() if req.processed_at else None,  # En BD es "processed_at"
                    "resolution_notes": getattr(req, 'response', None),  # En BD es "response"
                    "created_at": req.created_at.isoformat(),
                    "updated_at": req.created_at.isoformat() if req.created_at else None  # No hay updated_at en BD
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
            # Obtener el paciente para verificar created_by
            patient = db.query(Person).filter(
                Person.id == arco_request.patient_id,
                Person.person_type == 'patient'
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail="Paciente no encontrado")
            
            # Permitir si:
            # 1. El paciente fue creado por este doctor (created_by)
            # 2. O existe una consulta entre el doctor y el paciente
            # 3. O el usuario es admin
            has_consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == arco_request.patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first() is not None
            
            is_patient_creator = patient.created_by == current_user.id
            
            if not has_consultation and not is_patient_creator:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Actualizar
        old_status = arco_request.status
        arco_request.status = status
        if resolution_notes:
            arco_request.response = resolution_notes  # En BD es "response"
        if status == 'completed':  # Model uses 'completed', not 'resolved'
            arco_request.processed_at = utc_now()  # En BD es "processed_at"
        
        db.commit()
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='arco_request_updated',
            user=current_user,
            request=request,
            table_name='arco_requests',
            record_id=arco_request.id,
            old_values={'status': old_status},
            new_values={'status': status, 'resolution_notes': resolution_notes} if resolution_notes else {'status': status},
            operation_type='arco_request_update',
            affected_patient_id=arco_request.patient_id,
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
                "resolution_notes": arco_request.response,  # En BD es "response"
                "resolved_at": arco_request.processed_at.isoformat() if arco_request.processed_at else None,  # En BD es "processed_at"
                "updated_at": arco_request.created_at.isoformat() if arco_request.created_at else None  # No hay updated_at en BD
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
            "short_summary": notice.short_summary,
            "effective_date": notice.effective_date.isoformat(),
            # expiration_date removed - not needed, expiration is calculated from consent_date + 365 days
            "is_active": notice.is_active,
            "created_at": notice.created_at.isoformat()  # updated_at removed - column doesn't exist in database table
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error getting public privacy notice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DATA RETENTION ENDPOINTS (LFPDPPP + NOM-004 Compliance)
# ============================================================================
# ============================================================================
# DATA RETENTION ENDPOINTS
# ============================================================================
# Data retention endpoints removed - disabled for MVP
# Service code remains in data_retention_service.py for future use
# async def get_retention_stats(
#     db: Session = Depends(get_db),
#     current_user: Person = Depends(get_current_user)
# ):
#     """
#     Get data retention statistics for the current doctor
#     """
#     try:
#         stats = retention.get_retention_stats(db, current_user.id)
#         
#         return {
#             "success": True,
#             "stats": stats,
#             "doctor_id": current_user.id
#         }
#     except Exception as e:
#         api_logger.error(f"Error getting retention stats: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/data-retention/expiring")
# async def get_expiring_records(
#     days: int = 90,
#     limit: int = 100,
#     db: Session = Depends(get_db),
#     current_user: Person = Depends(get_current_user)
# ):
#     """
#     Get records expiring within specified days
#     
#     Args:
#         days: Days threshold for expiration (default: 90)
#         limit: Maximum records to return (default: 100)
#     """
#     try:
#         records = retention.get_expiring_records(
#             db, 
#             doctor_id=current_user.id,
#             days_threshold=days,
#             limit=limit
#         )
#         
#         return {
#             "success": True,
#             "records": records,
#             "count": len(records),
#             "days_threshold": days
#         }
#     except Exception as e:
#         api_logger.error(f"Error getting expiring records: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/data-retention/anonymize/{record_id}")
# async def anonymize_record(
#     record_id: int,
#     reason: str = "manual_request",
#     strategy: str = "full",
#     db: Session = Depends(get_db),
#     current_user: Person = Depends(get_current_user)
# ):
#     """
#     Anonymize a specific medical record
#     
#     Args:
#         record_id: Medical record ID
#         reason: Reason for anonymization
#         strategy: Anonymization strategy (full, partial, pseudo)
#     """
#     try:
#         # Verify record belongs to current doctor
#         record = db.query(MedicalRecord).filter(
#             MedicalRecord.id == record_id,
#             MedicalRecord.doctor_id == current_user.id
#         ).first()
#         
#         if not record:
#             raise HTTPException(
#                 status_code=404,
#                 detail="Registro no encontrado o no autorizado"
#             )
#         
#         success = retention.anonymize_medical_record(
#             db,
#             record_id,
#             performed_by=current_user.id,
#             reason=reason,
#             strategy=strategy
#         )
#         
#         if not success:
#             raise HTTPException(
#                 status_code=400,
#                 detail="No se pudo anonimizar el registro (puede estar en retención legal)"
#             )
#         
#         return {
#             "success": True,
#             "message": "Registro anonimizado exitosamente",
#             "record_id": record_id
#         }
#         
#     except HTTPException:
#         raise
#     except Exception as e:
#         api_logger.error(f"Error anonymizing record {record_id}: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/data-retention/anonymize-expired")
# async def anonymize_expired_records_endpoint(
#     batch_size: int = 100,
#     db: Session = Depends(get_db),
#     current_user: Person = Depends(get_current_user)
# ):
#     """
#     Anonymize all expired records for current doctor
#     
#     Args:
#         batch_size: Maximum records to process (default: 100)
#     """
#     try:
#         # This endpoint processes ALL expired records for the doctor
#         # In production, this would be a scheduled job
#         
#         result = retention.anonymize_expired_records(
#             db,
#             performed_by=current_user.id,
#             batch_size=batch_size
#         )
#         
#         return {
#             "success": True,
#             "message": f"Procesados {result['total_processed']} registros",
#             **result
#         }
#         
#     except Exception as e:
#         api_logger.error(f"Error in batch anonymization: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/data-retention/archive/{record_id}")
# async def archive_record(
#     record_id: int,
#     db: Session = Depends(get_db),
#     current_user: Person = Depends(get_current_user)
# ):
#     """
#     Archive a medical record (move to cold storage)
#     """
#     try:
#         # Verify record belongs to current doctor
#         record = db.query(MedicalRecord).filter(
#             MedicalRecord.id == record_id,
#             MedicalRecord.doctor_id == current_user.id
#         ).first()
#         
#         if not record:
#             raise HTTPException(
#                 status_code=404,
#                 detail="Registro no encontrado o no autorizado"
#             )
#         
#         success = retention.archive_medical_record(
#             db,
#             record_id,
#             performed_by=current_user.id
#         )
#         
#         if not success:
#             raise HTTPException(
#                 status_code=400,
#                 detail="No se pudo archivar el registro"
#             )
#         
#         return {
#             "success": True,
#             "message": "Registro archivado exitosamente",
#             "record_id": record_id
#         }
#         
#     except HTTPException:
#         raise
#     except Exception as e:
#         api_logger.error(f"Error archiving record {record_id}: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/data-retention/legal-hold/{record_id}")
# async def set_legal_hold_endpoint(
#     record_id: int,
#     enable: bool = True,
#     reason: str = "",
#     db: Session = Depends(get_db),
#     current_user: Person = Depends(get_current_user)
# ):
#     """
#     Set or remove legal hold on a medical record
#     
#     Args:
#         record_id: Medical record ID
#         enable: True to enable hold, False to remove
#         reason: Reason for legal hold
#     """
#     try:
#         # Verify record belongs to current doctor
#         record = db.query(MedicalRecord).filter(
#             MedicalRecord.id == record_id,
#             MedicalRecord.doctor_id == current_user.id
#         ).first()
#         
#         if not record:
#             raise HTTPException(
#                 status_code=404,
#                 detail="Registro no encontrado o no autorizado"
#             )
#         
#         if enable and not reason:
#             raise HTTPException(
#                 status_code=400,
#                 detail="Se requiere especificar la razón para la retención legal"
#             )
#         
#         success = retention.set_legal_hold(
#             db,
#             record_id,
#             performed_by=current_user.id,
#             reason=reason,
#             enable=enable
#         )
#         
#         if not success:
#             raise HTTPException(
#                 status_code=400,
#                 detail="No se pudo establecer la retención legal"
#             )
#         
#         action = "activada" if enable else "removida"
#         return {
#             "success": True,
#             "message": f"Retención legal {action} exitosamente",
#             "record_id": record_id,
#             "legal_hold": enable
#         }
#         
#     except HTTPException:
#         raise
#     except Exception as e:
#         api_logger.error(f"Error setting legal hold on record {record_id}: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/data-retention/extend/{record_id}")
# async def extend_retention_endpoint(
#     record_id: int,
#     additional_years: int,
#     reason: str,
#     db: Session = Depends(get_db),
#     current_user: Person = Depends(get_current_user)
# ):
#     """
#     Extend retention period for a medical record
#     
#     Args:
#         record_id: Medical record ID
#         additional_years: Years to add to retention period
#         reason: Reason for extension
#     """
#     try:
#         # Verify record belongs to current doctor
#         record = db.query(MedicalRecord).filter(
#             MedicalRecord.id == record_id,
#             MedicalRecord.doctor_id == current_user.id
#         ).first()
#         
#         if not record:
#             raise HTTPException(
#                 status_code=404,
#                 detail="Registro no encontrado o no autorizado"
#             )
#         
#         if additional_years < 1 or additional_years > 50:
#             raise HTTPException(
#                 status_code=400,
#                 detail="El número de años debe estar entre 1 y 50"
#             )
#         
#         success = retention.extend_retention(
#             db,
#             record_id,
#             performed_by=current_user.id,
#             additional_years=additional_years,
#             reason=reason
#         )
#         
#         if not success:
#             raise HTTPException(
#                 status_code=400,
#                 detail="No se pudo extender el periodo de retención"
#             )
#         
#         return {
#             "success": True,
#             "message": f"Periodo de retención extendido por {additional_years} años",
#             "record_id": record_id,
#             "additional_years": additional_years
#         }
#         
#     except HTTPException:
#         raise
#     except Exception as e:
#         api_logger.error(f"Error extending retention for record {record_id}: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/data-retention/logs")
# async def get_retention_logs_endpoint(
#     entity_type: Optional[str] = None,
#     entity_id: Optional[int] = None,
#     action_type: Optional[str] = None,
#     limit: int = 100,
#     db: Session = Depends(get_db),
#     current_user: Person = Depends(get_current_user)
# ):
#     """
#     Get data retention action logs
#     
#     Args:
#         entity_type: Filter by entity type (optional)
#         entity_id: Filter by entity ID (optional)
#         action_type: Filter by action type (optional)
#         limit: Maximum logs to return
#     """
#     try:
#         logs = retention.get_retention_logs(
#             db,
#             entity_type=entity_type,
#             entity_id=entity_id,
#             action_type=action_type,
#             limit=limit
#         )
#         
#         return {
#             "success": True,
#             "logs": logs,
#             "count": len(logs)
#         }
#         
#     except Exception as e:
#         api_logger.error(f"Error getting retention logs: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    api_logger.info("🚀 Starting clean English API server...")
    uvicorn.run(
        "main_clean_english:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )


    api_logger.info("🚀 Starting clean English API server...")
    uvicorn.run(
        "main_clean_english:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )

