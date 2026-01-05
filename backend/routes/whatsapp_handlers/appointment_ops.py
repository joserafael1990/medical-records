"""
Appointment operations for WhatsApp integration (confirm/cancel)
"""
from typing import Optional
from sqlalchemy.orm import Session, joinedload
from datetime import timedelta
from database import Appointment, Person, AppointmentReminder
from utils.datetime_utils import utc_now
from logger import get_logger
from whatsapp_service import get_whatsapp_service
from .phone_utils import find_patient_by_phone

api_logger = get_logger("medical_records.api")

async def emit_appointment_event(event_type: str, data: dict):
    """
    Emit an event to all connected clients
    Currently disabled/placeholder as SSE is disabled
    """
    pass

async def _find_appointment_by_whatsapp_message_id(whatsapp_message_id: str, db: Session) -> Optional[int]:
    """
    Buscar appointment_id usando el whatsapp_message_id del recordatorio
    Esto elimina completamente la ambigüedad cuando se usa template
    """
    try:
        reminder = db.query(AppointmentReminder).filter(
            AppointmentReminder.whatsapp_message_id == whatsapp_message_id
        ).first()
        
        if reminder and reminder.appointment_id:
            api_logger.info(
                "✅ Found appointment by WhatsApp message_id",
                extra={
                    "whatsapp_message_id": whatsapp_message_id,
                    "appointment_id": reminder.appointment_id,
                    "reminder_id": reminder.id
                }
            )
            return reminder.appointment_id
        
        api_logger.warning(
            "⚠️ No appointment found for WhatsApp message_id",
            extra={"whatsapp_message_id": whatsapp_message_id}
        )
        return None
    except Exception as e:
        api_logger.error(
            "❌ Error finding appointment by WhatsApp message_id",
            extra={"whatsapp_message_id": whatsapp_message_id},
            exc_info=True
        )
        return None

async def cancel_appointment_via_whatsapp(appointment_id: Optional[int], patient_phone: str, db: Session):
    """
    Cancelar una cita cuando el paciente responde vía WhatsApp
    """
    try:
        api_logger.info(
            "🔄 Canceling appointment via WhatsApp",
            extra={"appointment_id": appointment_id, "patient_phone": patient_phone}
        )
        
        appointment = None
        patient = None
        
        if appointment_id is not None:
            # Buscar la cita por ID
            appointment = db.query(Appointment).filter(
                Appointment.id == appointment_id
            ).first()
            
            if not appointment:
                api_logger.warning(
                    "❌ Appointment not found when cancelling via WhatsApp",
                    extra={"appointment_id": appointment_id}
                )
                return
            
            # Verificar que el teléfono corresponde al paciente
            patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
        else:
            # Buscar paciente por teléfono
            matching_patient = find_patient_by_phone(patient_phone, db)
            
            if not matching_patient:
                api_logger.info(
                    "❌ No matching patient found for cancellation",
                    extra={"patient_phone": patient_phone}
                )
                return
            
            # Buscar la cita más reciente pendiente para este paciente
            now = utc_now()
            recent_threshold = now - timedelta(hours=2)
            
            # Primero buscar citas con recordatorio enviado recientemente
            appointment_with_recent_reminder = db.query(Appointment).join(
                AppointmentReminder
            ).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status.in_(['por_confirmar', 'confirmada']),
                AppointmentReminder.sent == True,
                AppointmentReminder.sent_at >= recent_threshold
            ).order_by(
                AppointmentReminder.sent_at.desc()
            ).first()
            
            if appointment_with_recent_reminder:
                appointment = appointment_with_recent_reminder
                patient = matching_patient
            else:
                # Fallback: buscar cita más próxima
                past_threshold = now - timedelta(days=1)
                future_threshold = now + timedelta(days=7)
                
                appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status.in_(['por_confirmar', 'confirmada']),
                    Appointment.appointment_date >= past_threshold,
                    Appointment.appointment_date <= future_threshold
                ).order_by(
                    Appointment.appointment_date.asc()
                ).first()
                
                if appointment:
                    patient = matching_patient
                else:
                    api_logger.warning(
                        "❌ No pending appointment found for patient",
                        extra={"patient_phone": patient_phone, "patient_id": matching_patient.id}
                    )
                    return
        
        if not patient:
            api_logger.error(
                "❌ Patient not found for appointment when cancelling via WhatsApp",
                extra={"appointment_id": appointment_id}
            )
            return
        
        # Check if already cancelled
        if appointment.status == 'cancelled':
            api_logger.info("Appointment already cancelled", extra={"appointment_id": appointment.id})
            return
        
        doctor_id = appointment.doctor_id
        
        # Cancelar la cita
        appointment.status = 'cancelled'
        appointment.cancelled_reason = 'Cancelada por el paciente vía WhatsApp'
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
        
        # Track WhatsApp cancellation in Amplitude
        try:
            from services.amplitude_service import AmplitudeService
            AmplitudeService.track_whatsapp_reminder_cancelled(
                appointment_id=appointment_id,
                patient_id=patient.id
            )
        except Exception as e:
            # Silently fail - Amplitude tracking is non-critical
            pass
        
        api_logger.info(
            "✅ Appointment cancelled successfully via WhatsApp",
            extra={"appointment_id": appointment_id}
        )
        
        # Emit SSE event to notify frontend
        try:
            await emit_appointment_event("appointment_cancelled", {
                "appointment_id": appointment_id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "status": appointment.status,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
            })
        except Exception as e:
            api_logger.warning("Failed to emit SSE event", extra={"error": str(e)})
        
    except Exception as e:
        db.rollback()
        api_logger.error(
            "❌ Error cancelling appointment via WhatsApp",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )


