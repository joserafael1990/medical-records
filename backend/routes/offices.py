"""
Office management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime

from logger import get_logger

from database import get_db, Person, Office, State, Country, Appointment, AppointmentType
from dependencies import get_current_user
import schemas

router = APIRouter(prefix="/api", tags=["offices"])
api_logger = get_logger("medical_records.api")


@router.post("/offices", response_model=schemas.Office)
async def create_office(
    office: schemas.OfficeCreate,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new office for the current doctor"""
    try:
        api_logger.info(
            "🔍 Creating office request received",
            extra={
                "doctor_id": current_user.id,
                "office_name": office.name,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        # Validate that the user is a doctor
        if current_user.person_type != 'doctor':
            raise HTTPException(status_code=403, detail="Only doctors can create offices")
        
        # Create the office
        new_office = Office(
            doctor_id=current_user.id,
            name=office.name,
            address=office.address,
            city=office.city,
            state_id=office.state_id,
            country_id=office.country_id,
            postal_code=office.postal_code,
            phone=office.phone,
            timezone=office.timezone,
            maps_url=office.maps_url,
            is_active=True  # New offices are active by default
        )
        
        db.add(new_office)
        db.commit()
        db.refresh(new_office)
        
        # Load the office with relationships to get state and country names
        office_with_relations = db.query(Office).options(
            joinedload(Office.state),
            joinedload(Office.country)
        ).filter(Office.id == new_office.id).first()
        
        api_logger.info(
            "✅ Office created successfully",
            extra={"doctor_id": current_user.id, "office_id": new_office.id, "office_name": new_office.name}
        )
        return office_with_relations
        
    except Exception as e:
        api_logger.error(
            "❌ Error creating office",
            extra={"doctor_id": current_user.id, "office_name": office.name},
            exc_info=True
        )
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating office")


@router.get("/offices", response_model=List[schemas.Office])
async def get_doctor_offices(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all offices for the current doctor"""
    try:
        # Use current user's doctor_id
        doctor_id = current_user.id
        
        # Get offices for the current doctor with JOINs for state and country names
        results = db.query(Office, State.name.label('state_name'), Country.name.label('country_name')).join(
            State, Office.state_id == State.id, isouter=True
        ).join(
            Country, Office.country_id == Country.id, isouter=True
        ).filter(
            Office.doctor_id == doctor_id,
            Office.is_active == True
        ).all()
        
        # Add state_name and country_name to each office object
        offices = []
        for result in results:
            office, state_name, country_name = result
            office.state_name = state_name
            office.country_name = country_name
            offices.append(office)
        
        return offices
        
    except Exception as e:
        api_logger.error(
            "❌ Error getting doctor offices",
            extra={"doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Error getting offices")


@router.get("/offices/{office_id}", response_model=schemas.Office)
async def get_office(
    office_id: int,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific office by ID"""
    try:
        doctor_id = current_user.id
        # Get office by ID for the current doctor with JOINs for state and country names
        result = db.query(Office, State.name.label('state_name'), Country.name.label('country_name')).join(
            State, Office.state_id == State.id, isouter=True
        ).join(
            Country, Office.country_id == Country.id, isouter=True
        ).filter(
            Office.id == office_id,
            Office.doctor_id == doctor_id,
            Office.is_active == True
        ).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Office not found")
        
        office, state_name, country_name = result
        
        # Add state_name and country_name to the office object
        office.state_name = state_name
        office.country_name = country_name
        
        return office
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error getting office detail",
            extra={"doctor_id": current_user.id, "office_id": office_id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Error getting office")


@router.put("/offices/{office_id}", response_model=schemas.Office)
async def update_office(
    office_id: int,
    office: schemas.OfficeUpdate,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an office (validate ownership)"""
    try:
        # Validate that the user is a doctor
        if current_user.person_type != 'doctor':
            raise HTTPException(status_code=403, detail="Only doctors can update offices")
        
        # Find the office and validate ownership
        existing_office = db.query(Office).filter(
            Office.id == office_id,
            Office.doctor_id == current_user.id,
            Office.is_active == True
        ).first()
        
        if not existing_office:
            raise HTTPException(status_code=404, detail="Office not found")
        
        # Update fields
        for field, value in office.dict(exclude_unset=True).items():
            setattr(existing_office, field, value)
        
        db.commit()
        db.refresh(existing_office)
        
        return existing_office
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error updating office",
            extra={"doctor_id": current_user.id, "office_id": office_id},
            exc_info=True
        )
        db.rollback()
        raise HTTPException(status_code=500, detail="Error updating office")


@router.delete("/offices/{office_id}")
async def delete_office(
    office_id: int,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete an office (validate ownership and no future appointments)"""
    try:
        # Validate that the user is a doctor
        if current_user.person_type != 'doctor':
            raise HTTPException(status_code=403, detail="Only doctors can delete offices")
        
        # Find the office and validate ownership
        existing_office = db.query(Office).filter(
            Office.id == office_id,
            Office.doctor_id == current_user.id,
            Office.is_active == True
        ).first()
        
        if not existing_office:
            raise HTTPException(status_code=404, detail="Office not found")
        
        # Check for future appointments
        future_appointments = db.query(Appointment).filter(
            Appointment.office_id == office_id,
            Appointment.appointment_date > datetime.utcnow()
        ).count()
        
        if future_appointments > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete office with {future_appointments} future appointments"
            )
        
        # Soft delete
        existing_office.is_active = False
        db.commit()
        
        return {"message": "Office deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error deleting office",
            extra={"doctor_id": current_user.id, "office_id": office_id},
            exc_info=True
        )
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting office")


@router.get("/appointment-types", response_model=List[dict])
async def get_appointment_types(db: Session = Depends(get_db)):
    """Get all active appointment types"""
    try:
        types = db.query(AppointmentType).filter(AppointmentType.is_active == True).all()
        return [{"id": t.id, "name": t.name} for t in types]
    except Exception as e:
        api_logger.error("❌ Error getting appointment types", exc_info=True)
        raise HTTPException(status_code=500, detail="Error getting appointment types")
