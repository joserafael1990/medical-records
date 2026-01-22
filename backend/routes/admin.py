"""
Administrative endpoints for system monitoring and configuration
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from database import get_db
from dependencies import get_current_user
from config import settings

# Temporary authentication bypass for development
def get_current_user_dev():
    """Temporary function to bypass authentication during development"""
    return None
from encryption import get_encryption_service
from logger import get_logger
from data_retention_service import get_retention_stats, get_expiring_records

api_logger = get_logger("medical_records.api")

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/encryption-status")
async def get_encryption_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_dev)
) -> Dict[str, Any]:
    """
    Get encryption status and configuration
    Compliance: NOM-035-SSA3-2012 - Encryption status verification
    """
    try:
        # Check if encryption is enabled
        encryption_enabled = settings.ENABLE_ENCRYPTION
        
        # Check if encryption key is configured
        encryption_key_configured = settings.MEDICAL_ENCRYPTION_KEY is not None
        
        # Try to get encryption service
        encryption_service_available = False
        encryption_algorithm = None
        key_derivation = None
        
        try:
            encryption_service = get_encryption_service()
            encryption_service_available = True
            encryption_algorithm = "AES-256-GCM"
            key_derivation = "PBKDF2-SHA256"
        except Exception as e:
            api_logger.warning(f"Encryption service not available: {str(e)}")
        
        # Get database statistics
        from database import Person, MedicalRecord
        total_patients = db.query(Person).filter(Person.person_type == "patient").count()
        total_doctors = db.query(Person).filter(Person.person_type == "doctor").count()
        total_consultations = db.query(MedicalRecord).count()
        
        # Determine compliance status
        compliance_status = "NOM-035 Compliant" if encryption_enabled and encryption_key_configured else "NOM-035 Not Compliant (Encryption Disabled)"
        
        return {
            "encryption_enabled": encryption_enabled,
            "encryption_key_configured": encryption_key_configured,
            "encryption_service_available": encryption_service_available,
            "encryption_algorithm": encryption_algorithm,
            "key_derivation": key_derivation,
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_consultations": total_consultations,
            "compliance_status": compliance_status,
            "environment": settings.APP_ENV,
            "note": "Encryption is disabled in development by default. Set ENABLE_ENCRYPTION=true and MEDICAL_ENCRYPTION_KEY in environment variables to enable encryption."
        }
    
    except Exception as e:
        api_logger.error(f"Error getting encryption status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving encryption status"
        )


@router.get("/doctors")
async def get_doctors(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get list of all doctors"""
    try:
        from database import Person
        doctors = db.query(Person).filter(
            Person.person_type == 'doctor',
            Person.is_active == True
        ).all()
        
        return [
            {
                'id': doctor.id,
                'name': doctor.name,
                'email': doctor.email,
                'person_type': doctor.person_type
            }
            for doctor in doctors
        ]
    except Exception as e:
        api_logger.error(f"Error getting doctors: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving doctors"
        )

