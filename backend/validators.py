"""
Validation Functions for Medical Records System
Funciones de validación para el sistema de historias clínicas conforme a NOM-004
"""
import re
import json
import os
from datetime import datetime, date
from typing import Dict, List, Any, Optional
from exceptions import (
    ValidationException, NOM004ValidationException, 
    CURPValidationException, BusinessRuleException,
    ErrorCode
)

# Load shared validation schemas
def load_validation_schemas():
    """Load validation schemas from shared JSON file"""
    schema_path = os.path.join(os.path.dirname(__file__), '../shared_validation_schemas.json')
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback to embedded schemas if file not found
        return {
            "patterns": {
                "curp": "^[A-Z]{4}\\d{6}[HM][A-Z]{5}[A-Z0-9]\\d$",
                "email": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
                "phone_mexico": "^(\\+52\\s?)?(\\d{10}|\\d{3}\\s?\\d{3}\\s?\\d{4})$",
                "professional_license": "^\\d{7,8}$",
                "postal_code_mexico": "^\\d{5}$"
            },
            "nom004_required_fields": {
                "patient": [
                    "first_name", "paternal_surname", "maternal_surname",
                    "birth_date", "gender", "address"
                ],
                "consultation": [
                    "patient_id", "chief_complaint", "history_present_illness",
                    "family_history", "personal_pathological_history",
                    "personal_non_pathological_history", "physical_examination",
                    "primary_diagnosis", "treatment_plan", "follow_up_instructions"
                ]
            }
        }

# Load schemas
VALIDATION_SCHEMAS = load_validation_schemas()

# Extract patterns and required fields
VALIDATION_PATTERNS = {
    key: re.compile(pattern) 
    for key, pattern in VALIDATION_SCHEMAS["patterns"].items()
}

NOM004_REQUIRED_PATIENT_FIELDS = VALIDATION_SCHEMAS["nom004_required_fields"]["patient"]
NOM004_REQUIRED_CONSULTATION_FIELDS = VALIDATION_SCHEMAS["nom004_required_fields"]["consultation"]

def validate_curp(curp: str) -> bool:
    """Validate Mexican CURP (Clave Única de Registro de Población)"""
    if not curp or len(curp) != 18:
        return False
    
    curp = curp.upper()
    
    # Basic pattern validation
    if not VALIDATION_PATTERNS['curp'].match(curp):
        return False
    
    # Additional validation logic could be added here
    # (checksum validation, valid state codes, etc.)
    
    return True

def validate_email(email: str) -> bool:
    """Validate email format"""
    return bool(email and VALIDATION_PATTERNS['email'].match(email))

def validate_phone(phone: str) -> bool:
    """Validate Mexican phone number"""
    if not phone:
        return False
    
    # Remove spaces and special characters
    clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
    
    return bool(VALIDATION_PATTERNS['phone_mexico'].match(clean_phone))

def validate_professional_license(license_number: str) -> bool:
    """Validate professional license (cédula profesional)"""
    return bool(license_number and VALIDATION_PATTERNS['professional_license'].match(license_number))

def validate_date_string(date_str: str) -> bool:
    """Validate date string format"""
    try:
        if isinstance(date_str, str):
            datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return True
    except ValueError:
        return False

def validate_age_range(birth_date: date, min_age: int = 0, max_age: int = 150) -> bool:
    """Validate age is within reasonable range"""
    today = date.today()
    age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
    return min_age <= age <= max_age

def validate_nom004_patient_data(patient_data: Dict[str, Any]) -> None:
    """
    Validate patient data according to NOM-004-SSA3-2012 requirements
    Raises ValidationException if data doesn't comply
    """
    missing_fields = []
    invalid_fields = {}
    
    # Check required fields
    for field in NOM004_REQUIRED_PATIENT_FIELDS:
        if field not in patient_data or not patient_data[field]:
            missing_fields.append(field)
    
    # Validate field formats
    if 'birth_date' in patient_data and patient_data['birth_date']:
        if isinstance(patient_data['birth_date'], str):
            if not validate_date_string(patient_data['birth_date']):
                invalid_fields['birth_date'] = 'Formato de fecha inválido'
        elif isinstance(patient_data['birth_date'], date):
            if not validate_age_range(patient_data['birth_date']):
                invalid_fields['birth_date'] = 'Edad fuera del rango válido (0-150 años)'
    
    if 'curp' in patient_data and patient_data['curp']:
        if not validate_curp(patient_data['curp']):
            invalid_fields['curp'] = 'CURP inválida - debe tener 18 caracteres con formato correcto'
    
    if 'email' in patient_data and patient_data['email']:
        if not validate_email(patient_data['email']):
            invalid_fields['email'] = 'Formato de correo electrónico inválido'
    
    if 'phone' in patient_data and patient_data['phone']:
        if not validate_phone(patient_data['phone']):
            invalid_fields['phone'] = 'Número telefónico inválido - debe tener 10 dígitos'
    
    if 'gender' in patient_data and patient_data['gender']:
        valid_genders = ['masculino', 'femenino', 'otro']
        if patient_data['gender'].lower() not in valid_genders:
            invalid_fields['gender'] = f'Género debe ser uno de: {", ".join(valid_genders)}'
    
    # Raise exception if validation fails
    if missing_fields or invalid_fields:
        raise NOM004ValidationException(missing_fields, invalid_fields)

