"""
Phone number matching utilities for WhatsApp integration
"""
from typing import Optional, List
from sqlalchemy.orm import Session
from database import Person
from whatsapp_service import get_whatsapp_service
from logger import get_logger

api_logger = get_logger("medical_records.api")

def find_patient_by_phone(phone: str, db: Session, patients: Optional[List[Person]] = None) -> Optional[Person]:
    """
    Find a patient by phone number with normalization and alternative formats
    """
    whatsapp = get_whatsapp_service()
    normalized_from_phone = whatsapp._format_phone_number(phone)
    
    # If patients list not provided, query all patients
    if patients is None:
        patients = db.query(Person).filter(
            Person.person_type == 'patient',
            Person.primary_phone.isnot(None)
        ).all()
    
    for candidate in patients:
        normalized_candidate_phone = whatsapp._format_phone_number(candidate.primary_phone)
        
        # Direct match
        if normalized_candidate_phone == normalized_from_phone:
            return candidate
        
        # Alternative format with 521 vs 52
        alternate_candidate_phone = normalized_candidate_phone.replace("521", "52") if normalized_candidate_phone.startswith("521") else normalized_candidate_phone
        alternate_from_phone = normalized_from_phone.replace("521", "52") if normalized_from_phone.startswith("521") else normalized_from_phone
        
        if (normalized_candidate_phone == alternate_from_phone or
            alternate_candidate_phone == normalized_from_phone):
            return candidate
    
    return None

def mask_phone(phone: Optional[str]) -> str:
    """Return a masked version of the phone number for logging."""
    if not phone:
        return "N/A"
    trimmed = phone[-4:]
    masked_prefix = "*" * max(len(phone) - len(trimmed), 0)
    return f"{masked_prefix}{trimmed}"