@router.get("/catalog-status")
async def get_catalog_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_dev)
) -> Dict[str, Any]:
    """
    Get catalog status and compliance information
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - Catalog status verification
    """
    try:
        from models.diagnosis import DiagnosisCatalog
        from catalog_metadata import CATALOG_METADATA
        
        # Get diagnosis catalog status
        catalog_info = CATALOG_METADATA.get("diagnosis_catalog", {})
        total_diagnoses = db.query(DiagnosisCatalog).filter(DiagnosisCatalog.is_active == True).count()
        diagnoses_with_code = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.is_active == True,
            DiagnosisCatalog.code.isnot(None),
            DiagnosisCatalog.code != ''
        ).count()
        diagnoses_with_name = db.query(DiagnosisCatalog).filter(
            DiagnosisCatalog.is_active == True,
            DiagnosisCatalog.name.isnot(None),
            DiagnosisCatalog.name != ''
        ).count()
        
        compliance_percentage = 100.0 if total_diagnoses > 0 and diagnoses_with_code == total_diagnoses and diagnoses_with_name == total_diagnoses else 0.0
        min_records = catalog_info.get("min_records", 0)
        meets_minimum = total_diagnoses >= min_records
        
        return {
            "diagnosis_catalog": {
                "catalog_name": catalog_info.get("name", "CIE-10 Diagnósticos"),
                "version": catalog_info.get("version", "Unknown"),
                "official_source": catalog_info.get("official_source", "Unknown"),
                "norm_reference": catalog_info.get("norm_reference", "NOM-004-SSA3-2012, NOM-024-SSA3-2012"),
                "status": "active" if meets_minimum and compliance_percentage == 100.0 else "needs_attention",
                "total_diagnoses": total_diagnoses,
                "diagnoses_with_code": diagnoses_with_code,
                "diagnoses_with_name": diagnoses_with_name,
                "compliance_percentage": compliance_percentage,
                "meets_minimum_requirements": meets_minimum,
                "min_records_required": min_records,
                "compliance_required": catalog_info.get("compliance_required", True),
                "validation_enabled": catalog_info.get("validation_enabled", True),
                "compliance_note": "Catalog complies with NOM-004-SSA3-2012 requirements" if compliance_percentage == 100.0 and meets_minimum else "Catalog needs attention to meet NOM-004-SSA3-2012 requirements",
                "note": catalog_info.get("note", "")
            }
        }
    
    except Exception as e:
        api_logger.error(f"Error getting catalog status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving catalog status"
        )


@router.get("/system-status")
async def get_system_status(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_dev)
) -> Dict[str, Any]:
    """
    Get overall system status including encryption and catalog compliance
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012, NOM-035-SSA3-2012
    """
    try:
        # Get encryption status
        encryption_status = await get_encryption_status(db=db, current_user=current_user)
        
        # Get catalog status
        catalog_status = await get_catalog_status(db=db, current_user=current_user)
        
        # Determine overall compliance
        encryption_compliant = encryption_status.get("encryption_enabled", False) and encryption_status.get("encryption_key_configured", False)
        catalog_compliant = catalog_status.get("diagnosis_catalog", {}).get("status") == "active"
        
        overall_compliance = "Compliant" if encryption_compliant and catalog_compliant else "Partially Compliant"
        
        return {
            "overall_compliance": overall_compliance,
            "encryption": encryption_status,
            "catalog": catalog_status,
            "environment": settings.APP_ENV,
            "compliance_notes": {
                "encryption": "NOM-035-SSA3-2012: Encryption is required in production",
                "catalog": "NOM-004-SSA3-2012, NOM-024-SSA3-2012: Official catalogs must be used for diagnoses"
            }
        }
    
    except Exception as e:
        api_logger.error(f"Error getting system status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving system status"
        )


@router.get("/retention-status")
async def get_retention_status(
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user_dev)
) -> Dict[str, Any]:
    """
    Get data retention status and statistics
    Compliance: NOM-004-SSA3-2012 - Medical records must be retained for 5 years minimum
    """
    try:
        # Get retention statistics
        retention_stats = get_retention_stats(db, doctor_id)
        
        # Get expiring records
        expiring_30_days = get_expiring_records(db, doctor_id, days_threshold=30, limit=10)
        expiring_90_days = get_expiring_records(db, doctor_id, days_threshold=90, limit=10)
        
        # Calculate compliance status
        total_records = retention_stats.get("active_records", 0) + retention_stats.get("archived_records", 0)
        ready_for_anonymization = retention_stats.get("ready_for_anonymization", 0)
        compliance_status = "Compliant" if ready_for_anonymization == 0 else "Action Required"
        
        return {
            "retention_period_years": 5,  # NOM-004-SSA3-2012 requires 5 years minimum
            "compliance_status": compliance_status,
            "statistics": retention_stats,
            "expiring_records": {
                "30_days": expiring_30_days,
                "90_days": expiring_90_days
            },
            "compliance_note": "NOM-004-SSA3-2012: Medical records must be retained for 5 years minimum. Records past retention period should be anonymized or deleted.",
            "legal_basis": "NOM-004-SSA3-2012, LFPDPPP Art. 28-34"
        }
    
    except Exception as e:
        api_logger.error(f"Error getting retention status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error retrieving retention status"
        )

