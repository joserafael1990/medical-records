"""
Error Handling Middleware for Medical Records System
Middleware para manejo centralizado de errores
"""
import logging
import traceback
import uuid
from datetime import datetime
from typing import Dict, Any
from utils.datetime_utils import utc_now
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import IntegrityError, OperationalError, SQLAlchemyError
from pydantic import ValidationError

from exceptions import (
    MedicalSystemException, 
    DatabaseException, 
    ValidationException,
    ErrorCode,
    to_http_exception
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware para manejo centralizado de errores
    - Captura todas las excepciones no manejadas
    - Registra errores con contexto completo
    - Devuelve respuestas JSON estructuradas
    - Oculta detalles internos en producción
    """
    
    def __init__(self, app, debug: bool = False):
        super().__init__(app)
        self.debug = debug
    
    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID for tracking
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        try:
            response = await call_next(request)
            return response
            
        except Exception as exc:
            return await self.handle_exception(request, exc, request_id)
    
    async def handle_exception(self, request: Request, exc: Exception, request_id: str) -> JSONResponse:
        """Handle different types of exceptions"""
        
        # Get client IP and user agent for logging
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Common error context
        error_context = {
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "timestamp": utc_now().isoformat()
        }
        
        # Handle custom medical system exceptions
        if isinstance(exc, MedicalSystemException):
            return await self.handle_medical_exception(exc, error_context)
        
        # Handle database exceptions
        elif isinstance(exc, SQLAlchemyError):
            return await self.handle_database_exception(exc, error_context)
        
        # Handle validation exceptions
        elif isinstance(exc, ValidationError):
            return await self.handle_validation_exception(exc, error_context)
        
        # Handle HTTP exceptions
        elif isinstance(exc, HTTPException):
            return await self.handle_http_exception(exc, error_context)
        
        # Handle unexpected exceptions
        else:
            return await self.handle_unexpected_exception(exc, error_context)
    
    async def handle_medical_exception(
        self, 
        exc: MedicalSystemException, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle custom medical system exceptions"""
        
        # Log the error with context
        logger.warning(
            f"Medical system error: {exc.error_code.value}",
            extra={
                **context,
                "error_code": exc.error_code.value,
                "message": exc.message,
                "details": exc.details
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "message": exc.message,
                "error_code": exc.error_code.value,
                "details": exc.details,
                "request_id": context["request_id"],
                "timestamp": context["timestamp"]
            }
        )
    
    async def handle_database_exception(
        self, 
        exc: SQLAlchemyError, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle database-related exceptions"""
        
        # Log the full error for debugging
        logger.error(
            f"Database error: {str(exc)}",
            extra={
                **context,
                "exception_type": type(exc).__name__,
                "traceback": traceback.format_exc() if self.debug else None
            }
        )
        
        # Determine specific error type
        if isinstance(exc, IntegrityError):
            message = "Error de integridad de datos. Verifica que no existan duplicados."
            error_code = ErrorCode.CONSTRAINT_VIOLATION
            status_code = 409
        elif isinstance(exc, OperationalError):
            message = "Error de conexión con la base de datos. Intenta más tarde."
            error_code = ErrorCode.CONNECTION_ERROR
            status_code = 503
        else:
            message = "Error interno de base de datos."
            error_code = ErrorCode.DATABASE_ERROR
            status_code = 500
        
        return JSONResponse(
            status_code=status_code,
            content={
                "error": True,
                "message": message,
                "error_code": error_code.value,
                "details": {"database_error": True},
                "request_id": context["request_id"],
                "timestamp": context["timestamp"]
            }
        )
    
    async def handle_validation_exception(
        self, 
        exc: ValidationError, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle Pydantic validation exceptions"""
        
        # Extract field errors
        field_errors = {}
        for error in exc.errors():
            field_name = ".".join(str(loc) for loc in error["loc"])
            field_errors[field_name] = error["msg"]
        
        logger.warning(
            f"Validation error: {len(field_errors)} field(s)",
            extra={
                **context,
                "field_errors": field_errors
            }
        )
        
        return JSONResponse(
            status_code=422,
            content={
                "error": True,
                "message": "Datos de entrada inválidos",
                "error_code": ErrorCode.NOM004_VALIDATION_ERROR.value,
                "details": {
                    "field_errors": field_errors,
                    "validation_error": True
                },
                "request_id": context["request_id"],
                "timestamp": context["timestamp"]
            }
        )
    
    async def handle_http_exception(
        self, 
        exc: HTTPException, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""
        
        logger.warning(
            f"HTTP exception: {exc.status_code}",
            extra={
                **context,
                "status_code": exc.status_code,
                "detail": exc.detail
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "message": str(exc.detail) if exc.detail else "Error HTTP",
                "error_code": ErrorCode.UNKNOWN_ERROR.value,
                "details": {"http_error": True},
                "request_id": context["request_id"],
                "timestamp": context["timestamp"]
            }
        )
    
    async def handle_unexpected_exception(
        self, 
        exc: Exception, 
        context: Dict[str, Any]
    ) -> JSONResponse:
        """Handle unexpected exceptions"""
        
        # Log the full error with traceback
        logger.error(
            f"Unexpected error: {type(exc).__name__}: {str(exc)}",
            extra={
                **context,
                "exception_type": type(exc).__name__,
                "traceback": traceback.format_exc()
            }
        )
        
        # In production, don't expose internal error details
        if self.debug:
            message = f"Error interno: {str(exc)}"
            details = {
                "exception_type": type(exc).__name__,
                "traceback": traceback.format_exc()
            }
        else:
            message = "Error interno del servidor. El equipo técnico ha sido notificado."
            details = {"internal_error": True}
        
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "message": message,
                "error_code": ErrorCode.UNKNOWN_ERROR.value,
                "details": details,
                "request_id": context["request_id"],
                "timestamp": context["timestamp"]
            }
        )


# Request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all incoming requests for debugging and monitoring"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = utc_now()
        
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path}",
            extra={
                "method": request.method,
                "path": request.url.path,
                "query_params": dict(request.query_params),
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", "unknown")
            }
        )
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = (utc_now() - start_time).total_seconds()
        
        # Log response
        logger.info(
            f"Response: {response.status_code} in {duration:.3f}s",
            extra={
                "status_code": response.status_code,
                "duration_seconds": duration,
                "request_id": getattr(request.state, 'request_id', 'unknown')
            }
        )
        
        return response


