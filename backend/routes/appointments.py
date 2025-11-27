"""
Appointment management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta
import pytz
import psycopg2
import json

from database import get_db, Person, Appointment, AppointmentReminder
from dependencies import get_current_user
from logger import get_logger
from appointment_service import AppointmentService
import crud
import schemas

api_logger = get_logger("medical_records.api")

# CDMX timezone configuration
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')

# Import now_cdmx from consultation_service to avoid duplication
from consultation_service import now_cdmx

router = APIRouter(prefix="/api", tags=["appointments"])


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _build_calendar_query(db: Session, doctor_id: int):
    """Build the base query for calendar appointments."""
    try:
        return db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.office),
            joinedload(Appointment.appointment_type_rel),
            joinedload(Appointment.reminders)
        ).filter(Appointment.doctor_id == doctor_id)
    except Exception:
        # Fallback if appointment_types table doesn't exist
        return db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.office),
            joinedload(Appointment.reminders)
        ).filter(Appointment.doctor_id == doctor_id)


def _apply_date_filters(
    query, 
    start_date: Optional[str], 
    end_date: Optional[str], 
    target_date: Optional[str],
    doctor_id: int
):
    """Apply date filters to the calendar query."""
    if start_date and end_date:
        # Date range query for weekly/monthly views
        parsed_start = datetime.fromisoformat(start_date).date()
        parsed_end = datetime.fromisoformat(end_date).date()
        
        # Convert to CDMX timezone for filtering
        cdmx_start = SYSTEM_TIMEZONE.localize(datetime.combine(parsed_start, datetime.min.time()))
        cdmx_end = SYSTEM_TIMEZONE.localize(datetime.combine(parsed_end, datetime.max.time()))
        
        # Convert to UTC for database query
        utc_start = cdmx_start.astimezone(pytz.utc)
        utc_end = cdmx_end.astimezone(pytz.utc)
        
        query = query.filter(
            Appointment.appointment_date >= utc_start,
            Appointment.appointment_date <= utc_end
        )
        api_logger.debug(
            "📅 Fetching appointments for range",
            extra={
                "doctor_id": doctor_id,
                "start_date": str(parsed_start),
                "end_date": str(parsed_end),
                "utc_start": utc_start.isoformat(),
                "utc_end": utc_end.isoformat()
            }
        )
        
    elif target_date:
        # Single date query for daily view
        try:
            parsed_date = datetime.fromisoformat(target_date).date()
        except ValueError:
            api_logger.warning(
                "⚠️ Invalid target date received, defaulting to today",
                extra={"doctor_id": doctor_id, "target_date": target_date}
            )
            parsed_date = now_cdmx().date()
        
        # Use func.date() to compare dates properly
        query = query.filter(
            func.date(Appointment.appointment_date) == parsed_date
        )
        
        api_logger.debug(
            "📅 Fetching appointments for single date",
            extra={
                "doctor_id": doctor_id,
                "target_date": str(parsed_date)
            }
        )
        
    else:
        # Default to today in CDMX timezone
        today_cdmx = now_cdmx().date()
        cdmx_start = SYSTEM_TIMEZONE.localize(datetime.combine(today_cdmx, datetime.min.time()))
        cdmx_end = SYSTEM_TIMEZONE.localize(datetime.combine(today_cdmx, datetime.max.time()))
        
        utc_start = cdmx_start.astimezone(pytz.utc)
        utc_end = cdmx_end.astimezone(pytz.utc)
        
        query = query.filter(
            Appointment.appointment_date >= utc_start,
            Appointment.appointment_date <= utc_end
        )
    
    return query


def _process_calendar_results(appointments: list) -> list:
    """Process appointment results and handle timezone conversion."""
    cdmx_tz = pytz.timezone('America/Mexico_City')
    result = []
    
    for appointment in appointments:
        # Handle timezone conversion for display
        if appointment.appointment_date.tzinfo is None:
            # Naive datetime (stored in CDMX) -> localize
            start_time = cdmx_tz.localize(appointment.appointment_date)
        else:
            # Aware datetime (stored in UTC) -> convert to CDMX
            start_time = appointment.appointment_date.astimezone(cdmx_tz)
            
        # Calculate end time (default 30 mins if not set)
        if appointment.end_time:
            if appointment.end_time.tzinfo is None:
                end_time = cdmx_tz.localize(appointment.end_time)
            else:
                end_time = appointment.end_time.astimezone(cdmx_tz)
        else:
            end_time = start_time + timedelta(minutes=30)

        # Format patient name
        patient_name = "Paciente no encontrado"
        if appointment.patient:
            patient_name = appointment.patient.name or "Paciente sin nombre"

        # Build result dictionary
        result.append({
            "id": appointment.id,
            "title": f"{patient_name} - {appointment.consultation_type}",
            "start": start_time.isoformat(),
            "end": end_time.isoformat(),
            "patient_id": appointment.patient_id,
            "patient_name": patient_name,
            "status": appointment.status,
            "consultation_type": appointment.consultation_type,
            "notes": appointment.notes,
            "appointment_type_name": appointment.appointment_type_rel.name if getattr(appointment, "appointment_type_rel", None) else None,
            "office_name": appointment.office.name if getattr(appointment, "office", None) else None,
            "backgroundColor": "#10B981" if appointment.status == 'completed' else 
                             "#EF4444" if appointment.status == 'cancelled' else 
                             "#3B82F6",
            "borderColor": "#10B981" if appointment.status == 'completed' else 
                           "#EF4444" if appointment.status == 'cancelled' else 
                           "#3B82F6",
            "extendedProps": {
                "status": appointment.status,
                "consultation_type": appointment.consultation_type,
                "patient_id": appointment.patient_id
            }
        })
        
    return result


def serialize_appointment(appointment: Appointment) -> dict:
    """Serialize Appointment ORM instance to dict for API responses."""
    patient_name = "Paciente no encontrado"
    if appointment.patient:
        patient_name = appointment.patient.name or "Paciente sin nombre"

    appointment_date_str = appointment.appointment_date.strftime('%Y-%m-%dT%H:%M:%S') if appointment.appointment_date else None
    end_time_str = appointment.end_time.strftime('%Y-%m-%dT%H:%M:%S') if appointment.end_time else None

    return {
        "id": str(appointment.id),
        "patient_id": str(appointment.patient_id),
        "doctor_id": appointment.doctor_id,
        "appointment_date": appointment_date_str,
        "date_time": appointment_date_str,
        "end_time": end_time_str,
        "appointment_type_id": appointment.appointment_type_id,
        "appointment_type_name": appointment.appointment_type_rel.name if getattr(appointment, "appointment_type_rel", None) else None,
        "office_id": appointment.office_id,
        "office_name": appointment.office.name if getattr(appointment, "office", None) else None,
        "consultation_type": appointment.consultation_type,
        "status": appointment.status,
        "estimated_cost": str(getattr(appointment, 'estimated_cost', None)) if getattr(appointment, 'estimated_cost', None) else None,
        "insurance_covered": getattr(appointment, 'insurance_covered', None),
        "reminder_sent": getattr(appointment, 'reminder_sent', False),
        "reminder_sent_at": appointment.reminder_sent_at.isoformat() if getattr(appointment, 'reminder_sent_at', None) else None,
        "auto_reminder_enabled": getattr(appointment, 'auto_reminder_enabled', None),
        "auto_reminder_offset_minutes": getattr(appointment, 'auto_reminder_offset_minutes', None),
        "auto_reminder_sent_at": appointment.auto_reminder_sent_at.isoformat() if getattr(appointment, 'auto_reminder_sent_at', None) else None,
        "reminders": [
            {
                "id": r.id,
                "reminder_number": r.reminder_number,
                "offset_minutes": r.offset_minutes,
                "enabled": r.enabled,
                "sent": r.sent,
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "updated_at": r.updated_at.isoformat() if r.updated_at else None
            }
            for r in (list(appointment.reminders) if hasattr(appointment, 'reminders') and appointment.reminders is not None else [])
        ],
        "cancelled_reason": appointment.cancelled_reason,
        "cancelled_at": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
        "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
        "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None,
        "patient_name": patient_name,
        "patient": appointment.patient
    }


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
        # Convert string dates to date objects if provided
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            start_date_obj = datetime.fromisoformat(start_date).date()
        if end_date:
            end_date_obj = datetime.fromisoformat(end_date).date()
        
        # Get appointments using the service (no doctor filter for development)
        # By default, exclude cancelled appointments unless specifically requested
        # When available_for_consultation is True, it already filters out cancelled
        # When status is None and available_for_consultation is False, exclude cancelled by default
        if status is None and not available_for_consultation:
            # Exclude cancelled appointments by default
            appointments = AppointmentService.get_appointments(
                db=db,
                skip=skip,
                limit=limit,
                start_date=start_date_obj,
                end_date=end_date_obj,
                status='active',  # This will filter out cancelled appointments
                doctor_id=current_user.id,
                available_for_consultation=False
            )
        else:
            # If status is explicitly requested, use it; otherwise available_for_consultation handles filtering
            appointments = AppointmentService.get_appointments(
                db=db,
                skip=skip,
                limit=limit,
                start_date=start_date_obj,
                end_date=end_date_obj,
                status=status,
                doctor_id=current_user.id,
                available_for_consultation=available_for_consultation
            )
        
        # Log results for debugging
        if available_for_consultation:
            api_logger.info(
                "📋 Appointments returned for consultation",
                extra={
                    "doctor_id": current_user.id,
                    "count": len(appointments),
                    "appointment_ids": [apt.id for apt in appointments],
                    "appointment_statuses": [apt.status for apt in appointments],
                    "appointment_dates": [apt.appointment_date.isoformat() if apt.appointment_date else None for apt in appointments]
                }
            )
        
        # Transform to include patient information
        return [serialize_appointment(appointment) for appointment in appointments]
        
    except Exception as e:
        # Return empty list instead of error to prevent frontend crashes
        return []


@router.get("/appointments/patient/{patient_id}")
async def get_appointments_by_patient(
    patient_id: int,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get appointments for a specific patient belonging to the current doctor."""
    try:
        appointments = AppointmentService.get_appointments(
            db=db,
            doctor_id=current_user.id,
            patient_id=patient_id
        )
        return [serialize_appointment(appointment) for appointment in appointments]
    except Exception:
        return []


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
        # Use 'date' parameter if provided (for daily view), otherwise fall back to 'target_date'
        effective_target_date = date or target_date
        
        # Build base query
        query = _build_calendar_query(db, current_user.id)
        
        # Apply filters
        query = _apply_date_filters(
            query, 
            start_date, 
            end_date, 
            effective_target_date, 
            current_user.id
        )
        
        # Execute query
        appointments = query.order_by(Appointment.appointment_date).all()
        
        api_logger.info(
            "📅 Fetched appointments from database",
            extra={
                "doctor_id": current_user.id,
                "count": len(appointments),
                "statuses": [apt.status for apt in appointments],
                "appointment_ids": [apt.id for apt in appointments]
            }
        )
        
        # Process results
        return _process_calendar_results(appointments)
        
    except Exception as e:
        api_logger.error(
            "❌ Error fetching calendar appointments",
            extra={
                "doctor_id": current_user.id,
                "error": str(e)
            },
            exc_info=True
        )
        # Return empty list on error to avoid breaking calendar view
        return []


