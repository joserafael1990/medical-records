"""
Custom Exception Classes for Medical Records System
Sistema de excepciones personalizadas para el manejo de errores médicos
"""
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
from enum import Enum


class ErrorCode(str, Enum):
    """Error codes for better error categorization"""
    # Patient errors
    PATIENT_NOT_FOUND = "PATIENT_NOT_FOUND"
    PATIENT_ALREADY_EXISTS = "PATIENT_ALREADY_EXISTS"
    PATIENT_INVALID_DATA = "PATIENT_INVALID_DATA"
    
    # Medical errors
    CONSULTATION_NOT_FOUND = "CONSULTATION_NOT_FOUND"
    APPOINTMENT_NOT_FOUND = "APPOINTMENT_NOT_FOUND"
    APPOINTMENT_CONFLICT = "APPOINTMENT_CONFLICT"
    MEDICAL_RECORD_INVALID = "MEDICAL_RECORD_INVALID"
    
    # Doctor errors
    DOCTOR_NOT_FOUND = "DOCTOR_NOT_FOUND"
    DOCTOR_UNAUTHORIZED = "DOCTOR_UNAUTHORIZED"
    INVALID_LICENSE = "INVALID_LICENSE"
    
    # NOM-004 compliance errors
    NOM004_VALIDATION_ERROR = "NOM004_VALIDATION_ERROR"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_CURP = "INVALID_CURP"
    INVALID_DATE_FORMAT = "INVALID_DATE_FORMAT"
    
    # Database errors
    DATABASE_ERROR = "DATABASE_ERROR"
    CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION"
    CONNECTION_ERROR = "CONNECTION_ERROR"
    
    # File handling errors
    FILE_NOT_FOUND = "FILE_NOT_FOUND"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    
    # Business logic errors
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    INVALID_OPERATION = "INVALID_OPERATION"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    
    # System errors
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    CONFIGURATION_ERROR = "CONFIGURATION_ERROR"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class MedicalSystemException(Exception):
    """Base exception for medical system"""
    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.status_code = status_code
        super().__init__(self.message)


class PatientException(MedicalSystemException):
    """Patient-related exceptions"""
    pass


class PatientNotFoundException(PatientException):
    def __init__(self, patient_id: str):
        super().__init__(
            message=f"Paciente con ID {patient_id} no encontrado",
            error_code=ErrorCode.PATIENT_NOT_FOUND,
            details={"patient_id": patient_id},
            status_code=status.HTTP_404_NOT_FOUND
        )


class PatientAlreadyExistsException(PatientException):
    def __init__(self, identifier: str, identifier_type: str = "CURP"):
        super().__init__(
            message=f"Ya existe un paciente con {identifier_type}: {identifier}",
            error_code=ErrorCode.PATIENT_ALREADY_EXISTS,
            details={identifier_type.lower(): identifier},
            status_code=status.HTTP_409_CONFLICT
        )


class MedicalRecordException(MedicalSystemException):
    """Medical record-related exceptions"""
    pass


class ConsultationNotFoundException(MedicalRecordException):
    def __init__(self, consultation_id: str):
        super().__init__(
            message=f"Consulta con ID {consultation_id} no encontrada",
            error_code=ErrorCode.CONSULTATION_NOT_FOUND,
            details={"consultation_id": consultation_id},
            status_code=status.HTTP_404_NOT_FOUND
        )


class AppointmentNotFoundException(MedicalRecordException):
    def __init__(self, appointment_id: str):
        super().__init__(
            message=f"Cita con ID {appointment_id} no encontrada",
            error_code=ErrorCode.APPOINTMENT_NOT_FOUND,
            details={"appointment_id": appointment_id},
            status_code=status.HTTP_404_NOT_FOUND
        )


class AppointmentConflictException(MedicalRecordException):
    def __init__(self, datetime_str: str, conflicting_appointment_id: str = None):
        details = {"requested_datetime": datetime_str}
        if conflicting_appointment_id:
            details["conflicting_appointment_id"] = conflicting_appointment_id
            
        super().__init__(
            message=f"Ya existe una cita programada para {datetime_str}",
            error_code=ErrorCode.APPOINTMENT_CONFLICT,
            details=details,
            status_code=status.HTTP_409_CONFLICT
        )


