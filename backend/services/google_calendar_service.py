"""
Google Calendar Service
Maneja autenticación OAuth y sincronización con Google Calendar
"""
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
import os

from database import GoogleCalendarToken, Appointment, GoogleCalendarEventMapping
from utils.datetime_utils import utc_now
from logger import get_logger

api_logger = get_logger("medical_records.google_calendar")

# Scopes necesarios para Google Calendar API
SCOPES = ['https://www.googleapis.com/auth/calendar']


class GoogleCalendarService:
    """Service para gestionar integración con Google Calendar"""
    
    @staticmethod
    def get_oauth_flow(redirect_uri: str) -> Flow:
        """Crear OAuth flow para autenticación"""
        # #region agent log
        import json
        import time
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"google_calendar_service.py:31","message":"Checking GOOGLE_CLIENT_ID","data":{"redirect_uri":redirect_uri},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.info("DEBUG: Checking GOOGLE_CLIENT_ID", extra={"hypothesisId":"A","redirect_uri":redirect_uri})
        # #endregion
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        # #region agent log
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"google_calendar_service.py:32","message":"GOOGLE_CLIENT_ID value","data":{"client_id_present":client_id is not None,"client_id_length":len(client_id) if client_id else 0,"client_id_preview":client_id[:10]+"..." if client_id and len(client_id)>10 else client_id},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.info("DEBUG: GOOGLE_CLIENT_ID value", extra={"hypothesisId":"A","client_id_present":client_id is not None,"client_id_length":len(client_id) if client_id else 0})
        # #endregion
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        # #region agent log
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"B","location":"google_calendar_service.py:33","message":"GOOGLE_CLIENT_SECRET value","data":{"client_secret_present":client_secret is not None,"client_secret_length":len(client_secret) if client_secret else 0},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.info("DEBUG: GOOGLE_CLIENT_SECRET value", extra={"hypothesisId":"B","client_secret_present":client_secret is not None,"client_secret_length":len(client_secret) if client_secret else 0})
        # #endregion
        
        if not client_id or not client_secret:
            # #region agent log
            log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A,B","location":"google_calendar_service.py:35","message":"Missing credentials - raising ValueError","data":{"client_id_missing":not client_id,"client_secret_missing":not client_secret},"timestamp":int(time.time()*1000)}
            try:
                with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                    f.write(json.dumps(log_data)+'\n')
            except: pass
            api_logger.error("ERROR: Missing Google Calendar credentials", extra={"hypothesisId":"A,B","client_id_missing":not client_id,"client_secret_missing":not client_secret,"client_id_present":client_id is not None,"client_secret_present":client_secret is not None})
            # #endregion
            raise ValueError("GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET deben estar configurados")
        
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=SCOPES
        )
        flow.redirect_uri = redirect_uri
        return flow
    
    @staticmethod
    def get_authorization_url(redirect_uri: str) -> str:
        """Obtener URL de autorización de Google"""
        # #region agent log
        import json
        import time
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"E","location":"google_calendar_service.py:53","message":"get_authorization_url called","data":{"redirect_uri":redirect_uri},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.debug("DEBUG: get_authorization_url called", extra={"hypothesisId":"E","redirect_uri":redirect_uri})
        # #endregion
        flow = GoogleCalendarService.get_oauth_flow(redirect_uri)
        # #region agent log
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"E","location":"google_calendar_service.py:55","message":"OAuth flow created successfully","data":{},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.debug("DEBUG: OAuth flow created successfully", extra={"hypothesisId":"E"})
        # #endregion
        authorization_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent'  # Forzar consent para obtener refresh_token
        )
        # #region agent log
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"E","location":"google_calendar_service.py:61","message":"Authorization URL generated","data":{"authorization_url_length":len(authorization_url) if authorization_url else 0},"timestamp":int(time.time()*1000)}
        try:
            with open('/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log', 'a') as f:
                f.write(json.dumps(log_data)+'\n')
        except: pass
        api_logger.debug("DEBUG: Authorization URL generated", extra={"hypothesisId":"E","authorization_url_length":len(authorization_url) if authorization_url else 0})
        # #endregion
        return authorization_url
    
    @staticmethod
    def exchange_code_for_tokens(db: Session, doctor_id: int, code: str, redirect_uri: str) -> GoogleCalendarToken:
        """Intercambiar código de autorización por tokens"""
        try:
            flow = GoogleCalendarService.get_oauth_flow(redirect_uri)
            flow.fetch_token(code=code)
            
            credentials = flow.credentials
        except Exception as e:
            error_msg = str(e)
            api_logger.error(f"Error al intercambiar código por tokens: {error_msg}", exc_info=True, extra={
                "doctor_id": doctor_id,
                "redirect_uri": redirect_uri,
                "error_type": type(e).__name__
            })
            # Re-lanzar con mensaje más descriptivo
            if "invalid_grant" in error_msg.lower():
                raise ValueError("El código de autorización es inválido o ya fue usado. Por favor, intenta conectar nuevamente.")
            raise ValueError(f"Error al conectar con Google Calendar: {error_msg}")
        
        # Calcular fecha de expiración
        expires_at = None
        if credentials.expiry:
            expires_at = credentials.expiry
        
        # Guardar tokens en base de datos
        token_data = GoogleCalendarToken(
            doctor_id=doctor_id,
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            token_expires_at=expires_at,
            sync_enabled=True
        )
        
        # Si ya existe token para este doctor, actualizar
        existing = db.query(GoogleCalendarToken).filter(GoogleCalendarToken.doctor_id == doctor_id).first()
        if existing:
            existing.access_token = token_data.access_token
            existing.refresh_token = token_data.refresh_token
            existing.token_expires_at = token_data.token_expires_at
            existing.sync_enabled = True
            existing.updated_at = utc_now()
            db.commit()
            db.refresh(existing)
            return existing
        else:
            db.add(token_data)
            db.commit()
            db.refresh(token_data)
            return token_data
    
    @staticmethod
    def get_valid_credentials(db: Session, doctor_id: int) -> Optional[Credentials]:
        """Obtener credenciales válidas (refrescar si es necesario)"""
        token_data = db.query(GoogleCalendarToken).filter(GoogleCalendarToken.doctor_id == doctor_id).first()
        
        if not token_data:
            return None
        
        needs_refresh = False
        if token_data.token_expires_at:
            # Asegurar que sea aware para comparación si viene naive de la BD
            expires_at = token_data.token_expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            # Agregar 5 minutos de margen para refrescar antes de que expire
            expiry_with_margin = expires_at - timedelta(minutes=5)
            if expiry_with_margin <= utc_now():
                needs_refresh = True
        else:
            # Si no hay fecha de expiración, asumir que necesita refresh
            needs_refresh = True
        
        credentials = Credentials(
            token=token_data.access_token,
            refresh_token=token_data.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
        )
        
        if needs_refresh and token_data.refresh_token:
            try:
                # Refrescar token
                credentials.refresh(Request())
                
                # Actualizar en BD
                token_data.access_token = credentials.token
                if credentials.expiry:
                    token_data.token_expires_at = credentials.expiry
                token_data.updated_at = utc_now()
                db.commit()
                
                api_logger.info("Token de Google Calendar refrescado", extra={"doctor_id": doctor_id})
            except Exception as e:
                api_logger.error("Error al refrescar token de Google Calendar", exc_info=True, extra={"doctor_id": doctor_id})
                return None
        
        return credentials
    
    @staticmethod
    def create_calendar_event(db: Session, doctor_id: int, appointment: Appointment) -> Optional[str]:
        """Crear evento en Google Calendar desde una cita"""
        # Verificar si ya existe mapeo (evitar crear eventos duplicados)
        existing_mapping = db.query(GoogleCalendarEventMapping).filter(
            GoogleCalendarEventMapping.appointment_id == appointment.id
        ).first()
        
        if existing_mapping:
            api_logger.debug("Ya existe mapeo para esta cita, no crear evento duplicado", extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment.id,
                "google_event_id": existing_mapping.google_event_id
            })
            return existing_mapping.google_event_id
        
        # Verificar que el doctor tenga Google Calendar conectado
        token_data = db.query(GoogleCalendarToken).filter(
            GoogleCalendarToken.doctor_id == doctor_id,
            GoogleCalendarToken.sync_enabled == True
        ).first()
        
        if not token_data:
            api_logger.debug("Google Calendar no conectado o sincronización deshabilitada", extra={"doctor_id": doctor_id})
            return None
        
        credentials = GoogleCalendarService.get_valid_credentials(db, doctor_id)
        if not credentials:
            api_logger.warning("No se pudieron obtener credenciales válidas", extra={"doctor_id": doctor_id})
            return None
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Obtener información del paciente y doctor
            patient_name = appointment.patient.full_name if appointment.patient else "Paciente"
            doctor_name = appointment.doctor.full_name if appointment.doctor else "Doctor"
            
            # Calcular hora de fin (usar end_time si existe, sino calcular)
            if appointment.end_time:
                end_datetime = appointment.end_time
            else:
                duration_minutes = appointment.doctor.appointment_duration if appointment.doctor and appointment.doctor.appointment_duration else 30
                end_datetime = appointment.appointment_date + timedelta(minutes=duration_minutes)
            
            # Convertir appointment a evento de Google Calendar
            event = {
                'summary': f'Cita médica - {patient_name}',
                'description': f'Paciente: {patient_name}\nDoctor: {doctor_name}',
                'start': {
                    'dateTime': appointment.appointment_date.isoformat(),
                    'timeZone': 'America/Mexico_City',
                },
                'end': {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'America/Mexico_City',
                },
            }
            
            calendar_id = token_data.calendar_id or 'primary'
            
            created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
            google_event_id = created_event.get('id')
            
            # Guardar mapeo
            mapping = GoogleCalendarEventMapping(
                appointment_id=appointment.id,
                google_event_id=google_event_id,
                doctor_id=doctor_id
            )
            db.add(mapping)
            db.commit()
            
            api_logger.info("Evento creado en Google Calendar", extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment.id,
                "google_event_id": google_event_id
            })
            
            # Track Google Calendar sync in Amplitude
            try:
                from services.amplitude_service import AmplitudeService
                AmplitudeService.track_calendar_sync(
                    event_type="appointment_created_with_calendar_sync",
                    appointment_id=appointment.id,
                    doctor_id=doctor_id,
                    success=True
                )
            except Exception as e:
                # Silently fail - Amplitude tracking is non-critical
                pass
            
            return google_event_id
            
        except HttpError as error:
            error_code = error.resp.status if hasattr(error, 'resp') else None
            error_message = str(error)
            api_logger.error("Error al crear evento en Google Calendar", exc_info=True, extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment.id,
                "error_code": error_code
            })
            
            # Track Google Calendar sync error in Amplitude
            try:
                from services.amplitude_service import AmplitudeService
                AmplitudeService.track_calendar_sync(
                    event_type="google_calendar_sync_error",
                    appointment_id=appointment.id,
                    doctor_id=doctor_id,
                    success=False,
                    error_message=error_message
                )
            except Exception:
                pass
            
            return None
        except Exception as e:
            error_message = str(e)
            api_logger.error("Error inesperado al crear evento en Google Calendar", exc_info=True, extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment.id
            })
            
            # Track Google Calendar sync error in Amplitude
            try:
                from services.amplitude_service import AmplitudeService
                AmplitudeService.track_calendar_sync(
                    event_type="google_calendar_sync_error",
                    appointment_id=appointment.id,
                    doctor_id=doctor_id,
                    success=False,
                    error_message=error_message
                )
            except Exception:
                pass
            
            return None
    
    @staticmethod
    def update_calendar_event(db: Session, doctor_id: int, appointment: Appointment) -> bool:
        """Actualizar evento en Google Calendar"""
        # Buscar mapeo
        mapping = db.query(GoogleCalendarEventMapping).filter(
            GoogleCalendarEventMapping.appointment_id == appointment.id
        ).first()
        
        if not mapping:
            # Si no existe mapeo, crear evento
            return GoogleCalendarService.create_calendar_event(db, doctor_id, appointment) is not None
        
        # Verificar que el doctor tenga Google Calendar conectado
        token_data = db.query(GoogleCalendarToken).filter(
            GoogleCalendarToken.doctor_id == doctor_id,
            GoogleCalendarToken.sync_enabled == True
        ).first()
        
        if not token_data:
            api_logger.debug("Google Calendar no conectado o sincronización deshabilitada", extra={"doctor_id": doctor_id})
            return False
        
        credentials = GoogleCalendarService.get_valid_credentials(db, doctor_id)
        if not credentials:
            return False
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Obtener información del paciente y doctor
            patient_name = appointment.patient.full_name if appointment.patient else "Paciente"
            doctor_name = appointment.doctor.full_name if appointment.doctor else "Doctor"
            
            # Calcular hora de fin
            if appointment.end_time:
                end_datetime = appointment.end_time
            else:
                duration_minutes = appointment.doctor.appointment_duration if appointment.doctor and appointment.doctor.appointment_duration else 30
                end_datetime = appointment.appointment_date + timedelta(minutes=duration_minutes)
            
            event = {
                'summary': f'Cita médica - {patient_name}',
                'description': f'Paciente: {patient_name}\nDoctor: {doctor_name}',
                'start': {
                    'dateTime': appointment.appointment_date.isoformat(),
                    'timeZone': 'America/Mexico_City',
                },
                'end': {
                    'dateTime': end_datetime.isoformat(),
                    'timeZone': 'America/Mexico_City',
                },
            }
            
            calendar_id = token_data.calendar_id or 'primary'
            
            service.events().update(
                calendarId=calendar_id,
                eventId=mapping.google_event_id,
                body=event
            ).execute()
            
            api_logger.info("Evento actualizado en Google Calendar", extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment.id,
                "google_event_id": mapping.google_event_id
            })
            
            # Track Google Calendar sync in Amplitude
            try:
                from services.amplitude_service import AmplitudeService
                AmplitudeService.track_calendar_sync(
                    event_type="appointment_updated_with_calendar_sync",
                    appointment_id=appointment.id,
                    doctor_id=doctor_id,
                    success=True
                )
            except Exception as e:
                # Silently fail - Amplitude tracking is non-critical
                pass
            
            return True
            
        except HttpError as error:
            error_code = error.resp.status if hasattr(error, 'resp') else None
            error_message = str(error)
            api_logger.error("Error al actualizar evento en Google Calendar", exc_info=True, extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment.id,
                "google_event_id": mapping.google_event_id,
                "error_code": error_code
            })
            
            # Track Google Calendar sync error in Amplitude
            try:
                from services.amplitude_service import AmplitudeService
                AmplitudeService.track_calendar_sync(
                    event_type="google_calendar_sync_error",
                    appointment_id=appointment.id,
                    doctor_id=doctor_id,
                    success=False,
                    error_message=error_message
                )
            except Exception:
                pass
            
            return False
        except Exception as e:
            error_message = str(e)
            api_logger.error("Error inesperado al actualizar evento en Google Calendar", exc_info=True, extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment.id
            })
            
            # Track Google Calendar sync error in Amplitude
            try:
                from services.amplitude_service import AmplitudeService
                AmplitudeService.track_calendar_sync(
                    event_type="google_calendar_sync_error",
                    appointment_id=appointment.id,
                    doctor_id=doctor_id,
                    success=False,
                    error_message=error_message
                )
            except Exception:
                pass
            
            return False
    
    @staticmethod
    def delete_calendar_event(db: Session, doctor_id: int, appointment_id: int) -> bool:
        """Eliminar evento de Google Calendar"""
        api_logger.info("🔍 delete_calendar_event llamado", extra={
            "doctor_id": doctor_id,
            "appointment_id": appointment_id
        })
        
        mapping = db.query(GoogleCalendarEventMapping).filter(
            GoogleCalendarEventMapping.appointment_id == appointment_id
        ).first()
        
        if not mapping:
            # No existe en Google Calendar, considerar éxito
            api_logger.info("⚠️ No existe mapeo para appointment_id, considerando éxito", extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment_id
            })
            return True
        
        # Verificar que el doctor tenga Google Calendar conectado
        token_data = db.query(GoogleCalendarToken).filter(
            GoogleCalendarToken.doctor_id == doctor_id,
            GoogleCalendarToken.sync_enabled == True
        ).first()
        
        if not token_data:
            api_logger.info("⚠️ Google Calendar no conectado o sincronización deshabilitada, eliminando mapeo", extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment_id
            })
            # Eliminar mapeo aunque no esté conectado
            db.delete(mapping)
            db.commit()
            return True
        
        api_logger.info("✅ Token encontrado, obteniendo credenciales", extra={
            "doctor_id": doctor_id,
            "appointment_id": appointment_id,
            "google_event_id": mapping.google_event_id
        })
        
        credentials = GoogleCalendarService.get_valid_credentials(db, doctor_id)
        if not credentials:
            api_logger.error("❌ No se pudieron obtener credenciales válidas", extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment_id
            })
            return False
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            calendar_id = token_data.calendar_id or 'primary'
            
            service.events().delete(calendarId=calendar_id, eventId=mapping.google_event_id).execute()
            
            # Eliminar mapeo
            db.delete(mapping)
            db.commit()
            
            api_logger.info("Evento eliminado de Google Calendar", extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment_id,
                "google_event_id": mapping.google_event_id
            })
            
            # Track Google Calendar sync in Amplitude
            try:
                from services.amplitude_service import AmplitudeService
                AmplitudeService.track_calendar_sync(
                    event_type="appointment_deleted_with_calendar_sync",
                    appointment_id=appointment_id,
                    doctor_id=doctor_id,
                    success=True
                )
            except Exception as e:
                # Silently fail - Amplitude tracking is non-critical
                pass
            
            return True
            
        except HttpError as error:
            # Si el evento ya no existe en Google Calendar (404), eliminar mapeo de todas formas
            if hasattr(error, 'resp') and error.resp.status == 404:
                db.delete(mapping)
                db.commit()
                api_logger.info("Evento ya no existe en Google Calendar, mapeo eliminado", extra={
                    "doctor_id": doctor_id,
                    "appointment_id": appointment_id
                })
                return True
            
            api_logger.error("Error al eliminar evento de Google Calendar", exc_info=True, extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment_id,
                "google_event_id": mapping.google_event_id,
                "error_code": error.resp.status if hasattr(error, 'resp') else None
            })
            return False
        except Exception as e:
            api_logger.error("Error inesperado al eliminar evento de Google Calendar", exc_info=True, extra={
                "doctor_id": doctor_id,
                "appointment_id": appointment_id
            })
            return False