# NOTE: This function is exported for use in main_clean_english.py
# The route is defined in main_clean_english.py before the router is included
# to ensure FastAPI matches /api/appointments/available-times before /api/appointments/{appointment_id}
async def get_available_times_for_booking(
    date: str,
    db: Session,
    current_user: Person
):
    """Get available appointment times for booking on a specific date"""
    try:
        # Parse the date and get day of week (0=Monday, 6=Sunday)
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        day_of_week = target_date.weekday()
        
        # Get doctor's schedule for this day
        conn = psycopg2.connect(
            host='postgres-db',
            database='historias_clinicas',
            user='historias_user',
            password='historias_pass'
        )
        cursor = conn.cursor()
        
        # Get schedule template for this day
        cursor.execute("""
            SELECT start_time, end_time, time_blocks
            FROM schedule_templates 
            WHERE doctor_id = %s AND day_of_week = %s AND is_active = true
        """, (current_user.id, day_of_week))
        
        schedule_result = cursor.fetchone()
        if not schedule_result:
            # Log for debugging
            api_logger.warning(f"No schedule template found for doctor {current_user.id}, day {day_of_week} (date: {date})")
            # Check if there's a schedule but is_active is false
            cursor.execute("""
                SELECT start_time, end_time, time_blocks, is_active
                FROM schedule_templates 
                WHERE doctor_id = %s AND day_of_week = %s
            """, (current_user.id, day_of_week))
            inactive_schedule = cursor.fetchone()
            if inactive_schedule:
                api_logger.warning(f"Schedule exists but is_active={inactive_schedule[3]} for doctor {current_user.id}, day {day_of_week}")
            else:
                api_logger.warning(f"No schedule template at all for doctor {current_user.id}, day {day_of_week}")
            cursor.close()
            conn.close()
            return {"available_times": []}
        
        # Parse time_blocks
        time_blocks = []
        if schedule_result[2]:
            if isinstance(schedule_result[2], list):
                time_blocks = schedule_result[2]
            elif isinstance(schedule_result[2], str):
                time_blocks = json.loads(schedule_result[2])
        
        # Fallback: if no time_blocks, create from start_time/end_time
        if not time_blocks and schedule_result[0] and schedule_result[1]:
            time_blocks = [{
                "start_time": schedule_result[0].strftime("%H:%M"),
                "end_time": schedule_result[1].strftime("%H:%M")
            }]
        
        # Get doctor's appointment duration
        cursor.execute("""
            SELECT appointment_duration 
            FROM persons 
            WHERE id = %s
        """, (current_user.id,))
        
        doctor_result = cursor.fetchone()
        consultation_duration = doctor_result[0] if doctor_result and doctor_result[0] else 30
        
        if not time_blocks:
            api_logger.warning(f"No time_blocks found for doctor {current_user.id}, day {day_of_week} (date: {date}). Schedule result: {schedule_result}")
            cursor.close()
            conn.close()
            return {"available_times": []}
        
        # Get existing appointments for this date
        cursor.execute("""
            SELECT appointment_date, end_time 
            FROM appointments 
            WHERE doctor_id = %s 
            AND DATE(appointment_date) = %s 
            AND status IN ('confirmada', 'por_confirmar')
        """, (current_user.id, date))
        
        existing_appointments = cursor.fetchall()
        
        # Convert existing appointments to time ranges
        booked_slots = []
        for apt_date, apt_end in existing_appointments:
            booked_slots.append({
                'start': apt_date.time(),
                'end': apt_end.time() if apt_end else apt_date.time()
            })
        
        # Generate available time slots based on schedule
        available_times = []
        
        for block in time_blocks:
            if not block.get('start_time') or not block.get('end_time'):
                continue
                
            start_time = datetime.strptime(block['start_time'], '%H:%M').time()
            end_time = datetime.strptime(block['end_time'], '%H:%M').time()
            
            # Generate slots within this time block
            current_time = start_time
            while current_time < end_time:
                current_datetime = datetime.combine(target_date, current_time)
                slot_end_datetime = current_datetime + timedelta(minutes=consultation_duration)
                slot_end = slot_end_datetime.time()
                
                # Check if this slot conflicts with existing appointments
                is_available = True
                for booked in booked_slots:
                    if (current_time < booked['end'] and slot_end > booked['start']):
                        is_available = False
                        break
                
                if is_available:
                    available_times.append({
                        "time": current_time.strftime('%H:%M'),
                        "display": current_time.strftime('%H:%M'),
                        "duration_minutes": consultation_duration,
                        "available": True
                    })
                
                # Move to next slot
                current_time = (datetime.combine(target_date, current_time) + timedelta(minutes=consultation_duration)).time()
        
        cursor.close()
        conn.close()
        
        api_logger.info(
            "Generated available times for booking",
            extra={"doctor_id": current_user.id, "date": date, "count": len(available_times)}
        )
        
        return {"available_times": available_times}
        
    except Exception as e:
        api_logger.error(
            "Error getting available times for booking",
            extra={"doctor_id": current_user.id, "date": date},
            exc_info=True
        )
        return {"available_times": []}


