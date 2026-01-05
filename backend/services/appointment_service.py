"""
Appointment Service - Business logic for appointment management
Encapsulates complex appointment operations, scheduling, and availability logic
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import pytz

from database import Appointment, Person, AppointmentReminder
from logger import get_logger
import crud
import schemas

api_logger = get_logger("medical_records.api")

# CDMX timezone configuration
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')


class AppointmentService:
    """Service for managing appointments and scheduling logic"""
    
    @staticmethod
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

    @staticmethod
    def _apply_date_filters(
        query, 
        start_date: Optional[str], 
        end_date: Optional[str], 
        target_date: Optional[str],
        doctor_id: int
    ):
        """Apply date filters to the calendar query."""
        from services.consultation_service import now_cdmx
        
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

    @staticmethod
    def _process_calendar_results(appointments: List[Appointment], db: Session = None) -> List[Dict[str, Any]]:
        """Process appointment results and handle timezone conversion."""
        cdmx_tz = pytz.timezone('America/Mexico_City')
        result = []
        
        for appointment in appointments:
            # Use serialize_appointment to get the full structure with patient and office objects
            serialized = AppointmentService.serialize_appointment(appointment)
            
            # Handle timezone conversion for display
            if appointment.appointment_date.tzinfo is None:
                # Naive datetime (stored in CDMX) -> localize
                start_time = cdmx_tz.localize(appointment.appointment_date)
            else:
                # Aware datetime (stored in UTC) -> convert to CDMX
                start_time = appointment.appointment_date.astimezone(cdmx_tz)
                
            # Calculate end time - use doctor's duration if end_time is not set
            if appointment.end_time:
                if appointment.end_time.tzinfo is None:
                    end_time = cdmx_tz.localize(appointment.end_time)
                else:
                    end_time = appointment.end_time.astimezone(cdmx_tz)
            else:
                # Get doctor's appointment duration, fallback to 30 if not available
                duration_minutes = 30
                if appointment.doctor and appointment.doctor.appointment_duration:
                    # Try to get from already loaded relationship
                    duration_minutes = appointment.doctor.appointment_duration
                end_time = start_time + timedelta(minutes=duration_minutes)

            # Format patient name for calendar title
            patient_name = serialized.get("patient_name", "Paciente no encontrado")

            # Add calendar-specific fields to the serialized appointment
            serialized.update({
                "title": f"{patient_name} - {appointment.consultation_type or 'Consulta'}",
                "start": start_time.isoformat(),
                "end": end_time.isoformat(),
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
            
            result.append(serialized)
            
        return result

    @staticmethod
    def serialize_appointment(appointment: Appointment) -> Dict[str, Any]:
        """Serialize Appointment ORM instance to dict for API responses."""
        import pytz
        
        patient_name = "Paciente no encontrado"
        if appointment.patient:
            patient_name = appointment.patient.name or "Paciente sin nombre"

        # Convert appointment_date to CDMX timezone with offset
        cdmx_tz = pytz.timezone('America/Mexico_City')
        if appointment.appointment_date:
            if appointment.appointment_date.tzinfo is None:
                # If naive, assume it's in CDMX time
                localized = cdmx_tz.localize(appointment.appointment_date)
            else:
                # If has timezone, convert to CDMX
                localized = appointment.appointment_date.astimezone(cdmx_tz)
            appointment_date_str = localized.isoformat()
        else:
            appointment_date_str = None
        
        # Same for end_time
        if appointment.end_time:
            if appointment.end_time.tzinfo is None:
                localized_end = cdmx_tz.localize(appointment.end_time)
            else:
                localized_end = appointment.end_time.astimezone(cdmx_tz)
            end_time_str = localized_end.isoformat()
        else:
            end_time_str = None

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
            "patient": {
                "id": appointment.patient.id,
                "name": appointment.patient.name,
                "primary_phone": getattr(appointment.patient, 'primary_phone', None),
                "email": getattr(appointment.patient, 'email', None)
            } if appointment.patient else None,
            "office": {
                "id": appointment.office.id,
                "name": appointment.office.name,
                "address": getattr(appointment.office, 'address', None),
                "is_virtual": getattr(appointment.office, 'is_virtual', False),
                "virtual_url": getattr(appointment.office, 'virtual_url', None)
            } if appointment.office else None
        }

    @classmethod
    def get_calendar_appointments(
        cls,
        db: Session,
        doctor_id: int,
        date: Optional[str] = None,
        target_date: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get calendar appointments for specific date or date range - CDMX timezone aware"""
        query = cls._build_calendar_query(db, doctor_id)
        query = cls._apply_date_filters(query, start_date, end_date, target_date or date, doctor_id)
        
        appointments = query.order_by(Appointment.appointment_date).all()
        
        api_logger.info(
            f"📅 Retrieved {len(appointments)} appointments for calendar",
            extra={"doctor_id": doctor_id, "count": len(appointments)}
        )
        
        return cls._process_calendar_results(appointments, db)

    @classmethod
    def create_appointment_with_reminders(
        cls,
        db: Session,
        appointment_data: schemas.AppointmentCreate,
        doctor_id: int
    ) -> Dict[str, Any]:
        """Create appointment with optional reminders and privacy notice"""
        # #region agent log
        import json
        log_path = '/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log'
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"location":"appointment_service.py:270","message":"create_appointment_with_reminders entry","data":{"doctor_id":doctor_id,"appointment_date":str(appointment_data.appointment_date) if hasattr(appointment_data,'appointment_date') else None,"appointment_date_type":type(appointment_data.appointment_date).__name__ if hasattr(appointment_data,'appointment_date') else None,"patient_id":appointment_data.patient_id if hasattr(appointment_data,'patient_id') else None,"appointment_type_id":appointment_data.appointment_type_id if hasattr(appointment_data,'appointment_type_id') else None},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"}) + '\n')
        except: pass
        # #endregion
        # Extract reminders from appointment_data
        reminders_data = []
        if hasattr(appointment_data, 'reminders') and appointment_data.reminders is not None:
            reminders_data = list(appointment_data.reminders)
        
        # Validate reminders
        if len(reminders_data) > 3:
            raise HTTPException(status_code=400, detail="Maximum 3 reminders allowed per appointment")
        
        if reminders_data:
            reminder_numbers = [r.reminder_number for r in reminders_data]
            if len(reminder_numbers) != len(set(reminder_numbers)):
                raise HTTPException(status_code=400, detail="Reminder numbers must be unique (1, 2, or 3)")
            
            for reminder in reminders_data:
                if reminder.reminder_number < 1 or reminder.reminder_number > 3:
                    raise HTTPException(status_code=400, detail="Reminder number must be between 1 and 3")
                if reminder.offset_minutes <= 0:
                    raise HTTPException(status_code=400, detail="Offset minutes must be greater than 0")
        
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"location":"appointment_service.py:298","message":"calling crud.create_appointment","data":{"doctor_id":doctor_id},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"}) + '\n')
        except: pass
        # #endregion
        # Create the appointment
        appointment = crud.create_appointment(db, appointment_data, doctor_id)
        # #region agent log
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps({"location":"appointment_service.py:299","message":"crud.create_appointment returned","data":{"appointment_id":appointment.id if appointment else None},"timestamp":datetime.now().isoformat(),"sessionId":"debug-session","runId":"run1","hypothesisId":"A"}) + '\n')
        except: pass
        # #endregion
        
        # Create reminders if provided
        if reminders_data:
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
        
        # Reload appointment with reminders
        appointment_with_reminders = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.reminders)
        ).filter(Appointment.id == appointment.id).first()
        
        return cls.serialize_appointment(appointment_with_reminders) if appointment_with_reminders else appointment

    @classmethod
    def update_appointment_with_reminders(
        cls,
        db: Session,
        appointment_id: int,
        appointment_data: schemas.AppointmentUpdate,
        doctor_id: int
    ) -> Dict[str, Any]:
        """Update appointment and manage reminders"""
        # Get existing appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Verify ownership
        if appointment.doctor_id != doctor_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this appointment")
        
        # Update appointment fields using CRUD
        updated_appointment = crud.update_appointment(db, appointment_id, appointment_data)
        
        # Handle reminders update if provided
        if hasattr(appointment_data, 'reminders') and appointment_data.reminders is not None:
            # Delete existing reminders
            db.query(AppointmentReminder).filter(
                AppointmentReminder.appointment_id == appointment_id
            ).delete()
            
            # Create new reminders
            reminders_data = list(appointment_data.reminders)
            if len(reminders_data) > 3:
                raise HTTPException(status_code=400, detail="Maximum 3 reminders allowed")
            
            for reminder_data in reminders_data:
                reminder = AppointmentReminder(
                    appointment_id=appointment_id,
                    reminder_number=reminder_data.reminder_number,
                    offset_minutes=reminder_data.offset_minutes,
                    enabled=reminder_data.enabled
                )
                db.add(reminder)
            
            db.commit()
        
        # Reload with relationships
        appointment_with_reminders = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.reminders)
        ).filter(Appointment.id == appointment_id).first()
        
        return cls.serialize_appointment(appointment_with_reminders)

    @classmethod
    def delete_appointment(
        cls,
        db: Session,
        appointment_id: int,
        doctor_id: int
    ) -> Dict[str, str]:
        """Delete/cancel appointment"""
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Verify ownership
        if appointment.doctor_id != doctor_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this appointment")
        
        # Soft delete by updating status
        from utils.datetime_utils import utc_now
        appointment.status = 'cancelled'
        appointment.cancelled_at = utc_now()
        appointment.cancelled_reason = 'Cancelled by doctor'
        
        db.commit()
        
        # Remove from Google Calendar if exists
        try:
            from services.google_calendar_service import GoogleCalendarService
            GoogleCalendarService.delete_calendar_event(db, doctor_id, appointment_id)
            api_logger.info(
                "📅 Removed from Google Calendar",
                extra={"appointment_id": appointment_id, "doctor_id": doctor_id}
            )
        except Exception as e:
            api_logger.error(
                "❌ Failed to remove event from Google Calendar", 
                extra={"appointment_id": appointment_id, "error": str(e)}
            )
        
        api_logger.info(
            "🗑️ Appointment cancelled",
            extra={"appointment_id": appointment_id, "doctor_id": doctor_id}
        )
        
        return {"message": "Appointment cancelled successfully"}

    @staticmethod
    def should_send_reminder_by_id(reminder: AppointmentReminder, appointment: Appointment) -> bool:
        """Check if an individual reminder should be sent now based on offset and current time"""
        try:
            if not reminder.enabled or reminder.sent:
                return False
            
            if appointment.status not in ['por_confirmar', 'confirmada']:
                return False
            
            # Calculate when this reminder should be sent
            from utils.datetime_utils import now_cdmx
            send_time = appointment.appointment_date - timedelta(minutes=reminder.offset_minutes)
            
            # Check if we're in the send window (2-minute tolerance)
            now = now_cdmx().replace(tzinfo=None)
            window_end = send_time + timedelta(hours=6)
            
            should_send = send_time <= now <= window_end
            
            if not should_send:
                # Add debug log for why it's not ready
                api_logger.info(
                    "⏳ Reminder not ready",
                    extra={
                        "reminder_id": reminder.id,
                        "send_time": send_time.isoformat(),
                        "now": now.isoformat(),
                        "window_end": window_end.isoformat(),
                        "diff_minutes": (now - send_time).total_seconds() / 60
                    }
                )
            
            if should_send:
                api_logger.info(
                    "📤 Reminder ready to send",
                    extra={
                        "reminder_id": reminder.id,
                        "appointment_id": appointment.id,
                        "send_time": send_time.isoformat(),
                        "current_time": now.isoformat()
                    }
                )
            
            return should_send
        except Exception as e:
            api_logger.error(
                "❌ Error checking reminder send time",
                extra={"reminder_id": reminder.id, "error": str(e)},
                exc_info=True
            )
            return False

    @staticmethod
    def send_reminder_by_id(db: Session, reminder_id: int) -> bool:
        """Send a specific reminder by its ID"""
        # #region agent log
        import json
        from datetime import datetime
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "D", "location": "appointment_service.py:534", "message": "send_reminder_by_id called", "data": {"reminder_id": reminder_id}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
        except: pass
        # #endregion
        try:
            # Get the reminder with its appointment
            reminder = db.query(AppointmentReminder).options(
                joinedload(AppointmentReminder.appointment).joinedload(Appointment.patient),
                joinedload(AppointmentReminder.appointment).joinedload(Appointment.doctor),
                joinedload(AppointmentReminder.appointment).joinedload(Appointment.office),
                joinedload(AppointmentReminder.appointment).joinedload(Appointment.appointment_type_rel)
            ).filter(AppointmentReminder.id == reminder_id).first()
            
            # #region agent log
            try:
                with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "D", "location": "appointment_service.py:545", "message": "Reminder query result", "data": {"reminder_id": reminder_id, "reminder_found": reminder is not None, "appointment_found": reminder.appointment is not None if reminder else False}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
            except: pass
            # #endregion
            
            if not reminder or not reminder.appointment:
                api_logger.warning(
                    "⚠️ Reminder or appointment not found",
                    extra={"reminder_id": reminder_id}
                )
                return False
            
            appointment = reminder.appointment
            
            # Mark as sent before sending (atomic operation to prevent duplicates)
            if reminder.sent:
                api_logger.info(
                    "⚠️ Reminder already sent, skipping",
                    extra={"reminder_id": reminder_id}
                )
                return False
            
            # Mark as sent
            from utils.datetime_utils import utc_now
            reminder.sent = True
            reminder.sent_at = utc_now()
            db.commit()
            
            # Build WhatsApp message
            import pytz
            from services.office_helpers import build_office_address, resolve_maps_url, resolve_country_code
            from whatsapp_service import get_whatsapp_service
            
            mexico_tz = pytz.timezone('America/Mexico_City')
            local_dt = mexico_tz.localize(appointment.appointment_date)
            appointment_date = local_dt.strftime('%d de %B de %Y')
            appointment_time = local_dt.strftime('%I:%M %p')
            
            # Determine appointment type
            appointment_type = "presencial"
            if appointment.appointment_type_rel:
                appointment_type = "online" if appointment.appointment_type_rel.name == "En línea" else "presencial"
            
            if appointment.office and appointment.office.is_virtual and appointment.office.virtual_url:
                appointment_type = "online"
            
            # Prepare office details
            office_address_val = build_office_address(appointment.office) if appointment.office else "mi consultorio - No especificado"
            maps_url_val = resolve_maps_url(appointment.office, office_address_val) if appointment.office else None
            country_code_val = resolve_country_code(appointment.office) if appointment.office else '52'
            
            # #region agent log
            try:
                with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "E", "location": "appointment_service.py:591", "message": "About to call WhatsApp service", "data": {"reminder_id": reminder_id, "patient_phone": appointment.patient.primary_phone if appointment.patient else None, "country_code": country_code_val}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
            except: pass
            # #endregion
            service = get_whatsapp_service()
            resp = service.send_appointment_reminder(
                patient_phone=appointment.patient.primary_phone if appointment.patient else None,
                patient_full_name=appointment.patient.full_name if appointment.patient else "Paciente",
                appointment_date=appointment_date,
                appointment_time=appointment_time,
                doctor_title=(appointment.doctor.title if appointment.doctor else "Dr."),
                doctor_full_name=(appointment.doctor.full_name if appointment.doctor else "Médico"),
                office_address=office_address_val,
                country_code=country_code_val,
                appointment_type=appointment_type,
                maps_url=maps_url_val
            )
            
            # #region agent log
            try:
                with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps({"sessionId": "debug-session", "runId": "run1", "hypothesisId": "E", "location": "appointment_service.py:604", "message": "WhatsApp service response", "data": {"reminder_id": reminder_id, "resp": resp, "success": resp.get('success') if resp else None}, "timestamp": int(datetime.now().timestamp() * 1000)}) + "\n")
            except: pass
            # #endregion
            
            if resp and resp.get('success'):
                api_logger.info(
                    "✅ Reminder sent successfully",
                    extra={"reminder_id": reminder_id, "appointment_id": appointment.id}
                )
                return True
            else:
                # Rollback if sending failed
                reminder.sent = False
                reminder.sent_at = None
                db.commit()
                api_logger.warning(
                    "⚠️ Reminder sending failed, rolled back",
                    extra={"reminder_id": reminder_id, "response": resp}
                )
                return False
                
        except Exception as e:
            db.rollback()
            api_logger.error(
                "❌ Exception sending reminder",
                extra={"reminder_id": reminder_id, "error": str(e)},
                exc_info=True
            )
            return False
