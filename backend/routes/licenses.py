"""
License management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import date

from database import get_db, Person, License
from dependencies import get_current_user
from logger import get_logger
import crud
import schemas
from services.license_service import LicenseService
from services.doctor_service import DoctorService

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
    try:
        # Verify doctor exists and is a doctor
        doctor = db.query(Person).filter(
            Person.id == license_data.doctor_id,
            Person.person_type == 'doctor'
        ).first()

        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")

        license = crud.create_license(db, license_data, current_user.id)
        return license
    except HTTPException:
        raise
    except IntegrityError as e:
        api_logger.warning("License integrity error (e.g. duplicate doctor)", error=str(e))
        raise HTTPException(
            status_code=409,
            detail="El doctor ya tiene una licencia. Edita la existente o desactívala primero."
        )
    except Exception as e:
        api_logger.error("Error creating license", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Error al crear la licencia. Verifica que la tabla de licencias exista y vuelve a intentar."
        )

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

@router.get("/doctors")
def get_doctors_with_licenses(
    status: Optional[str] = Query(None),
    license_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    List every active doctor with their license (or null if none exists yet).

    This powers the License Management view so that doctors without a license
    still appear in the grid and can be granted one inline.

    Filters by license status/type only exclude doctors that have no license
    when a filter is supplied; otherwise doctors with null licenses are kept.
    """
    doctors = db.query(Person).filter(
        Person.person_type == 'doctor',
        Person.is_active == True
    ).order_by(Person.name.asc()).all()

    filtering = bool(status or license_type)
    result = []

    for doctor in doctors:
        license = db.query(License).filter(License.doctor_id == doctor.id).first()

        if filtering and not license:
            continue

        if license:
            LicenseService.check_and_update_status(db, license)
            if status and license.status != status:
                continue
            if license_type and license.license_type != license_type:
                continue

        result.append({
            "doctor": {
                "id": doctor.id,
                "name": doctor.name,
                "email": doctor.email,
                "person_type": doctor.person_type,
                "last_login": doctor.last_login.isoformat() if doctor.last_login else None,
            },
            "license": None if not license else {
                "id": license.id,
                "doctor_id": license.doctor_id,
                "license_type": license.license_type,
                "start_date": license.start_date.isoformat() if license.start_date else None,
                "expiration_date": license.expiration_date.isoformat() if license.expiration_date else None,
                "payment_date": license.payment_date.isoformat() if license.payment_date else None,
                "status": license.status,
                "is_active": license.is_active,
                "notes": license.notes,
                "created_at": license.created_at.isoformat() if license.created_at else None,
                "updated_at": license.updated_at.isoformat() if license.updated_at else None,
                "created_by": license.created_by,
            },
        })

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


@router.get("/doctor/{doctor_id}/profile")
def get_doctor_profile_for_license_admin(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Full profile of a doctor, to display from the License Management grid."""
    doctor = db.query(Person).filter(
        Person.id == doctor_id,
        Person.person_type == 'doctor'
    ).first()

    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return DoctorService.get_doctor_profile(db, doctor_id)

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