class ValidationException(MedicalSystemException):
    """Validation-related exceptions"""
    def __init__(
        self, 
        message: str, 
        field_errors: Optional[Dict[str, str]] = None,
        error_code: ErrorCode = ErrorCode.NOM004_VALIDATION_ERROR
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            details={"field_errors": field_errors or {}},
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )


class NOM004ValidationException(ValidationException):
    """NOM-004 compliance validation errors"""
    def __init__(self, missing_fields: List[str], invalid_fields: Dict[str, str] = None):
        field_errors = {}
        
        for field in missing_fields:
            field_errors[field] = f"Campo obligatorio según NOM-004-SSA3-2012"
            
        if invalid_fields:
            field_errors.update(invalid_fields)
            
        message = f"Datos no cumplen con NOM-004-SSA3-2012. Campos requeridos: {', '.join(missing_fields)}"
        
        super().__init__(
            message=message,
            field_errors=field_errors,
            error_code=ErrorCode.NOM004_VALIDATION_ERROR
        )


class CURPValidationException(ValidationException):
    def __init__(self, curp: str):
        super().__init__(
            message="CURP inválida. Debe tener 18 caracteres y cumplir con el formato oficial",
            field_errors={"curp": f"CURP '{curp}' no es válida"},
            error_code=ErrorCode.INVALID_CURP
        )


class DoctorException(MedicalSystemException):
    """Doctor-related exceptions"""
    pass


class DoctorNotFoundException(DoctorException):
    def __init__(self, doctor_id: str):
        super().__init__(
            message=f"Médico con ID {doctor_id} no encontrado",
            error_code=ErrorCode.DOCTOR_NOT_FOUND,
            details={"doctor_id": doctor_id},
            status_code=status.HTTP_404_NOT_FOUND
        )


class InvalidLicenseException(DoctorException):
    def __init__(self, license_number: str):
        super().__init__(
            message=f"Cédula profesional {license_number} no es válida",
            error_code=ErrorCode.INVALID_LICENSE,
            details={"license_number": license_number},
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )


class DatabaseException(MedicalSystemException):
    """Database-related exceptions"""
    def __init__(self, operation: str, details: str = None):
        super().__init__(
            message=f"Error en operación de base de datos: {operation}",
            error_code=ErrorCode.DATABASE_ERROR,
            details={"operation": operation, "details": details},
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class FileHandlingException(MedicalSystemException):
    """File handling exceptions"""
    pass


class FileTooLargeException(FileHandlingException):
    def __init__(self, file_size: int, max_size: int):
        super().__init__(
            message=f"Archivo demasiado grande ({file_size} bytes). Tamaño máximo permitido: {max_size} bytes",
            error_code=ErrorCode.FILE_TOO_LARGE,
            details={"file_size": file_size, "max_size": max_size},
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        )


class InvalidFileTypeException(FileHandlingException):
    def __init__(self, file_type: str, allowed_types: List[str]):
        super().__init__(
            message=f"Tipo de archivo no permitido: {file_type}. Tipos permitidos: {', '.join(allowed_types)}",
            error_code=ErrorCode.INVALID_FILE_TYPE,
            details={"file_type": file_type, "allowed_types": allowed_types},
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        )


class BusinessRuleException(MedicalSystemException):
    """Business rule violations"""
    def __init__(self, rule_name: str, explanation: str):
        super().__init__(
            message=f"Violación de regla de negocio: {rule_name}. {explanation}",
            error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
            details={"rule_name": rule_name, "explanation": explanation},
            status_code=status.HTTP_400_BAD_REQUEST
        )


# Helper function to convert exceptions to HTTP exceptions
def to_http_exception(exc: MedicalSystemException) -> HTTPException:
    """Convert custom exception to FastAPI HTTPException"""
    return HTTPException(
        status_code=exc.status_code,
        detail={
            "message": exc.message,
            "error_code": exc.error_code.value,
            "details": exc.details,
            "timestamp": "2024-01-01T00:00:00Z"  # Will be set by middleware
        }
    )