def validate_nom004_consultation_data(consultation_data: Dict[str, Any]) -> None:
    """
    Validate consultation data according to NOM-004-SSA3-2012 requirements
    """
    missing_fields = []
    invalid_fields = {}
    
    # Check required fields
    for field in NOM004_REQUIRED_CONSULTATION_FIELDS:
        if field not in consultation_data or not consultation_data[field]:
            missing_fields.append(field)
    
    # Validate consultation date
    if 'date' in consultation_data and consultation_data['date']:
        if isinstance(consultation_data['date'], str):
            if not validate_date_string(consultation_data['date']):
                invalid_fields['date'] = 'Formato de fecha de consulta inválido'
    
    # Validate doctor information
    if 'doctor_professional_license' in consultation_data:
        license_num = consultation_data['doctor_professional_license']
        if license_num and license_num != 'AGENDA-SYSTEM-001':  # Skip validation for system-generated
            if not validate_professional_license(license_num):
                invalid_fields['doctor_professional_license'] = 'Cédula profesional inválida'
    
    # Validate minimum content length for critical fields
    min_length_fields = {
        'chief_complaint': 5,
        'physical_examination': 10,
        'primary_diagnosis': 5,
        'treatment_plan': 10
    }
    
    for field, min_length in min_length_fields.items():
        if field in consultation_data and consultation_data[field]:
            if len(str(consultation_data[field]).strip()) < min_length:
                invalid_fields[field] = f'Debe tener al menos {min_length} caracteres'
    
    # Raise exception if validation fails
    if missing_fields or invalid_fields:
        raise NOM004ValidationException(missing_fields, invalid_fields)

def validate_appointment_data(appointment_data: Dict[str, Any]) -> None:
    """Validate appointment data"""
    missing_fields = []
    invalid_fields = {}
    
    # Required fields for appointments
    required_fields = ['patient_id', 'appointment_date', 'reason', 'appointment_type']
    
    for field in required_fields:
        if field not in appointment_data or not appointment_data[field]:
            missing_fields.append(field)
    
    # Validate appointment date
    if 'appointment_date' in appointment_data and appointment_data['appointment_date']:
        if isinstance(appointment_data['appointment_date'], str):
            if not validate_date_string(appointment_data['appointment_date']):
                invalid_fields['appointment_date'] = 'Formato de fecha inválido'
        elif isinstance(appointment_data['appointment_date'], datetime):
            # Check if appointment is in the past (with some tolerance)
            now = datetime.now()
            if appointment_data['appointment_date'] < now:
                # Allow appointments up to 1 hour in the past (for scheduling flexibility)
                tolerance_hours = 1
                if (now - appointment_data['appointment_date']).total_seconds() > tolerance_hours * 3600:
                    invalid_fields['appointment_date'] = 'No se pueden programar citas en el pasado'
    
    # Validate duration
    if 'duration_minutes' in appointment_data:
        duration = appointment_data['duration_minutes']
        if duration and (duration < 5 or duration > 480):  # 5 minutes to 8 hours
            invalid_fields['duration_minutes'] = 'Duración debe estar entre 5 minutos y 8 horas'
    
    # Validate appointment type
    if 'appointment_type' in appointment_data and appointment_data['appointment_type']:
        valid_types = ['consultation', 'follow_up', 'emergency', 'routine_check']
        if appointment_data['appointment_type'] not in valid_types:
            invalid_fields['appointment_type'] = f'Tipo debe ser uno de: {", ".join(valid_types)}'
    
    # Validate status
    if 'status' in appointment_data and appointment_data['status']:
        valid_statuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
        if appointment_data['status'] not in valid_statuses:
            invalid_fields['status'] = f'Estado debe ser uno de: {", ".join(valid_statuses)}'
    
    if missing_fields or invalid_fields:
        raise ValidationException(
            message="Datos de cita inválidos",
            field_errors={**{field: "Campo obligatorio" for field in missing_fields}, **invalid_fields}
        )

