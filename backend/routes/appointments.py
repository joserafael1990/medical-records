"""
Appointment management endpoints
Refactored to use AppointmentService for better code health
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

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
    current_user: Person,
    office_id: Optional[int] = None,
):
    """Get available appointment times for booking on a specific date.

    Slots are derived from the doctor's `schedule_templates` entry for the
    given office on the weekday of `date`. Conflicts are checked against
    active appointments for the same office on that day.
    """
    from datetime import datetime, timedelta, time as dtime
    import json
    from sqlalchemy import text
    from database import Appointment, Office

    try:
        target_date = datetime.fromisoformat(date).date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    slot_duration = current_user.appointment_duration or 30

    # Resolve target office: explicit param wins, else doctor's oldest
    # active office (preserves pre-existing behavior for callers that
    # don't yet send office_id).
    if office_id is not None:
        office = db.query(Office).filter(
            Office.id == office_id,
            Office.doctor_id == current_user.id,
            Office.is_active == True,
        ).first()
        if not office:
            raise HTTPException(status_code=404, detail="Office not found for this doctor")
        resolved_office_id = office.id
    else:
        first_office = (
            db.query(Office)
            .filter(Office.doctor_id == current_user.id, Office.is_active == True)
            .order_by(Office.created_at.asc(), Office.id.asc())
            .first()
        )
        resolved_office_id = first_office.id if first_office else None

    if not resolved_office_id:
        return {"date": date, "available_times": [], "slot_duration_minutes": slot_duration}

    day_of_week = target_date.weekday()

    template_row = db.execute(
        text(
            """
            SELECT start_time, end_time, time_blocks
            FROM schedule_templates
            WHERE doctor_id = :doctor_id
              AND office_id = :office_id
              AND day_of_week = :day_of_week
              AND is_active = TRUE
            LIMIT 1
            """
        ),
        {
            "doctor_id": current_user.id,
            "office_id": resolved_office_id,
            "day_of_week": day_of_week,
        },
    ).fetchone()

    if not template_row:
        return {"date": date, "available_times": [], "slot_duration_minutes": slot_duration}

    time_blocks = []
    raw_blocks = template_row[2]
    if raw_blocks:
        if isinstance(raw_blocks, list):
            time_blocks = raw_blocks
        elif isinstance(raw_blocks, str):
            time_blocks = json.loads(raw_blocks)

    if not time_blocks and template_row[0] and template_row[1]:
        time_blocks = [{
            "start_time": template_row[0].strftime("%H:%M"),
            "end_time": template_row[1].strftime("%H:%M"),
        }]

    if not time_blocks:
        return {"date": date, "available_times": [], "slot_duration_minutes": slot_duration}

    # Existing appointments in the same office on this date. Conflicts
    # between offices are not enforced here — a separate booking-layer
    # check owns that.
    existing = db.execute(
        text(
            """
            SELECT appointment_date, end_time
            FROM appointments
            WHERE doctor_id = :doctor_id
              AND office_id = :office_id
              AND DATE(appointment_date) = :date
              AND status IN ('confirmada', 'por_confirmar')
            """
        ),
        {
            "doctor_id": current_user.id,
            "office_id": resolved_office_id,
            "date": target_date,
        },
    ).fetchall()

    booked = [
        {"start": row[0].time(), "end": row[1].time() if row[1] else row[0].time()}
        for row in existing
    ]

    available_slots: list[dict] = []
    for block in time_blocks:
        start_str = block.get("start_time")
        end_str = block.get("end_time")
        if not start_str or not end_str:
            continue
        block_start = datetime.strptime(start_str, "%H:%M").time()
        block_end = datetime.strptime(end_str, "%H:%M").time()

        cursor = datetime.combine(target_date, block_start)
        block_end_dt = datetime.combine(target_date, block_end)

        while cursor + timedelta(minutes=slot_duration) <= block_end_dt:
            slot_start = cursor.time()
            slot_end = (cursor + timedelta(minutes=slot_duration)).time()

            overlaps = any(
                slot_start < b["end"] and slot_end > b["start"]
                for b in booked
            )
            if not overlaps:
                time_str = slot_start.strftime("%H:%M")
                available_slots.append({
                    "time": time_str,
                    "display": time_str,
                    "datetime": cursor.isoformat(),
                    "duration_minutes": slot_duration,
                    "available": True,
                })

            cursor += timedelta(minutes=slot_duration)

    return {
        "date": date,
        "available_times": available_slots,
        "slot_duration_minutes": slot_duration,
    }


@router.get("/appointments/can-book-first-time/{patient_id}")
async def can_book_first_time_appointment(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Check if a patient can book a first-time appointment with this doctor.
    
    Returns True if:
    - Patient has no completed consultations with this doctor
    - Patient only has cancelled appointments (can rebook first-time)
    
    This enables rebooking first-time appointments for patients whose
    previous first-time appointment was cancelled.
    """
    try:
        from database import MedicalRecord, Appointment
        
        # Check if patient has any completed consultations with this doctor
        completed_consultations = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.doctor_id == current_user.id
        ).count()
        
        # If patient has completed consultations, they cannot book first-time
        if completed_consultations > 0:
            return {
                "can_book_first_time": False,
                "reason": "El paciente ya tiene consultas realizadas con este doctor",
                "completed_consultations": completed_consultations
            }
        
        # Check non-cancelled appointments (excluding first-time logic)
        non_cancelled_appointments = db.query(Appointment).filter(
            Appointment.patient_id == patient_id,
            Appointment.doctor_id == current_user.id,
            Appointment.status != 'cancelled'
        ).count()
        
        # If patient has non-cancelled appointments but no consultations,
        # they might have a pending first-time appointment
        if non_cancelled_appointments > 0:
            return {
                "can_book_first_time": False,
                "reason": "El paciente ya tiene una cita pendiente",
                "pending_appointments": non_cancelled_appointments
            }
        
        # Patient can book first-time (no consultations, no pending appointments)
        return {
            "can_book_first_time": True,
            "reason": "El paciente puede agendar una cita de primera vez"
        }
        
    except Exception as e:
        api_logger.error(
            "❌ Error in can_book_first_time_appointment",
            extra={"patient_id": patient_id, "doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error al verificar elegibilidad: {str(e)}")


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
            extra={"doctor_id": current_user.id, "error": str(e), "error_type": type(e).__name__},
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