async def confirm_appointment_via_whatsapp(appointment_id: Optional[int], patient_phone: str, db: Session):
    """
    Confirmar una cita cuando el paciente responde vía WhatsApp
    """
    try:
        api_logger.info(
            "✅ Confirming appointment via WhatsApp",
            extra={"appointment_id": appointment_id, "patient_phone": patient_phone}
        )
        
        whatsapp = get_whatsapp_service()
        normalized_from_phone = whatsapp._format_phone_number(patient_phone)
        
        appointment = None
        patient = None
        
        if appointment_id is not None:
            appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
            if not appointment:
                api_logger.warning(
                    "❌ Appointment not found for confirmation via WhatsApp",
                    extra={"appointment_id": appointment_id}
                )
                return
            
            patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
            if not patient:
                api_logger.error(
                    "❌ Patient not found for appointment confirmation",
                    extra={"appointment_id": appointment_id}
                )
                return
        else:
            # Buscar paciente por teléfono usando la utilidad
            matching_patient = find_patient_by_phone(patient_phone, db)
            
            if not matching_patient:
                api_logger.info(
                    "❌ No matching patient found for confirmation",
                    extra={"patient_phone": patient_phone}
                )
                return
            
            # Buscar la cita correcta
            now = utc_now()
            recent_threshold = now - timedelta(hours=2)
            
            appointment_with_recent_reminder = db.query(Appointment).join(
                AppointmentReminder
            ).options(
                joinedload(Appointment.reminders)
            ).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status == 'por_confirmar',
                AppointmentReminder.sent == True,
                AppointmentReminder.sent_at >= recent_threshold
            ).order_by(
                AppointmentReminder.sent_at.desc()
            ).first()
            
            if appointment_with_recent_reminder:
                appointment = appointment_with_recent_reminder
                patient = matching_patient
            else:
                past_threshold = now - timedelta(days=1)
                future_threshold = now + timedelta(days=7)
                
                appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status == 'por_confirmar',
                    Appointment.appointment_date >= past_threshold,
                    Appointment.appointment_date <= future_threshold
                ).order_by(
                    Appointment.appointment_date.asc()
                ).first()
                
                if appointment:
                    patient = matching_patient
                else:
                    return
        
        if appointment.status == 'cancelled':
            return
        
        if appointment.status == 'confirmada':
            return
        
        appointment.status = 'confirmada'
        appointment.updated_at = utc_now()
        appointment.cancelled_reason = None
        
        try:
            db.commit()
            db.refresh(appointment)
            
            if appointment.status != 'confirmada':
                appointment.status = 'confirmada'
                db.commit()
                db.refresh(appointment)
        except Exception as commit_error:
            db.rollback()
            raise
        
        # Emit SSE event
        try:
            await emit_appointment_event("appointment_confirmed", {
                "appointment_id": appointment.id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "status": appointment.status,
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
            })
        except Exception as e:
            api_logger.warning("Failed to emit SSE event", extra={"error": str(e)})
        
        # Track in Amplitude
        try:
            from services.amplitude_service import AmplitudeService
            AmplitudeService.track_whatsapp_reminder_confirmed(
                appointment_id=appointment.id,
                patient_id=appointment.patient_id
            )
        except Exception as e:
            pass
            
    except Exception as e:
        db.rollback()
        api_logger.error(
            "❌ Error confirming appointment via WhatsApp",
            extra={"appointment_id": appointment_id},
            exc_info=True
        )

