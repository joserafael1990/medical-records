"""
Formatting utilities for consultation service
"""
from typing import Dict, Optional
from database import Person

def format_patient_name(decrypted_data: Dict[str, str]) -> str:
    """
    Format patient name from decrypted data
    """
    name = decrypted_data.get("name", "")
    return name.strip() or "Paciente No Identificado"


def format_doctor_name(doctor: Optional[Person]) -> str:
    """
    Format doctor name
    """
    if not doctor:
        return "Doctor"
    return doctor.name
