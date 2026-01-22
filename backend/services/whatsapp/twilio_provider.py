import os
import logging
from typing import Dict, Any, Optional
from .base import _format_phone_number_generic

logger = logging.getLogger(__name__)

class TwilioWhatsAppService:
    """Servicio para enviar mensajes de WhatsApp usando Twilio."""

    def __init__(self):
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.whatsapp_from = os.getenv('TWILIO_WHATSAPP_FROM')  # ej: whatsapp:+14155238886 o whatsapp:+52XXXXXXXXXX
        # Content SIDs para templates aprobados
        self.content_sid_appointment_reminder = os.getenv('TWILIO_CONTENT_SID_APPOINTMENT_REMINDER')
        self.content_sid_privacy_notice = os.getenv('TWILIO_CONTENT_SID_PRIVACY_NOTICE')
        self._client = None

        if not (self.account_sid and self.auth_token and self.whatsapp_from):
            # Only log as debug, not warning, since Twilio is optional
            logger.debug("Twilio WhatsApp not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM")

        # Inicializar cliente de forma lazy para evitar fallo si no está instalado
        try:
            from twilio.rest import Client  # type: ignore
            self._client = Client(self.account_sid, self.auth_token) if (self.account_sid and self.auth_token) else None
        except Exception as e:
            logger.warning(f"Twilio SDK not available or failed to init: {e}")
            self._client = None

    def _format_e164(self, phone: str, country_code: Optional[str]) -> str:
        return _format_phone_number_generic(phone, country_code)

    def send_text_message(self, to_phone: str, message: str, country_code: Optional[str] = None) -> Dict[str, Any]:
        if not self._client or not self.whatsapp_from:
            return {'success': False, 'error': 'Twilio WhatsApp not configured or SDK missing'}

        to_e164 = self._format_e164(to_phone, country_code)
        to = f"whatsapp:{to_e164}"
        from_ = self.whatsapp_from if self.whatsapp_from.startswith('whatsapp:') else f"whatsapp:{self.whatsapp_from}"

        # Log detallado para debugging
        logger.info(f"📤 Phone formatting details:")
        logger.info(f"   Original: {to_phone}")
        logger.info(f"   Country code: {country_code}")
        logger.info(f"   Formatted (E.164): {to_e164}")
        logger.info(f"   To (Twilio format): {to}")
        logger.info(f"   From: {from_}")

        try:
            logger.info(f"📤 Sending text message from {from_} to {to}")
            msg = self._client.messages.create(body=message, from_=from_, to=to)
            logger.info(f"✅ Message sent successfully: {msg.sid}")
            return {'success': True, 'message_sid': msg.sid}
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Twilio send error: {error_msg}")
            
            # Detectar errores específicos de configuración
            if 'could not find a Channel' in error_msg or '63007' in error_msg:
                return {
                    'success': False, 
                    'error': f'WhatsApp number not configured in Twilio Sandbox. Please verify your WhatsApp number ({self.whatsapp_from}) is connected to your Twilio Sandbox.',
                    'error_code': 'channel_not_found'
                }
            elif 'not configured' in error_msg.lower():
                return {
                    'success': False,
                    'error': 'WhatsApp not configured. Please configure your Twilio WhatsApp credentials.',
                    'error_code': 'not_configured'
                }
            
            return {'success': False, 'error': error_msg}

    def send_template_message(
        self,
        to_phone: str,
        content_sid: str,
        content_variables: Dict[str, str],
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Enviar mensaje usando template de Twilio (Content SID)"""
        if not self._client or not self.whatsapp_from:
            return {'success': False, 'error': 'Twilio WhatsApp not configured or SDK missing'}

        to_e164 = self._format_e164(to_phone, country_code)
        to = f"whatsapp:{to_e164}"
        from_ = self.whatsapp_from if self.whatsapp_from.startswith('whatsapp:') else f"whatsapp:{self.whatsapp_from}"

        try:
            # Twilio requiere content_variables como JSON string con formato específico
            # Las variables deben estar como un objeto JSON que se serializa a string
            import json
            
            logger.info(f"📤 Sending template message with Content SID: {content_sid}")
            logger.info(f"📤 Content variables (dict): {content_variables}")
            
            # Convertir el diccionario a JSON string
            # Twilio espera un JSON string que representa un objeto con las variables
            content_variables_json = json.dumps(content_variables)
            
            logger.info(f"📤 Content variables (JSON): {content_variables_json}")
            
            msg = self._client.messages.create(
                content_sid=content_sid,
                from_=from_,
                to=to,
                content_variables=content_variables_json
            )
            return {'success': True, 'message_sid': msg.sid}
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Twilio template send error: {error_msg}")
            
            # Log detallado del error para debugging
            if hasattr(e, 'code'):
                logger.error(f"Twilio error code: {e.code}")
            if hasattr(e, 'msg'):
                logger.error(f"Twilio error message: {e.msg}")
            
            return {'success': False, 'error': error_msg, 'error_code': 'template_format_error'}

    def send_appointment_reminder(
        self,
        patient_phone: str,
        patient_full_name: str,
        appointment_date: str,
        appointment_time: str,
        doctor_title: str,
        doctor_full_name: str,
        office_address: str,
        country_code: Optional[str] = None,
        appointment_type: str = "presencial",
        online_consultation_url: Optional[str] = None,
        maps_url: Optional[str] = None
    ) -> Dict[str, Any]:
        # Si hay Content SID configurado, usar template aprobado de Twilio
        if self.content_sid_appointment_reminder:
            # Limpiar nombre del doctor (remover título si está incluido)
            doctor_name_clean = doctor_full_name
            if doctor_title and doctor_title in doctor_full_name:
                doctor_name_clean = doctor_full_name.replace(doctor_title, "").strip()
            
            # Asegurar que maps_url tenga un valor válido
            if not maps_url:
                # Crear URL de Google Maps con la dirección
                maps_url = f"https://www.google.com/maps/search/?api=1&query={office_address.replace(' ', '+')}"
            
            # Variables para el template (ajusta según tu template en Twilio)
            # Template espera: {{1}} paciente, {{2}} fecha, {{3}} hora, {{4}} título médico, {{5}} nombre médico, {{6}} dirección, {{7}} URL Maps
            # Asegurar que todos los valores sean strings no vacíos
            content_variables = {
                '1': str(patient_full_name or 'Paciente'),
                '2': str(appointment_date or ''),
                '3': str(appointment_time or ''),
                '4': str(doctor_title or 'Dr'),
                '5': str(doctor_name_clean or ''),
                '6': str(office_address or 'Consultorio'),
                '7': str(maps_url or 'https://maps.google.com')
            }
            
            # Log para debugging
            logger.info(f"📋 Appointment reminder variables: {content_variables}")
            return self.send_template_message(
                to_phone=patient_phone,
                content_sid=self.content_sid_appointment_reminder,
                content_variables=content_variables,
                country_code=country_code
            )
        
        # Fallback a mensaje de texto libre (solo funciona dentro de ventana de 24h)
        place_line = "📍 Lugar: "
        if appointment_type == 'online' and online_consultation_url:
            place_line += f"Consulta en línea\n🔗 {online_consultation_url}"
        else:
            place_line += f"{office_address}"
            if maps_url:
                place_line += f"\n🗺️ {maps_url}"

        body = (
            f"Hola {patient_full_name},\n\n"
            f"🗓️ Recordatorio de tu cita: {appointment_date} a las {appointment_time}\n"
            f"👨‍⚕️ Con: {doctor_title} {doctor_full_name}\n"
            f"{place_line}\n\n"
            f"Si no puedes asistir, por favor responde a este mensaje."
        )

        return self.send_text_message(to_phone=patient_phone, message=body, country_code=country_code)

    def send_interactive_privacy_notice(
        self,
        patient_name: str,
        patient_phone: str,
        doctor_name: str,
        privacy_notice_url: str,
        consent_id: int,
        doctor_title: Optional[str] = None,
        doctor_full_name: Optional[str] = None,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envía aviso de privacidad con template o mensaje interactivo
        Si hay Content SID configurado, usa template aprobado. Si no, usa mensaje de texto con URL.
        Si el template falla, hace fallback automático a mensaje de texto.
        """
        # Separar título y nombre del doctor si no se proporcionaron por separado
        if doctor_title is None or doctor_full_name is None:
            if doctor_name.startswith(("Dr. ", "Dra. ", "Dr ", "Dra ")):
                parts = doctor_name.split(" ", 1)
                doctor_title = parts[0] + ("." if not parts[0].endswith(".") else "")
                doctor_full_name = parts[1] if len(parts) > 1 else doctor_name
            else:
                # Si no tiene título explícito, usar valores por defecto
                doctor_title = doctor_title or ""
                doctor_full_name = doctor_full_name or doctor_name
        
        # Si hay Content SID configurado, intentar usar template aprobado
        if self.content_sid_privacy_notice:
            # Variables para el template según el template en Twilio:
            # {{1}} = paciente (nombre del paciente)
            # {{2}} = titulo (título del doctor: "Dr.", "Dra.", etc.)
            # {{3}} = nombre doctor (nombre completo del doctor)
            # {{4}} = url privacidad (URL del aviso de privacidad)
            
            content_variables_num = {
                '1': patient_name,          # {{1}} = paciente
                '2': doctor_title,          # {{2}} = titulo (Dr., Dra., etc.)
                '3': doctor_full_name,      # {{3}} = nombre doctor
                '4': privacy_notice_url     # {{4}} = url privacidad
            }
            
            # Formato 2: Variables con nombres ({{patient_name}}, etc.) - alternativo
            content_variables_named = {
                'patient_name': patient_name,
                'doctor_title': doctor_title,
                'doctor_name': doctor_full_name,
                'privacy_url': privacy_notice_url,
                'consent_id': str(consent_id)
            }
            
            # Intentar primero con variables numéricas
            logger.info(f"📤 Attempting template with numeric variables: {content_variables_num}")
            result = self.send_template_message(
                to_phone=patient_phone,
                content_sid=self.content_sid_privacy_notice,
                content_variables=content_variables_num,
                country_code=country_code
            )
            
            if result.get('success'):
                return result
            
            # Si falla, intentar con variables nombradas
            error_msg = result.get('error', 'unknown error')
            if 'Content Variables' in error_msg or '21656' in error_msg:
                logger.warning(f"⚠️ Numeric variables failed, trying named variables...")
                logger.info(f"📤 Attempting template with named variables: {content_variables_named}")
                result = self.send_template_message(
                    to_phone=patient_phone,
                    content_sid=self.content_sid_privacy_notice,
                    content_variables=content_variables_named,
                    country_code=country_code
                )
                
                if result.get('success'):
                    return result
            
            # Si ambos formatos fallan, hacer fallback a mensaje de texto
            logger.warning(f"⚠️ Template failed with both formats ({error_msg}), falling back to text message")
            # Continuar al fallback de texto
        
        # Fallback a mensaje de texto con URL (solo funciona dentro de ventana de 24h)
        body = (
            f"Hola {patient_name},\n\n"
            f"Soy {doctor_name} y necesito tu consentimiento para brindarte "
            f"atención médica y manejar tus datos personales de forma segura.\n\n"
            f"📄 Lee nuestro Aviso de Privacidad completo aquí:\n"
            f"{privacy_notice_url}\n\n"
            f"IMPORTANTE:\n"
            f"✅ Si ACEPTAS, responde 'ACEPTO'\n"
            f"❌ Si NO ACEPTAS, simplemente NO respondas este mensaje\n\n"
            f"Este consentimiento es voluntario y puedes revocarlo en cualquier momento.\n\n"
            f"Ley Federal de Protección de Datos Personales (LFPDPPP)"
        )
        
        return self.send_text_message(to_phone=patient_phone, message=body, country_code=country_code)