# Error reporting utilities
class ErrorReporter:
    """Utility class for error reporting and monitoring"""
    
    @staticmethod
    def report_critical_error(
        error: Exception, 
        context: Dict[str, Any], 
        notify_admin: bool = True
    ):
        """Report critical errors that require immediate attention"""
        
        critical_error = {
            "level": "CRITICAL",
            "error": str(error),
            "type": type(error).__name__,
            "context": context,
            "timestamp": utc_now().isoformat(),
            "traceback": traceback.format_exc()
        }
        
        # Log critical error
        logger.critical("CRITICAL ERROR DETECTED", extra=critical_error)
        
        # In production, you would send this to:
        # - Error monitoring service (Sentry, Rollbar, etc.)
        # - Email/SMS alerts to administrators
        # - Slack/Teams notifications
        
        if notify_admin:
            # Placeholder for admin notification
            logger.error("ADMIN NOTIFICATION: Critical error requires attention")
    
    @staticmethod
    def get_error_stats() -> Dict[str, Any]:
        """Get error statistics for monitoring dashboard"""
        # In production, this would query a metrics database
        return {
            "total_errors_24h": 0,
            "critical_errors_24h": 0,
            "most_common_errors": [],
            "error_rate_percentage": 0.0
        }


# Health check utilities
async def health_check_with_error_info() -> Dict[str, Any]:
    """Enhanced health check that includes error statistics"""
    return {
        "status": "healthy",
        "timestamp": utc_now().isoformat(),
        "error_stats": ErrorReporter.get_error_stats(),
        "database_status": "connected",  # Check actual DB connection
        "timezone": "America/Mexico_City"
    }
