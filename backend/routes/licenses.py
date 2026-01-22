"""
License management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from database import get_db, Person, License
from dependencies import get_current_user
from logger import get_logger
import crud
import schemas
from services.license_service import LicenseService

api_logger = get_logger("medical_records.api")
router = APIRouter(prefix="/api/licenses", tags=["licenses"])

# NOTE: Access control will be implemented later
# For now, all authenticated users can access license endpoints

@router.post("", response_model=schemas.LicenseResponse)
def create_license(
    license_data: schemas.LicenseCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new license for a doctor"""
    # Verify doctor exists and is a doctor
    doctor = db.query(Person).filter(
        Person.id == license_data.doctor_id,
        Person.person_type == 'doctor'
    ).first()
    
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    license = crud.create_license(db, license_data, current_user.id)
    return license

@router.get("", response_model=List[schemas.LicenseResponse])
def get_licenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None),
    license_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all licenses with optional filters"""
    from sqlalchemy.orm import joinedload
    
    query = db.query(License).options(joinedload(License.doctor))
    
    if status:
        query = query.filter(License.status == status)
    if license_type:
        query = query.filter(License.license_type == license_type)
    
    licenses = query.offset(skip).limit(limit).all()
    
    # Auto-update expired licenses
    for license in licenses:
        LicenseService.check_and_update_status(db, license)
    
    # Convert to response format with doctor information
    result = []
    for license in licenses:
        license_dict = {
            'id': license.id,
            'doctor_id': license.doctor_id,
            'license_type': license.license_type,
            'start_date': license.start_date,
            'expiration_date': license.expiration_date,
            'payment_date': license.payment_date,
            'status': license.status,
            'is_active': license.is_active,
            'notes': license.notes,
            'created_at': license.created_at,
            'updated_at': license.updated_at,
            'created_by': license.created_by,
            'doctor': None
        }
        
        if license.doctor:
            license_dict['doctor'] = {
                'id': license.doctor.id,
                'name': license.doctor.name,
                'email': license.doctor.email,
                'person_type': license.doctor.person_type
            }
        
        result.append(schemas.LicenseResponse(**license_dict))
    
    return result

@router.get("/doctor/{doctor_id}", response_model=schemas.LicenseResponse)
def get_doctor_license(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get current license for a specific doctor"""
    license = LicenseService.get_current_license(db, doctor_id)
    
    if not license:
        raise HTTPException(status_code=404, detail="No active license found for this doctor")
    
    return license

@router.put("/{license_id}", response_model=schemas.LicenseResponse)
def update_license(
    license_id: int,
    license_data: schemas.LicenseUpdate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update a license"""
    license = crud.update_license(db, license_id, license_data)
    
    if not license:
        raise HTTPException(status_code=404, detail="License not found")
    
    # Auto-update status if dates changed
    LicenseService.check_and_update_status(db, license)
    
    return license

@router.get("/check/{doctor_id}")
def check_license_status(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Check if a doctor has a valid active license"""
    is_valid = LicenseService.is_license_valid(db, doctor_id)
    license = LicenseService.get_current_license(db, doctor_id)
    
    return {
        "is_valid": is_valid,
        "has_license": license is not None,
        "license": license if license else None
    }

