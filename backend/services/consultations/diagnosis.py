"""
Diagnosis catalog utilities for consultation service
"""
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from logger import get_logger

api_logger = get_logger("medical_records.api")

def format_diagnosis_with_code(diagnosis_code: str, diagnosis_name: str) -> str:
    """
    Format diagnosis with CIE-10 code for storage
    """
    if diagnosis_code and diagnosis_name:
        return f"CIE-10: {diagnosis_code} - {diagnosis_name}"
    elif diagnosis_name:
        return diagnosis_name
    else:
        return ""

def validate_diagnosis_from_catalog(
    db: Session,
    diagnosis_id: Optional[int] = None,
    diagnosis_code: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """
    Validate that diagnosis exists in CIE-10 catalog
    """
    try:
        from models.diagnosis import DiagnosisCatalog
        
        if diagnosis_id:
            diagnosis = db.query(DiagnosisCatalog).filter(
                DiagnosisCatalog.id == diagnosis_id,
                DiagnosisCatalog.is_active == True
            ).first()
        elif diagnosis_code:
            diagnosis = db.query(DiagnosisCatalog).filter(
                DiagnosisCatalog.code == diagnosis_code,
                DiagnosisCatalog.is_active == True
            ).first()
        else:
            return None
        
        if diagnosis:
            return {
                "id": diagnosis.id,
                "code": diagnosis.code,
                "name": diagnosis.name,
                "description": diagnosis.name
            }
        return None
    except Exception as e:
        api_logger.error("Error validating diagnosis", error=str(e), exc_info=True)
        return None

def format_diagnoses_from_catalog(
    db: Session,
    primary_diagnoses: Optional[List[Dict[str, Any]]] = None,
    secondary_diagnoses: Optional[List[Dict[str, Any]]] = None
) -> tuple[str, str]:
    """
    Format diagnoses from catalog for storage in text fields
    """
    primary_text = ""
    secondary_text = ""
    
    # Format primary diagnosis
    if primary_diagnoses and len(primary_diagnoses) > 0:
        primary = primary_diagnoses[0]
        diagnosis_id = primary.get("id")
        diagnosis_code = primary.get("code", "")
        diagnosis_name = primary.get("name", "")
        
        validated = validate_diagnosis_from_catalog(db, diagnosis_id, diagnosis_code)
        if validated:
            primary_text = format_diagnosis_with_code(validated["code"], validated["name"])
        elif diagnosis_code and diagnosis_name:
            primary_text = format_diagnosis_with_code(diagnosis_code, diagnosis_name)
        elif diagnosis_name:
            primary_text = diagnosis_name
    
    # Format secondary diagnoses
    if secondary_diagnoses and len(secondary_diagnoses) > 0:
        secondary_list = []
        for diagnosis in secondary_diagnoses:
            diagnosis_id = diagnosis.get("id")
            diagnosis_code = diagnosis.get("code", "")
            diagnosis_name = diagnosis.get("name", "")
            
            validated = validate_diagnosis_from_catalog(db, diagnosis_id, diagnosis_code)
            if validated:
                secondary_list.append(format_diagnosis_with_code(validated["code"], validated["name"]))
            elif diagnosis_code and diagnosis_name:
                secondary_list.append(format_diagnosis_with_code(diagnosis_code, diagnosis_name))
            elif diagnosis_name:
                secondary_list.append(diagnosis_name)
        
        secondary_text = "; ".join(secondary_list)
    
    return primary_text, secondary_text