def validate_doctor_profile_data(doctor_data: Dict[str, Any]) -> None:
    """Validate doctor profile data"""
    missing_fields = []
    invalid_fields = {}
    
    # Required fields for doctor profile
    required_fields = [
        'first_name', 'paternal_surname', 'email', 'phone', 'birth_date',
        'professional_license', 'specialty', 'university', 'graduation_year',
        'office_address', 'office_city', 'office_state'
    ]
    
    for field in required_fields:
        if field not in doctor_data or not doctor_data[field]:
            missing_fields.append(field)
    
    # Validate specific fields
    if 'email' in doctor_data and doctor_data['email']:
        if not validate_email(doctor_data['email']):
            invalid_fields['email'] = 'Formato de correo electrónico inválido'
    
    if 'phone' in doctor_data and doctor_data['phone']:
        if not validate_phone(doctor_data['phone']):
            invalid_fields['phone'] = 'Número telefónico inválido'
    
    if 'professional_license' in doctor_data and doctor_data['professional_license']:
        if not validate_professional_license(doctor_data['professional_license']):
            invalid_fields['professional_license'] = 'Cédula profesional inválida'
    
    if 'birth_date' in doctor_data and doctor_data['birth_date']:
        if isinstance(doctor_data['birth_date'], str):
            if not validate_date_string(doctor_data['birth_date']):
                invalid_fields['birth_date'] = 'Formato de fecha inválido'
        elif isinstance(doctor_data['birth_date'], date):
            if not validate_age_range(doctor_data['birth_date'], min_age=18, max_age=80):
                invalid_fields['birth_date'] = 'Edad fuera del rango válido para médicos (18-80 años)'
    
    if 'graduation_year' in doctor_data and doctor_data['graduation_year']:
        try:
            year = int(doctor_data['graduation_year'])
            current_year = datetime.now().year
            if year < 1950 or year > current_year:
                invalid_fields['graduation_year'] = f'Año de graduación debe estar entre 1950 y {current_year}'
        except ValueError:
            invalid_fields['graduation_year'] = 'Año de graduación debe ser un número válido'
    
    if missing_fields or invalid_fields:
        raise ValidationException(
            message="Datos del perfil médico inválidos",
            field_errors={**{field: "Campo obligatorio" for field in missing_fields}, **invalid_fields}
        )

def validate_clinical_study_data(study_data: Dict[str, Any]) -> None:
    """Validate clinical study data"""
    missing_fields = []
    invalid_fields = {}
    
    # Required fields
    required_fields = ['patient_id', 'study_type', 'study_name', 'ordered_date', 'ordering_doctor']
    
    for field in required_fields:
        if field not in study_data or not study_data[field]:
            missing_fields.append(field)
    
    # Validate dates
    date_fields = ['ordered_date', 'performed_date', 'results_date']
    for field in date_fields:
        if field in study_data and study_data[field]:
            if isinstance(study_data[field], str):
                if not validate_date_string(study_data[field]):
                    invalid_fields[field] = f'Formato de fecha inválido en {field}'
    
    # Validate study type
    if 'study_type' in study_data and study_data['study_type']:
        valid_types = ['laboratory', 'radiology', 'pathology', 'cardiology', 'endoscopy', 'biopsy', 'cytology', 'microbiology', 'genetics', 'other']
        if study_data['study_type'] not in valid_types:
            invalid_fields['study_type'] = f'Tipo de estudio debe ser uno de: {", ".join(valid_types)}'
    
    # Validate status
    if 'status' in study_data and study_data['status']:
        valid_statuses = ['pending', 'in_progress', 'completed', 'cancelled']
        if study_data['status'] not in valid_statuses:
            invalid_fields['status'] = f'Estado debe ser uno de: {", ".join(valid_statuses)}'
    
    if missing_fields or invalid_fields:
        raise ValidationException(
            message="Datos del estudio clínico inválidos",
            field_errors={**{field: "Campo obligatorio" for field in missing_fields}, **invalid_fields}
        )

# Business rule validators
def validate_appointment_time_conflict(db, appointment_date: datetime, appointment_id: Optional[str] = None):
    """Check for appointment time conflicts"""
    # This would check against existing appointments in the database
    # Implementation depends on your appointment service
    pass

def validate_patient_age_for_procedure(patient_birth_date: date, procedure_type: str):
    """Validate patient age is appropriate for certain procedures"""
    today = date.today()
    age = today.year - patient_birth_date.year - ((today.month, today.day) < (patient_birth_date.month, patient_birth_date.day))
    
    # Example business rules
    if procedure_type == 'pediatric' and age >= 18:
        raise BusinessRuleException(
            "pediatric_age_limit",
            "Los procedimientos pediátricos están limitados a pacientes menores de 18 años"
        )
    
    if procedure_type == 'geriatric' and age < 65:
        raise BusinessRuleException(
            "geriatric_age_limit", 
            "Los procedimientos geriátricos están dirigidos a pacientes de 65 años o más"
        )

# Utility function to clean and format data
def clean_patient_data(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """Clean and format patient data"""
    cleaned_data = patient_data.copy()
    
    # Clean phone number
    if 'phone' in cleaned_data and cleaned_data['phone']:
        phone = re.sub(r'[\s\-\(\)]', '', str(cleaned_data['phone']))
        cleaned_data['phone'] = phone
    
    # Uppercase CURP
    if 'curp' in cleaned_data and cleaned_data['curp']:
        cleaned_data['curp'] = str(cleaned_data['curp']).upper()
    
    # Lowercase email
    if 'email' in cleaned_data and cleaned_data['email']:
        cleaned_data['email'] = str(cleaned_data['email']).lower().strip()
    
    # Capitalize names
    name_fields = ['first_name', 'paternal_surname', 'maternal_surname']
    for field in name_fields:
        if field in cleaned_data and cleaned_data[field]:
            cleaned_data[field] = str(cleaned_data[field]).title().strip()
    
    return cleaned_data
