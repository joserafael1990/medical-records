from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional, Union, Dict, Any
from datetime import date, datetime, timedelta
from fastapi import HTTPException
import pytz

from models import Appointment, Person, utc_now
from crud.base import get_cdmx_now, to_utc_for_storage
import schemas
from logger import get_logger

api_logger = get_logger("medical_records.api")

# ============================================================================
# APPOINTMENT OPERATIONS
# ============================================================================

def create_appointment(db: Session, appointment_data: Union[schemas.AppointmentCreate, Dict[str, Any]], doctor_id: int) -> Appointment:
    """Create a new appointment"""
    # Handle both Pydantic model and dict
    if isinstance(appointment_data, dict):
        data = appointment_data.copy()
    else:
        data = appointment_data.model_dump()
        
    data['doctor_id'] = doctor_id
    
    # Calculate end_time if not provided
    if 'end_time' not in data:
        start_time = data.get('appointment_date')
        if start_time:
            # Get doctor's appointment duration
            doctor = db.query(Person).filter(Person.id == doctor_id).first()
            duration = doctor.appointment_duration if doctor and doctor.appointment_duration else 30
            data['end_time'] = start_time + timedelta(minutes=duration)
            
    # Remove fields that might not exist in Appointment model or are handled separately
    # (e.g. reminders might be in the input but are handled by service)
    valid_fields = {
        'patient_id', 'doctor_id', 'appointment_date', 'end_time',
        'appointment_type_id', 'office_id', 'consultation_type',
        'status', 'notes', 'reminder_sent', 'auto_reminder_enabled',
        'auto_reminder_offset_minutes'
    }
    
    filtered_data = {k: v for k, v in data.items() if k in valid_fields}
    
    db_appointment = Appointment(**filtered_data)
    
    db.add(db_appointment)
    db.commit()
    db.refresh(db_appointment)
    
    # Sincronizar con Google Calendar si está configurado
    try:
        from services.google_calendar_service import GoogleCalendarService
        GoogleCalendarService.create_calendar_event(db, doctor_id, db_appointment)
    except Exception as e:
        # No fallar si Google Calendar no está configurado o hay error
        api_logger.warning("Error al sincronizar creación con Google Calendar (no crítico)", exc_info=True, extra={
            "doctor_id": doctor_id,
            "appointment_id": db_appointment.id
        })
    
    return db_appointment

def get_appointment(db: Session, appointment_id: int) -> Optional[Appointment]:
    """Get appointment by ID"""
    return db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor)
    ).filter(Appointment.id == appointment_id).first()

def get_appointments_by_patient(db: Session, patient_id: int) -> List[Appointment]:
    """Get appointments by patient"""
    return db.query(Appointment).options(
        joinedload(Appointment.doctor)
    ).filter(Appointment.patient_id == patient_id).order_by(desc(Appointment.appointment_date)).all()

def get_appointments_by_doctor(db: Session, doctor_id: int, date_from: Optional[date] = None, date_to: Optional[date] = None) -> List[Appointment]:
    """Get appointments by doctor"""
    query = db.query(Appointment).options(
        joinedload(Appointment.patient)
    ).filter(Appointment.doctor_id == doctor_id)
    
    if date_from:
        query = query.filter(Appointment.appointment_date >= date_from)
    if date_to:
        query = query.filter(Appointment.appointment_date <= date_to)
    
    return query.order_by(Appointment.appointment_date).all()

def get_appointments(
    db: Session,
    doctor_id: int,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    available_for_consultation: bool = False
) -> List[Appointment]:
    """Get appointments with optional filters"""
    query = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor),
        joinedload(Appointment.office)
    ).filter(Appointment.doctor_id == doctor_id)
    
    # Apply date filters
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            query = query.filter(Appointment.appointment_date >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date)
            query = query.filter(Appointment.appointment_date <= end_dt)
        except ValueError:
            pass
    
    # Apply status filter
    if status:
        query = query.filter(Appointment.status == status)
    
    # Filter for appointments available for consultation
    if available_for_consultation:
        query = query.filter(Appointment.status.in_(['confirmed', 'por_confirmar']))
    
    return query.order_by(desc(Appointment.appointment_date)).offset(skip).limit(limit).all()

