#!/usr/bin/env python3
"""
Clean English API for Historias Clínicas
All endpoints standardized in English
No legacy code - completely fresh implementation
"""

from fastapi import FastAPI, Depends, HTTPException, Query, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import pytz
import os
import asyncio
import time
from collections import defaultdict, deque
from pathlib import Path

from database import get_db, Person
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

# ============================================================================
# LOGGING SETUP
# ============================================================================

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
# Debug endpoints have been removed for security (no authentication)


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

# Include prescriptions routes
from routes.prescriptions import router as prescriptions_router
app.include_router(prescriptions_router)

# Include analytics routes
from routes.analytics import router as analytics_router
app.include_router(analytics_router)

# Include admin routes (encryption status, catalog status, system status)
from routes.admin import router as admin_router
app.include_router(admin_router)

# Include compliance routes (compliance reports)
from routes.compliance import router as compliance_router
app.include_router(compliance_router)

# Include whatsapp routes
from routes.whatsapp import router as whatsapp_router
app.include_router(whatsapp_router)

# Include google calendar routes
from routes.google_calendar import router as google_calendar_router
app.include_router(google_calendar_router)

# Include audit routes
from routes.audit import router as audit_router
app.include_router(audit_router)

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


