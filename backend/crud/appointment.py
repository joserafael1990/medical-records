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
    # #region agent log
    import json
    log_path = '/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log'
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location":"appointment.py:19","message":"create_appointment entry","data":{"doctor_id":doctor_id,"appointment_data_type":type(appointment_data).__name__},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"}) + '\n')
    except: pass
    # #endregion
    # Handle both Pydantic model and dict
    if isinstance(appointment_data, dict):
        data = appointment_data.copy()
    else:
        data = appointment_data.model_dump()
    
    # #region agent log
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location":"appointment.py:26","message":"data extracted","data":{"appointment_date":str(data.get('appointment_date')),"appointment_date_type":type(data.get('appointment_date')).__name__,"patient_id":data.get('patient_id'),"appointment_type_id":data.get('appointment_type_id'),"office_id":data.get('office_id'),"data_keys":list(data.keys())},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"}) + '\n')
    except: pass
    # #endregion
        
    data['doctor_id'] = doctor_id
    
    # Parse appointment_date from string to datetime if needed
    if 'appointment_date' in data and isinstance(data['appointment_date'], str):
        from services.appointments.validation import parse_appointment_date
        # Get doctor's timezone
        doctor = db.query(Person).filter(Person.id == doctor_id).first()
        doctor_timezone = 'America/Mexico_City'
        if doctor:
            # Check office timezone if office_id is provided
            office_id = data.get('office_id')
            if office_id:
                from database import Office
                office = db.query(Office).filter(Office.id == office_id).first()
                if office:
                    doctor_timezone = office.timezone
        
        # Parse the date string
        parsed_date = parse_appointment_date(data['appointment_date'], doctor_timezone, doctor_id)
        # Convert to UTC and then to naive datetime for storage
        parsed_date_utc = parsed_date.astimezone(pytz.utc)
        tz = pytz.timezone(doctor_timezone)
        data['appointment_date'] = parsed_date_utc.astimezone(tz).replace(tzinfo=None)
    
    # Calculate end_time if not provided
    if 'end_time' not in data:
        start_time = data.get('appointment_date')
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"location":"appointment.py:31","message":"calculating end_time","data":{"start_time":str(start_time),"start_time_type":type(start_time).__name__ if start_time else None},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"B"}) + '\n')
        except: pass
        # #endregion
        if start_time:
            # Get doctor's appointment duration
            doctor = db.query(Person).filter(Person.id == doctor_id).first()
            duration = doctor.appointment_duration if doctor and doctor.appointment_duration else 30
            # #region agent log
            try:
                with open(log_path, 'a') as f:
                    f.write(json.dumps({"location":"appointment.py:36","message":"before timedelta calculation","data":{"start_time":str(start_time),"duration":duration,"start_time_type":type(start_time).__name__},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"B"}) + '\n')
            except: pass
            # #endregion
            # start_time is now a datetime object, so we can do arithmetic
            if isinstance(start_time, datetime):
                # Calculate end_time in the same timezone
                end_time_dt = start_time + timedelta(minutes=duration)
                data['end_time'] = end_time_dt
            else:
                # Fallback: if it's still a string, try to parse it
                from services.appointments.validation import parse_appointment_date
                doctor = db.query(Person).filter(Person.id == doctor_id).first()
                doctor_timezone = 'America/Mexico_City'
                if doctor and data.get('office_id'):
                    from database import Office
                    office = db.query(Office).filter(Office.id == data.get('office_id')).first()
                    if office:
                        doctor_timezone = office.timezone
                parsed_start = parse_appointment_date(start_time, doctor_timezone, doctor_id)
                parsed_start_utc = parsed_start.astimezone(pytz.utc)
                tz = pytz.timezone(doctor_timezone)
                start_time_naive = parsed_start_utc.astimezone(tz).replace(tzinfo=None)
                data['end_time'] = start_time_naive + timedelta(minutes=duration)
            
    # Remove fields that might not exist in Appointment model or are handled separately
    # (e.g. reminders might be in the input but are handled by service)
    valid_fields = {
        'patient_id', 'doctor_id', 'appointment_date', 'end_time',
        'appointment_type_id', 'office_id', 'consultation_type',
        'status', 'notes', 'reminder_sent', 'auto_reminder_enabled',
        'auto_reminder_offset_minutes'
    }
    
    filtered_data = {k: v for k, v in data.items() if k in valid_fields}
    
    # #region agent log
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location":"appointment.py:47","message":"before Appointment creation","data":{"filtered_keys":list(filtered_data.keys()),"appointment_date":str(filtered_data.get('appointment_date')),"appointment_date_type":type(filtered_data.get('appointment_date')).__name__ if filtered_data.get('appointment_date') else None,"end_time":str(filtered_data.get('end_time')),"end_time_type":type(filtered_data.get('end_time')).__name__ if filtered_data.get('end_time') else None},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"C"}) + '\n')
    except: pass
    # #endregion
    
    db_appointment = Appointment(**filtered_data)
    
    # #region agent log
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location":"appointment.py:49","message":"Appointment object created, before db.add","data":{},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"C"}) + '\n')
    except: pass
    # #endregion
    
    db.add(db_appointment)
    # #region agent log
    try:
        with open(log_path, 'a') as f:
            f.write(json.dumps({"location":"appointment.py:51","message":"before db.commit","data":{},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"D"}) + '\n')
    except: pass
    # #endregion
    try:
        db.commit()
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"location":"appointment.py:52","message":"after db.commit","data":{"appointment_id":db_appointment.id},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"D"}) + '\n')
        except: pass
        # #endregion
    except Exception as e:
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"location":"appointment.py:52","message":"db.commit failed","data":{"error_type":type(e).__name__,"error_message":str(e)},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"D"}) + '\n')
        except: pass
        # #endregion
        raise
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
        # 1. Parse ISO string to datetime
        dt_obj = datetime.fromisoformat(update_data['appointment_date'].replace('Z', '+00:00'))
        
        # 2. Ensure we have timezone info (assume CDMX if naive for safety, though frontend sends correct offsets now)
        cdmx_tz = pytz.timezone('America/Mexico_City')
        if dt_obj.tzinfo is None:
            dt_aware = cdmx_tz.localize(dt_obj)
        else:
            dt_aware = dt_obj.astimezone(cdmx_tz)
            
        # 3. Store as NAIVE CDMX time (Wall Clock Time)
        # This matches how create_appointment works and how the scheduler expects data
        update_data['appointment_date'] = dt_aware.replace(tzinfo=None)
        
        api_logger.debug(
            "🌍 Converted appointment_date to Naive CDMX for storage",
            extra={"appointment_id": appointment_id, "stored_value": update_data['appointment_date'].isoformat()}
        )
    
    # Recalculate end_time if appointment_date changed (duration comes from doctor's profile)
    if 'appointment_date' in update_data:
        start_time = update_data['appointment_date']
        # Get doctor's appointment_duration from persons table
        if appointment.doctor and appointment.doctor.appointment_duration:
            duration = appointment.doctor.appointment_duration
        else:
            duration = 30  # Default fallback
            
        # start_time is already naive CDMX, so just add duration
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
