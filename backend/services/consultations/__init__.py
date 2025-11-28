"""
Consultation service utilities package
Re-exports all consultation-related helper functions
"""

# Timezone utilities
from .timezone_utils import now_cdmx, cdmx_datetime

# Security utilities
from .security import (
    encrypt_sensitive_data,
    decrypt_sensitive_data,
    sign_medical_document
)

# Decryption helpers
from .decryption import (
    decrypt_patient_data,
    decrypt_consultation_data
)

# Formatting utilities
from .formatting import (
    format_patient_name,
    format_doctor_name
)

# Data retrieval
from .data_retrieval import (
    get_consultation_vital_signs,
    get_consultation_prescriptions,
    get_consultation_clinical_studies,
    get_patient_info
)

# Response builders
from .response_builders import (
    build_consultation_response,
    build_create_consultation_response
)

# Diagnosis utilities
from .diagnosis import (
    format_diagnosis_with_code,
    validate_diagnosis_from_catalog,
    format_diagnoses_from_catalog
)

# Creation helpers
from .creation_helpers import (
    encrypt_consultation_fields,
    parse_consultation_date,
    create_medical_record_object,
    prepare_consultation_for_signing,
    mark_appointment_completed
)

__all__ = [
    # Timezone
    'now_cdmx',
    'cdmx_datetime',
    # Security
    'encrypt_sensitive_data',
    'decrypt_sensitive_data',
    'sign_medical_document',
    # Decryption
    'decrypt_patient_data',
    'decrypt_consultation_data',
    # Formatting
    'format_patient_name',
    'format_doctor_name',
    # Data retrieval
    'get_consultation_vital_signs',
    'get_consultation_prescriptions',
    'get_consultation_clinical_studies',
    'get_patient_info',
    # Response builders
    'build_consultation_response',
    'build_create_consultation_response',
    # Diagnosis
    'format_diagnosis_with_code',
    'validate_diagnosis_from_catalog',
    'format_diagnoses_from_catalog',
    # Creation helpers
    'encrypt_consultation_fields',
    'parse_consultation_date',
    'create_medical_record_object',
    'prepare_consultation_for_signing',
    'mark_appointment_completed',
]