def update_appointment(db: Session, appointment_id: int, appointment_data) -> Appointment:
    """Update appointment with CDMX timezone support
    appointment_data puede ser schemas.AppointmentUpdate o dict.
    """
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Permitir dict directo o modelo pydantic
    if isinstance(appointment_data, dict):
        update_data = {k: v for k, v in appointment_data.items() if v is not None}
    else:
        update_data = appointment_data.model_dump(exclude_unset=True)
    
    api_logger.debug(
        "🔄 CRUD update_appointment start",
        extra={
            "appointment_id": appointment_id,
            "original_appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
            "doctor_id": appointment.doctor_id,
            "doctor_duration": appointment.doctor.appointment_duration if appointment.doctor else None,
            "update_keys": list(update_data.keys())
        }
    )
    
    # Handle datetime conversion for appointment_date with CDMX timezone
    if 'appointment_date' in update_data and isinstance(update_data['appointment_date'], str):
        update_data['appointment_date'] = datetime.fromisoformat(
            update_data['appointment_date'].replace('Z', '+00:00')
        )
        # Convert to UTC for storage
        update_data['appointment_date'] = to_utc_for_storage(update_data['appointment_date'])
        api_logger.debug(
            "🌍 Converted appointment_date to UTC",
            extra={"appointment_id": appointment_id, "utc_value": update_data['appointment_date'].isoformat()}
        )
    
    # Recalculate end_time if appointment_date changed (duration comes from doctor's profile)
    if 'appointment_date' in update_data:
        start_time = update_data['appointment_date']
        # Get doctor's appointment_duration from persons table
        if appointment.doctor and appointment.doctor.appointment_duration:
            duration = appointment.doctor.appointment_duration
        else:
            duration = 30  # Default fallback
        update_data['end_time'] = start_time + timedelta(minutes=duration)
        api_logger.debug(
            "⏰ Recalculated end_time",
            extra={
                "appointment_id": appointment_id,
                "end_time": update_data['end_time'].isoformat(),
                "duration_minutes": duration
            }
        )
    
    # Handle cancellation
    if update_data.get('status') == 'cancelled' and 'cancelled_reason' in update_data:
        update_data['cancelled_at'] = get_cdmx_now().astimezone(pytz.utc)
    
    # Filter out relationship fields and non-existent fields before assignment
    # Only assign columns that exist in the Appointment model
    valid_fields = {
        'appointment_date', 'end_time', 'appointment_type_id', 'office_id',
        'consultation_type', 'status', 'reminder_sent', 'reminder_sent_at',
        'auto_reminder_enabled', 'auto_reminder_offset_minutes',
        'cancelled_reason', 'cancelled_at', 'cancelled_by'
    }
    
    # Remove relationship fields (patient, doctor, office, appointment_type_rel, reminders)
    # and fields that don't exist in the model
    filtered_data = {k: v for k, v in update_data.items() if k in valid_fields}
    
    for field, value in filtered_data.items():
        setattr(appointment, field, value)
    
    appointment.updated_at = get_cdmx_now().astimezone(pytz.utc)
    
    api_logger.debug(
        "💾 Final appointment state before commit",
        extra={
            "appointment_id": appointment_id,
            "stored_appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None,
            "stored_end_time": appointment.end_time.isoformat() if appointment.end_time else None,
            "doctor_duration": appointment.doctor.appointment_duration if appointment.doctor else None
        }
    )
    
    db.commit()
    db.refresh(appointment)
    
    # Sincronizar con Google Calendar si está configurado
    try:
        from services.google_calendar_service import GoogleCalendarService
        GoogleCalendarService.update_calendar_event(db, appointment.doctor_id, appointment)
    except Exception as e:
        # No fallar si Google Calendar no está configurado o hay error
        api_logger.warning("Error al sincronizar actualización con Google Calendar (no crítico)", exc_info=True, extra={
            "doctor_id": appointment.doctor_id,
            "appointment_id": appointment_id
        })
    
    api_logger.info(
        "✅ Appointment updated successfully",
        extra={
            "appointment_id": appointment_id,
            "doctor_id": appointment.doctor_id,
            "appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None
        }
    )
    
    return appointment

def cancel_appointment(db: Session, appointment_id: int, reason: str, cancelled_by: int) -> Appointment:
    """Cancel appointment"""
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    doctor_id = appointment.doctor_id
    
    appointment.status = 'cancelled'
    appointment.cancelled_reason = reason
    appointment.cancelled_at = utc_now()
    appointment.cancelled_by = cancelled_by
    appointment.updated_at = utc_now()
    
    db.commit()
    db.refresh(appointment)
    
    # Sincronizar con Google Calendar si está configurado
    if doctor_id:
        try:
            from services.google_calendar_service import GoogleCalendarService
            GoogleCalendarService.delete_calendar_event(db, doctor_id, appointment_id)
        except Exception as e:
            # No fallar si Google Calendar no está configurado o hay error
            api_logger.warning("Error al sincronizar eliminación con Google Calendar (no crítico)", exc_info=True, extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment_id
            })
    
    return appointment
