"""
Appointment management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime
import pytz

from database import get_db, Person, Appointment
from dependencies import get_current_user
from logger import get_logger
from appointment_service import AppointmentService
import crud
import schemas

api_logger = get_logger("api")

# CDMX timezone configuration
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')

def now_cdmx():
    """Get current datetime in CDMX timezone"""
    return datetime.now(SYSTEM_TIMEZONE)

router = APIRouter(prefix="/api", tags=["appointments"])


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
                available_for_consultation=available_for_consultation
            )
        else:
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
        
        # Transform to include patient information
        result = []
        for appointment in appointments:
            # Safely access patient information
            patient_name = "Paciente no encontrado"
            if appointment.patient:
                first_name = appointment.patient.first_name or ""
                paternal_surname = appointment.patient.paternal_surname or ""
                maternal_surname = appointment.patient.maternal_surname or ""
                
                # Build full name
                name_parts = [first_name, paternal_surname]
                if maternal_surname and maternal_surname != "null":
                    name_parts.append(maternal_surname)
                
                patient_name = " ".join(filter(None, name_parts)) or "Paciente sin nombre"
            
            # Since appointments are stored in CDMX timezone (without tzinfo), 
            # we assume they are already in CDMX timezone and just format them
            appointment_date_str = appointment.appointment_date.strftime('%Y-%m-%dT%H:%M:%S')
            end_time_str = appointment.end_time.strftime('%Y-%m-%dT%H:%M:%S') if appointment.end_time else None
            
            apt_dict = {
                "id": str(appointment.id),
                "patient_id": str(appointment.patient_id),
                "doctor_id": appointment.doctor_id,  # ✅ Agregado doctor_id
                "appointment_date": appointment_date_str,  # CDMX timezone format without timezone info
                "date_time": appointment_date_str,  # CDMX timezone format without timezone info
                "end_time": end_time_str,
                "appointment_type_id": appointment.appointment_type_id,
                "appointment_type_name": appointment.appointment_type_rel.name if appointment.appointment_type_rel else None,
                "office_id": appointment.office_id,
                "office_name": appointment.office.name if appointment.office else None,
                "consultation_type": appointment.consultation_type,  # ✅ Agregado
                "reason": appointment.reason,
                "notes": appointment.notes,
                "status": appointment.status,
                "priority": appointment.priority,
                "estimated_cost": str(getattr(appointment, 'estimated_cost', None)) if getattr(appointment, 'estimated_cost', None) else None,
                "insurance_covered": getattr(appointment, 'insurance_covered', None),
                # Auto reminder fields
                "auto_reminder_enabled": getattr(appointment, 'auto_reminder_enabled', None),
                "auto_reminder_offset_minutes": getattr(appointment, 'auto_reminder_offset_minutes', None),
                "auto_reminder_sent_at": appointment.auto_reminder_sent_at.isoformat() if getattr(appointment, 'auto_reminder_sent_at', None) else None,
                "cancelled_reason": appointment.cancelled_reason,
                "cancelled_at": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
                "created_at": appointment.created_at.isoformat(),
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None,
                "patient_name": patient_name,
                "patient": appointment.patient  # Include full patient object for frontend
            }
            result.append(apt_dict)
        
        return result
        
    except Exception as e:
        # Return empty list instead of error to prevent frontend crashes
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
        
        # Build the base query
        # Try to include appointment_type_rel, but handle gracefully if table doesn't exist
        try:
            query = db.query(Appointment).options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor),
                joinedload(Appointment.office),
                joinedload(Appointment.appointment_type_rel)
            ).filter(Appointment.doctor_id == current_user.id)
        except Exception:
            # Fallback if appointment_types table doesn't exist
            query = db.query(Appointment).options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor),
                joinedload(Appointment.office)
            ).filter(Appointment.doctor_id == current_user.id)
        
        
        # Handle different date filtering scenarios with CDMX timezone
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
            print(f"📅 Fetching appointments from {parsed_start} to {parsed_end} (CDMX timezone)")
            print(f"🌍 UTC range: {utc_start} to {utc_end}")
            
        elif effective_target_date:
            # Single date query for daily view
            parsed_date = datetime.fromisoformat(effective_target_date).date()
            
            # Create naive datetime bounds for the day (assuming appointments are stored in local time)
            day_start = datetime.combine(parsed_date, datetime.min.time())
            day_end = datetime.combine(parsed_date, datetime.max.time())
            
            query = query.filter(
                Appointment.appointment_date >= day_start,
                Appointment.appointment_date <= day_end
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
        
        # Execute query and return results
        appointments = query.order_by(Appointment.appointment_date).all()
        
        # Since appointments are stored in CDMX timezone (without tzinfo), 
        # we need to assume they are already in CDMX timezone for proper display
        cdmx_tz = pytz.timezone('America/Mexico_City')
        
        # Create a list of appointment dictionaries with converted dates
        result = []
        for appointment in appointments:
            # Since appointments are stored in CDMX timezone (without tzinfo),
            # we assume they are already in CDMX timezone and just format them
            appointment_date_str = appointment.appointment_date.strftime('%Y-%m-%dT%H:%M:%S') if appointment.appointment_date else None
            end_time_str = appointment.end_time.strftime('%Y-%m-%dT%H:%M:%S') if appointment.end_time else None
            
            # Create appointment dict with converted dates
            apt_dict = {
                "id": appointment.id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "appointment_date": appointment_date_str,
                "date_time": appointment_date_str,
                "end_time": end_time_str,
                "appointment_type_id": appointment.appointment_type_id,
                "appointment_type_name": appointment.appointment_type_rel.name if appointment.appointment_type_rel else None,
                "office_id": appointment.office_id,
                "office_name": appointment.office.name if appointment.office else None,
                "consultation_type": appointment.consultation_type,
                "reason": appointment.reason,
                "notes": appointment.notes,
                "status": appointment.status,
                "priority": appointment.priority,
                "room_number": getattr(appointment, 'room_number', None),
                # Auto reminder fields included for FE editing
                "auto_reminder_enabled": getattr(appointment, 'auto_reminder_enabled', None),
                "auto_reminder_offset_minutes": getattr(appointment, 'auto_reminder_offset_minutes', None),
                "auto_reminder_sent_at": appointment.auto_reminder_sent_at.isoformat() if getattr(appointment, 'auto_reminder_sent_at', None) else None,
                "patient": appointment.patient,
                "office": appointment.office
            }
            result.append(apt_dict)
        
        return result
    except Exception as e:
        print(f"Error in get_calendar_appointments: {str(e)}")
        return []


@router.get("/appointments/{appointment_id}")
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific appointment by ID"""
    try:
        print(f"🔍 Getting appointment {appointment_id} for doctor {current_user.id}")
        
        # Simple query first to debug
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == current_user.id
        ).first()
        
        print(f"🔍 Appointment found: {appointment}")
        
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
            "reason": appointment.reason,
            "notes": appointment.notes,
            "status": appointment.status,
            "priority": appointment.priority,
            "estimated_cost": str(getattr(appointment, 'estimated_cost', None)) if getattr(appointment, 'estimated_cost', None) else None,
            "insurance_covered": getattr(appointment, 'insurance_covered', None),
            # Campos opcionales (sin preparation_instructions; columna eliminada)
            "auto_reminder_enabled": getattr(appointment, 'auto_reminder_enabled', None),
            "auto_reminder_offset_minutes": getattr(appointment, 'auto_reminder_offset_minutes', None),
            "auto_reminder_sent_at": appointment.auto_reminder_sent_at.isoformat() if getattr(appointment, 'auto_reminder_sent_at', None) else None,
            "cancelled_reason": appointment.cancelled_reason,
            "cancelled_at": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
            "created_at": appointment.created_at.isoformat(),
            "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_appointment: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/appointments")
