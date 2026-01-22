"""
CRUD operations re-export (Legacy Support)
This file now re-exports functions from the backend/crud/ package.
Please import directly from backend.crud in new code.
"""

from crud import (
    get_cdmx_now, to_utc_for_storage, hash_password, verify_password,
    parse_phone_with_country_code, build_phone, CDMX_TZ,
    get_countries, get_states, get_specialties, get_emergency_relationships,
    get_paises, get_estados,
    get_study_categories, get_study_category, get_study_catalog,
    get_study_by_id, get_study_recommendations, search_studies,
    generate_person_code, create_person, create_doctor_safe, update_doctor_profile,
    create_patient_with_code, create_patient, get_person, get_person_by_code,
    get_person_by_curp, get_person_by_email, get_persons, get_doctors,
    get_patients, get_patients_by_doctor, update_person, delete_person,
    search_persons, authenticate_user, create_user, change_password,
    get_document_types, get_documents_by_type, get_documents,
    get_person_documents, upsert_person_document, delete_person_document,
    create_medical_record, get_medical_record, get_medical_records_by_patient,
    get_medical_records_by_doctor, update_medical_record,
    create_appointment, get_appointment, get_appointments_by_patient,
    get_appointments_by_doctor, update_appointment, cancel_appointment,
    get_dashboard_stats,
    create_license, get_license_by_doctor, get_all_licenses,
    update_license, check_license_status
)

# Re-export logger for compatibility
from logger import get_logger
api_logger = get_logger("medical_records.api")