@router.get("/appointments/{appointment_id}")
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific appointment by ID"""
    try:
        api_logger.info(
            "🔍 Fetching appointment detail",
            extra={"doctor_id": current_user.id, "appointment_id": appointment_id}
        )
        
        # Query appointment with reminders
        appointment = db.query(Appointment).options(
            joinedload(Appointment.reminders)
        ).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == current_user.id
        ).first()
        
        api_logger.debug(
            "🔍 Appointment lookup result",
            extra={"doctor_id": current_user.id, "appointment_found": bool(appointment), "appointment_id": appointment_id}
        )
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found or access denied")
        
        # Since appointments are stored in CDMX timezone (without tzinfo), 
        # we assume they are already in CDMX timezone and just format them
        appointment_date_str = appointment.appointment_date.strftime('%Y-%m-%dT%H:%M:%S')
        end_time_str = appointment.end_time.strftime('%Y-%m-%dT%H:%M:%S') if appointment.end_time else None
        
        # Return appointment data
        return {
            "id": appointment.id,
            "patient_id": appointment.patient_id,
            "doctor_id": appointment.doctor_id,
            "appointment_date": appointment_date_str,
            "end_time": end_time_str,
            "appointment_type_id": appointment.appointment_type_id,
            "appointment_type_name": appointment.appointment_type_rel.name if appointment.appointment_type_rel else None,
            "consultation_type": appointment.consultation_type,
            "office_id": appointment.office_id,
            "office_name": appointment.office.name if appointment.office else None,
            "status": appointment.status,
            "estimated_cost": str(getattr(appointment, 'estimated_cost', None)) if getattr(appointment, 'estimated_cost', None) else None,
            "insurance_covered": getattr(appointment, 'insurance_covered', None),
            "reminder_sent": getattr(appointment, 'reminder_sent', False),
            "reminder_sent_at": appointment.reminder_sent_at.isoformat() if getattr(appointment, 'reminder_sent_at', None) else None,
            # Campos opcionales (sin preparation_instructions; columna eliminada)
            "auto_reminder_enabled": getattr(appointment, 'auto_reminder_enabled', None),
            "auto_reminder_offset_minutes": getattr(appointment, 'auto_reminder_offset_minutes', None),
            "auto_reminder_sent_at": appointment.auto_reminder_sent_at.isoformat() if getattr(appointment, 'auto_reminder_sent_at', None) else None,
            "reminders": [
                {
                    "id": r.id,
                    "reminder_number": r.reminder_number,
                    "offset_minutes": r.offset_minutes,
                    "enabled": r.enabled,
                    "sent": r.sent,
                    "sent_at": r.sent_at.isoformat() if r.sent_at else None,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "updated_at": r.updated_at.isoformat() if r.updated_at else None
                }
                for r in (appointment.reminders if hasattr(appointment, 'reminders') and appointment.reminders else [])
            ],
            "cancelled_reason": appointment.cancelled_reason,
            "cancelled_at": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
            "created_at": appointment.created_at.isoformat(),
            "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error in get_appointment",
            extra={"doctor_id": current_user.id, "appointment_id": appointment_id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/appointments")
async def create_appointment(
    appointment_data: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new appointment"""
    try:
        # Log the entire appointment_data object as dict to see what Pydantic received
        appointment_dict = appointment_data.model_dump() if hasattr(appointment_data, 'model_dump') else (appointment_data.dict() if hasattr(appointment_data, 'dict') else str(appointment_data))
        api_logger.debug(
            "🔍 Received appointment creation payload",
            extra={
                "doctor_id": current_user.id,
                "appointment_date": appointment_data.appointment_date,
                "end_time": appointment_data.end_time,
                "full_payload": appointment_dict,
                "reminders_in_payload": appointment_dict.get('reminders') if isinstance(appointment_dict, dict) else None
            }
        )
        
        # Extract reminders from appointment_data before creating appointment
        # Handle None, empty list, or missing attribute
        reminders_data = []
        if hasattr(appointment_data, 'reminders'):
            api_logger.debug(
                "🔍 Found reminders attribute",
                extra={
                    "reminders": appointment_data.reminders,
                    "reminders_type": str(type(appointment_data.reminders)),
                    "is_none": appointment_data.reminders is None,
                    "reminders_repr": repr(appointment_data.reminders) if appointment_data.reminders else None
                }
            )
            if appointment_data.reminders is not None:
                reminders_data = list(appointment_data.reminders) if appointment_data.reminders else []
        else:
            api_logger.debug("⚠️ No reminders attribute found in appointment_data")
        
        api_logger.debug(
            "📋 Processed reminders data",
            extra={
                "reminders_count": len(reminders_data),
                "reminders": [{"reminder_number": r.reminder_number, "offset_minutes": r.offset_minutes, "enabled": r.enabled} for r in reminders_data] if reminders_data else []
            }
        )
        
        # Validate reminders: maximum 3, unique reminder_number
        if len(reminders_data) > 3:
            raise HTTPException(status_code=400, detail="Maximum 3 reminders allowed per appointment")
        
        # Only validate if there are reminders
        if reminders_data:
            reminder_numbers = [r.reminder_number for r in reminders_data]
            if len(reminder_numbers) != len(set(reminder_numbers)):
                raise HTTPException(status_code=400, detail="Reminder numbers must be unique (1, 2, or 3)")
            
            for reminder in reminders_data:
                if reminder.reminder_number < 1 or reminder.reminder_number > 3:
                    raise HTTPException(status_code=400, detail="Reminder number must be between 1 and 3")
                if reminder.offset_minutes <= 0:
                    raise HTTPException(status_code=400, detail="Offset minutes must be greater than 0")
        
        # Create the appointment using CRUD
        appointment = crud.create_appointment(db, appointment_data, current_user.id)
        
        # Create reminders if provided
        if reminders_data:
            api_logger.info(
                "📝 Creating reminders for appointment",
                extra={
                    "appointment_id": appointment.id,
                    "reminder_count": len(reminders_data),
                    "reminders": [{"reminder_number": r.reminder_number, "offset_minutes": r.offset_minutes, "enabled": r.enabled} for r in reminders_data]
                }
            )
            try:
                for reminder_data in reminders_data:
                    reminder = AppointmentReminder(
                        appointment_id=appointment.id,
                        reminder_number=reminder_data.reminder_number,
                        offset_minutes=reminder_data.offset_minutes,
                        enabled=reminder_data.enabled
                    )
                    db.add(reminder)
                db.commit()
                api_logger.info(
                    "✅ Created reminders for appointment",
                    extra={"appointment_id": appointment.id, "reminder_count": len(reminders_data)}
                )
            except Exception as e:
                db.rollback()
                api_logger.error(
                    "❌ Error creating reminders",
                    extra={"appointment_id": appointment.id, "error": str(e)},
                    exc_info=True
                )
                raise HTTPException(status_code=500, detail=f"Error al crear recordatorios: {str(e)}")
        else:
            api_logger.debug(
                "ℹ️ No reminders to create",
                extra={"appointment_id": appointment.id}
            )
        
        # 🆕 Enviar aviso de privacidad automáticamente si es primera cita
        # Compliance: LFPDPPP - Consentimiento previo requerido antes del tratamiento
        # MEJOR PRÁCTICA: Enviar al agendar (no durante consulta) para que el paciente:
        # 1. Reciba el aviso ANTES de la consulta
        # 2. Pueda leerlo y aceptarlo con calma
        # 3. Llegue al consultorio con consentimiento ya aceptado
        consultation_type = appointment_data.consultation_type if hasattr(appointment_data, 'consultation_type') else appointment.consultation_type
        is_first_time = consultation_type and consultation_type.lower() in ['primera vez', 'primera_vez', 'primera']
        
        if is_first_time:
            try:
                import sys
                import os
                sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
                from privacy_service import send_privacy_notice_automatically, check_if_first_appointment
                
                # Check if this is truly the first appointment
                is_first_appointment = check_if_first_appointment(db, appointment.patient_id, current_user.id, appointment.id)
                
                if is_first_appointment:
                    privacy_result = await send_privacy_notice_automatically(
                        db=db,
                        patient_id=appointment.patient_id,
                        doctor=current_user,
                        consultation_type=consultation_type,
                        is_first_appointment=True
                    )
                    
                    if privacy_result and privacy_result.get("success"):
                        api_logger.info(
                            "✅ Privacy notice sent automatically for first appointment",
                            extra={
                                "appointment_id": appointment.id,
                                "patient_id": appointment.patient_id,
                                "consent_id": privacy_result.get("consent_id")
                            }
                        )
                    elif privacy_result and privacy_result.get("skipped"):
                        api_logger.debug(
                            f"ℹ️ Privacy notice auto-send skipped: {privacy_result.get('message')}",
                            extra={"patient_id": appointment.patient_id, "appointment_id": appointment.id}
                        )
            except Exception as e:
                # No fallar la creación de cita si falla el envío de aviso
                api_logger.warning(
                    f"⚠️ Error sending privacy notice automatically (non-blocking): {str(e)}",
                    extra={"appointment_id": appointment.id, "patient_id": appointment.patient_id},
                    exc_info=True
                )
        
        # Reload appointment with reminders for response
        appointment_with_reminders = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.reminders)
        ).filter(Appointment.id == appointment.id).first()
        
        return serialize_appointment(appointment_with_reminders) if appointment_with_reminders else appointment
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
        # Verify the appointment exists and belongs to the current doctor
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found or access denied")
        
        # Normalize incoming datetimes to CDMX naive to avoid timezone shifts
        def to_cdmx_naive(value):
            if not value:
                return None
            if isinstance(value, str):
                try:
                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except Exception:
                    dt = datetime.fromisoformat(value)
            else:
                dt = value
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=pytz.UTC)
            cdmx_tz = pytz.timezone('America/Mexico_City')
            local_dt = dt.astimezone(cdmx_tz)
            return local_dt.replace(tzinfo=None)

        data_dict = appointment_data.model_dump() if hasattr(appointment_data, 'model_dump') else appointment_data.dict()
        if data_dict.get('appointment_date'):
            data_dict['appointment_date'] = to_cdmx_naive(data_dict['appointment_date'])
        if data_dict.get('end_time'):
            data_dict['end_time'] = to_cdmx_naive(data_dict['end_time'])

        # Handle reminders update if provided
        reminders_data = appointment_data.reminders if hasattr(appointment_data, 'reminders') and appointment_data.reminders is not None else None
        
        # Remove reminders from data_dict before passing to crud.update_appointment
        # This prevents SQLAlchemy from trying to assign dict objects to the relationship
        data_dict.pop('reminders', None)
        
        if reminders_data is not None:
            # Validate reminders: maximum 3, unique reminder_number
            if len(reminders_data) > 3:
                raise HTTPException(status_code=400, detail="Maximum 3 reminders allowed per appointment")
            
            reminder_numbers = [r.reminder_number for r in reminders_data]
            if len(reminder_numbers) != len(set(reminder_numbers)):
                raise HTTPException(status_code=400, detail="Reminder numbers must be unique (1, 2, or 3)")
            
            for reminder in reminders_data:
                if reminder.reminder_number < 1 or reminder.reminder_number > 3:
                    raise HTTPException(status_code=400, detail="Reminder number must be between 1 and 3")
                if reminder.offset_minutes <= 0:
                    raise HTTPException(status_code=400, detail="Offset minutes must be greater than 0")
            
            # Delete existing reminders for this appointment
            db.query(AppointmentReminder).filter(
                AppointmentReminder.appointment_id == appointment_id
            ).delete()
            
            # Create new reminders
            for reminder_data in reminders_data:
                reminder = AppointmentReminder(
                    appointment_id=appointment_id,
                    reminder_number=reminder_data.reminder_number,
                    offset_minutes=reminder_data.offset_minutes,
                    enabled=reminder_data.enabled
                )
                db.add(reminder)
            
            db.commit()
            api_logger.info(
                "✅ Updated reminders for appointment",
                extra={"appointment_id": appointment_id, "reminder_count": len(reminders_data)}
            )
        
        # Update the appointment using CRUD (with normalized datetimes) pasando dict para evitar revalidación
        updated_appointment = crud.update_appointment(db, appointment_id, data_dict)
        
        # Reload the appointment with relationships and reminders for the response
        updated_appointment_with_relations = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.reminders)
        ).filter(Appointment.id == appointment_id).first()
        
        # Sincronizar con Google Calendar si está configurado
        if updated_appointment_with_relations and updated_appointment_with_relations.doctor_id:
            try:
                from services.google_calendar_service import GoogleCalendarService
                # Si la cita fue cancelada, eliminar el evento de Google Calendar
                if updated_appointment_with_relations.status == 'cancelled':
                    api_logger.info("🔄 Intentando eliminar evento de Google Calendar (vía PUT)", extra={
                        "doctor_id": updated_appointment_with_relations.doctor_id,
                        "appointment_id": appointment_id,
                        "status": updated_appointment_with_relations.status
                    })
                    result = GoogleCalendarService.delete_calendar_event(db, updated_appointment_with_relations.doctor_id, appointment_id)
                    api_logger.info(f"✅ Resultado de delete_calendar_event (vía PUT): {result}", extra={
                        "doctor_id": updated_appointment_with_relations.doctor_id,
                        "appointment_id": appointment_id,
                        "result": result
                    })
                else:
                    # Si no está cancelada, actualizar el evento
                    GoogleCalendarService.update_calendar_event(db, updated_appointment_with_relations.doctor_id, updated_appointment_with_relations)
            except Exception as e:
                # No fallar si Google Calendar no está configurado o hay error
                api_logger.error("❌ Error al sincronizar con Google Calendar (no crítico)", exc_info=True, extra={
                    "doctor_id": updated_appointment_with_relations.doctor_id if updated_appointment_with_relations else None,
                    "appointment_id": appointment_id,
                    "status": updated_appointment_with_relations.status if updated_appointment_with_relations else None,
                    "error": str(e)
                })
        
        api_logger.info(
            "✅ Appointment updated successfully",
            extra={"doctor_id": current_user.id, "appointment_id": appointment_id}
        )
        return serialize_appointment(updated_appointment_with_relations)
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error in update_appointment",
            extra={"doctor_id": current_user.id, "appointment_id": appointment_id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/appointments/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete/cancel specific appointment by ID"""
    try:
        # Find the appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found or access denied")
        
        doctor_id = appointment.doctor_id
        
        # Instead of hard delete, mark as cancelled for audit trail
        appointment.status = 'cancelled'
        appointment.cancelled_at = now_cdmx()
        appointment.cancelled_by = current_user.id
        appointment.cancelled_reason = "Cancelled by doctor"
        
        db.commit()
        db.refresh(appointment)
        
        # Sincronizar con Google Calendar si está configurado
        if doctor_id:
            try:
                from services.google_calendar_service import GoogleCalendarService
                api_logger.info("🔄 Intentando eliminar evento de Google Calendar", extra={
                    "doctor_id": doctor_id,
                    "appointment_id": appointment_id
                })
                result = GoogleCalendarService.delete_calendar_event(db, doctor_id, appointment.id)
                api_logger.info(f"✅ Resultado de delete_calendar_event: {result}", extra={
                    "doctor_id": doctor_id,
                    "appointment_id": appointment_id,
                    "result": result
                })
            except Exception as e:
                # No fallar si Google Calendar no está configurado o hay error
                api_logger.error("❌ Error al sincronizar eliminación con Google Calendar", exc_info=True, extra={
                    "doctor_id": doctor_id,
                    "appointment_id": appointment_id,
                    "error": str(e)
                })
        
        api_logger.info(
            "Appointment cancelled successfully",
            extra={"doctor_id": current_user.id, "appointment_id": appointment_id}
        )
        return {
            "message": "Appointment cancelled successfully",
            "appointment_id": appointment_id,
            "status": "cancelled",
            "cancelled_at": appointment.cancelled_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        api_logger.error(
            "❌ Error in delete_appointment",
            extra={"doctor_id": current_user.id, "appointment_id": appointment_id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