async def create_appointment(
    appointment_data: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new appointment"""
    try:
        print(f"🔍 Endpoint Debug - Received appointment_data:")
        print(f"📅 appointment_date: {appointment_data.appointment_date}")
        print(f"📅 appointment_date type: {type(appointment_data.appointment_date)}")
        print(f"📅 end_time: {appointment_data.end_time}")
        print(f"📅 end_time type: {type(appointment_data.end_time)}")
        
        # Create the appointment using CRUD
        appointment = crud.create_appointment(db, appointment_data, current_user.id)
        return appointment
    except Exception as e:
        print(f"❌ Error in create_appointment: {str(e)}")
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

        data_dict = appointment_data.dict()
        if data_dict.get('appointment_date'):
            data_dict['appointment_date'] = to_cdmx_naive(data_dict['appointment_date'])
        if data_dict.get('end_time'):
            data_dict['end_time'] = to_cdmx_naive(data_dict['end_time'])

        # Update the appointment using CRUD (with normalized datetimes) pasando dict para evitar revalidación
        updated_appointment = crud.update_appointment(db, appointment_id, data_dict)
        
        # Reload the appointment with relationships for the response
        updated_appointment_with_relations = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor)
        ).filter(Appointment.id == appointment_id).first()
        
        print(f"✅ Appointment {appointment_id} updated successfully")
        return updated_appointment_with_relations
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_appointment: {str(e)}")
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
        
        # Instead of hard delete, mark as cancelled for audit trail
        appointment.status = 'cancelled'
        appointment.cancelled_at = now_cdmx()
        appointment.cancelled_by = current_user.id
        appointment.cancelled_reason = "Cancelled by doctor"
        
        db.commit()
        
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
        print(f"❌ Error in delete_appointment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

