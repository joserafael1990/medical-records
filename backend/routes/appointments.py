"""
Appointment management endpoints
Refactored to use AppointmentService for better code health
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, Person
from dependencies import get_current_user
from logger import get_logger
from services.appointment_service import AppointmentService
import crud
import schemas

api_logger = get_logger("medical_records.api")

router = APIRouter(prefix="/api", tags=["appointments"])


# ============================================================================
# APPOINTMENT ENDPOINTS
# ============================================================================

@router.get("/appointments")
async def get_appointments(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = Query(0),
    limit: int = Query(100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    available_for_consultation: bool = Query(False)
):
    """Get list of appointments with optional filters"""
    try:
        # Use CRUD for basic listing (already implemented)
        appointments = crud.get_appointments(
            db,
            doctor_id=current_user.id,
            skip=skip,
            limit=limit,
            start_date=start_date,
            end_date=end_date,
            status=status,
            available_for_consultation=available_for_consultation
        )
        
        # Serialize appointments
        return [AppointmentService.serialize_appointment(apt) for apt in appointments]
    
    except Exception as e:
        api_logger.error(
            "❌ Error in get_appointments",
            extra={"doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error al obtener citas: {str(e)}")


@router.get("/appointments/patient/{patient_id}")
async def get_appointments_by_patient(
    patient_id: int,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get appointments for a specific patient belonging to the current doctor."""
    appointments = crud.get_appointments_by_patient(db, patient_id, current_user.id)
    return [AppointmentService.serialize_appointment(apt) for apt in appointments]


@router.get("/appointments/calendar")
async def get_calendar_appointments(
    date: Optional[str] = Query(None),
    target_date: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get calendar appointments for specific date or date range - CDMX timezone aware"""
    try:
        return AppointmentService.get_calendar_appointments(
            db=db,
            doctor_id=current_user.id,
            date=date,
            target_date=target_date,
            start_date=start_date,
            end_date=end_date
        )
    except Exception as e:
        api_logger.error(
            "❌ Error in get_calendar_appointments",
            extra={"doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error al obtener calendario: {str(e)}")


# NOTE: This function is exported for use in main_clean_english.py
# The route is defined in main_clean_english.py before the router is included
# to ensure FastAPI matches /api/appointments/available-times before /api/appointments/{appointment_id}
async def get_available_times_for_booking(
    date: str,
    db: Session,
    current_user: Person
):
    """Get available appointment times for booking on a specific date"""
    # This function is kept here for backward compatibility
    # The actual route is defined in main_clean_english.py
    # TODO: Move this logic to AppointmentService if needed
    from datetime import datetime, timedelta
    import pytz
    from database import Appointment
    from sqlalchemy import func
    
    try:
        # Parse the date
        target_date = datetime.fromisoformat(date).date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Get doctor's timezone (default to CDMX)
    doctor_tz = pytz.timezone('America/Mexico_City')
    
    # Define working hours (9 AM to 6 PM)
    working_start = 9
    working_end = 18
    slot_duration = 30  # minutes
    
    # Get existing appointments for the day
    start_of_day = doctor_tz.localize(datetime.combine(target_date, datetime.min.time()))
    end_of_day = doctor_tz.localize(datetime.combine(target_date, datetime.max.time()))
    
    # Convert to UTC for database query
    utc_start = start_of_day.astimezone(pytz.utc)
    utc_end = end_of_day.astimezone(pytz.utc)
    
    existing_appointments = db.query(Appointment).filter(
        Appointment.doctor_id == current_user.id,
        Appointment.appointment_date >= utc_start,
        Appointment.appointment_date <= utc_end,
        Appointment.status != 'cancelled'
    ).all()
    
    # Generate all possible time slots
    available_slots = []
    current_time = start_of_day.replace(hour=working_start, minute=0)
    end_time = start_of_day.replace(hour=working_end, minute=0)
    
    while current_time < end_time:
        # Check if slot is available
        is_available = True
        for apt in existing_appointments:
            apt_time = apt.appointment_date
            if apt_time.tzinfo is None:
                apt_time = doctor_tz.localize(apt_time)
            else:
                apt_time = apt_time.astimezone(doctor_tz)
            
            # Check if there's overlap
            if abs((current_time - apt_time).total_seconds()) < slot_duration * 60:
                is_available = False
                break
        
        if is_available:
            available_slots.append({
                "time": current_time.strftime("%H:%M"),
                "datetime": current_time.isoformat()
            })
        
        current_time += timedelta(minutes=slot_duration)
    
    return {
        "date": date,
        "available_slots": available_slots,
        "slot_duration_minutes": slot_duration
    }


@router.get("/appointments/{appointment_id}")
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific appointment by ID"""
    appointment = crud.get_appointment(db, appointment_id)
    
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Verify ownership
    if appointment.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this appointment")
    
    return AppointmentService.serialize_appointment(appointment)


@router.post("/appointments")
async def create_appointment(
    appointment_data: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new appointment"""
    try:
        result = AppointmentService.create_appointment_with_reminders(
            db=db,
            appointment_data=appointment_data,
            doctor_id=current_user.id
        )
        
        # Send privacy notice for first-time appointments
        consultation_type = appointment_data.consultation_type if hasattr(appointment_data, 'consultation_type') else None
        is_first_time = consultation_type and consultation_type.lower() in ['primera vez', 'primera_vez', 'primera']
        
        if is_first_time:
            try:
                from privacy_service import send_privacy_notice_automatically, check_if_first_appointment
                
                appointment_id = int(result.get('id'))
                is_first_appointment = check_if_first_appointment(
                    db, 
                    appointment_data.patient_id, 
                    current_user.id, 
                    appointment_id
                )
                
                if is_first_appointment:
                    privacy_result = await send_privacy_notice_automatically(
                        db=db,
                        patient_id=appointment_data.patient_id,
                        doctor=current_user,
                        consultation_type=consultation_type,
                        is_first_appointment=True
                    )
                    
                    if privacy_result and privacy_result.get("success"):
                        api_logger.info(
                            "✅ Privacy notice sent automatically for first appointment",
                            extra={
                                "appointment_id": appointment_id,
                                "patient_id": appointment_data.patient_id,
                                "consent_id": privacy_result.get("consent_id")
                            }
                        )
            except Exception as e:
                # Non-blocking error
                api_logger.warning(
                    f"⚠️ Error sending privacy notice automatically: {str(e)}",
                    extra={"appointment_id": result.get('id')},
                    exc_info=True
                )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error in create_appointment",
            extra={"doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error al crear la cita: {str(e)}")


@router.put("/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: int,
    appointment_data: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific appointment by ID"""
    try:
        return AppointmentService.update_appointment_with_reminders(
            db=db,
            appointment_id=appointment_id,
            appointment_data=appointment_data,
            doctor_id=current_user.id
        )
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error in update_appointment",
            extra={"appointment_id": appointment_id, "doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error al actualizar la cita: {str(e)}")


@router.delete("/appointments/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete/cancel specific appointment by ID"""
    try:
        return AppointmentService.delete_appointment(
            db=db,
            appointment_id=appointment_id,
            doctor_id=current_user.id
        )
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error in delete_appointment",
            extra={"appointment_id": appointment_id, "doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error al eliminar la cita: {str(e)}")