async def process_text_cancellation_request(text: str, patient_phone: str, db: Session):
    """
    Procesar solicitud de cancelación recibida como mensaje de texto
    """
    try:
        # Buscar paciente por teléfono
        matching_patient = find_patient_by_phone(patient_phone, db)
        
        if not matching_patient:
            api_logger.warning("🚫 Cancellation requested but no matching patient found", extra={"phone": patient_phone})
            return
        
        now = utc_now()
        past_threshold = now - timedelta(days=1)
        future_threshold = now + timedelta(days=7)
        recent_threshold = now - timedelta(hours=2)
        
        api_logger.info("🔍 Searching for appointment to cancel", extra={"patient_id": matching_patient.id, "text": text})
        
        appointment_with_recent_reminder = db.query(Appointment).join(
            AppointmentReminder
        ).options(
            joinedload(Appointment.reminders)
        ).filter(
            Appointment.patient_id == matching_patient.id,
            Appointment.status.in_(['confirmada', 'por_confirmar']),
            AppointmentReminder.sent == True,
            AppointmentReminder.sent_at >= recent_threshold
        ).order_by(
            AppointmentReminder.sent_at.desc()
        ).first()
        
        next_appointment = None
        selection_reason = ""
        
        if appointment_with_recent_reminder:
            next_appointment = appointment_with_recent_reminder
            selection_reason = "recent_reminder"
        else:
            # First look for confirmed upcoming appointments
            next_appointment = db.query(Appointment).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status == 'confirmada',
                Appointment.appointment_date >= past_threshold,
                Appointment.appointment_date <= future_threshold
            ).order_by(Appointment.appointment_date.asc()).first()
            selection_reason = "upcoming_confirmed" if next_appointment else ""
            
            if not next_appointment:
                # Then look for any non-cancelled upcoming appointments
                next_appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status != 'cancelled',
                    Appointment.appointment_date >= past_threshold,
                    Appointment.appointment_date <= future_threshold
                ).order_by(Appointment.appointment_date.asc()).first()
                selection_reason = "upcoming_any" if next_appointment else ""
            
            if not next_appointment:
                # Fallback to very recent appointments (up to 7 days ago) if no future ones found
                recent_date = now - timedelta(days=7)
                next_appointment = db.query(Appointment).filter(
                    Appointment.patient_id == matching_patient.id,
                    Appointment.status != 'cancelled',
                    Appointment.appointment_date >= recent_date
                ).order_by(Appointment.appointment_date.desc()).first()
                selection_reason = "recent_fallback_7d" if next_appointment else ""
        
        if not next_appointment:
            api_logger.info("ℹ️ No eligible appointment found to cancel", extra={"patient_id": matching_patient.id})
            return
        
        api_logger.info(
            "🚫 Cancelling appointment chosen by text request", 
            extra={
                "appointment_id": next_appointment.id, 
                "selection_reason": selection_reason,
                "appointment_date": next_appointment.appointment_date.isoformat(),
                "patient_id": matching_patient.id
            }
        )
        
        doctor_id = next_appointment.doctor_id
        
        next_appointment.status = 'cancelled'
        next_appointment.cancelled_reason = f'cancelled by patient via text: "{text}"'
        next_appointment.cancelled_at = utc_now()
        next_appointment.cancelled_by = matching_patient.id
        next_appointment.updated_at = utc_now()
        
        try:
            db.commit()
            db.refresh(next_appointment)
        except Exception as commit_error:
            api_logger.error("❌ Error committing cancellation", exc_info=True)
            db.rollback()
            raise commit_error
        
        if doctor_id:
            try:
                from services.google_calendar_service import GoogleCalendarService
                GoogleCalendarService.delete_calendar_event(db, doctor_id, next_appointment.id)
            except Exception as google_error:
                api_logger.warning("⚠️ Error syncing cancellation with Google Calendar", exc_info=True)
        
        api_logger.info("✅ Cancellation successful via text", extra={"appointment_id": next_appointment.id})
        
    except Exception as e:
        api_logger.error("❌ Critical error in process_text_cancellation_request", exc_info=True)
        db.rollback()
