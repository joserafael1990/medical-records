"""
WhatsApp Messaging Service
- Soporta Meta Cloud API (existente)
- Agrega soporte para Twilio WhatsApp
"""
import os
import requests
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

# Configurar logging
logger = logging.getLogger(__name__)

# =============================================================
# Utilidades comunes
# =============================================================
def _format_phone_number_generic(phone: str, country_code: Optional[str]) -> str:
    """Formatea número a E.164 simple. Devuelve con prefijo +.
    - Si phone inicia con +, se respeta
    - Si tiene 10 dígitos y hay country_code, se antepone
    - Remueve espacios, guiones y paréntesis
    """
    if not phone:
        return phone
    clean = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    if clean.startswith('+'):
        return clean
    if country_code:
        cc = country_code if not country_code.startswith('+') else country_code[1:]
        if clean.startswith(cc):
            return f"+{clean}"
        if len(clean) == 10:
            return f"+{cc}{clean}"
        return f"+{clean}"
    # fallback México
    if len(clean) == 10:
        return f"+52{clean}"
    return f"+{clean}"

class WhatsAppService:
    """Servicio para interactuar con WhatsApp Business API de Meta"""
    
    def __init__(self):
        """Inicializar servicio con credenciales de Meta"""
        self.phone_id = os.getenv('META_WHATSAPP_PHONE_ID')
        self.access_token = os.getenv('META_WHATSAPP_TOKEN')
        self.api_version = os.getenv('META_WHATSAPP_API_VERSION', 'v24.0')
        self.base_url = f'https://graph.facebook.com/{self.api_version}'
        
        if not self.phone_id or not self.access_token:
            logger.warning("WhatsApp credentials not configured. Service will not work.")
    
    def _get_headers(self) -> Dict[str, str]:
        """Obtener headers para peticiones a la API"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def _format_phone_number(self, phone: str, country_code: str = None) -> str:
        """
        Formatear número de teléfono para WhatsApp
        Input: 5512345678, 581234567890, +581234567890
        Output: 581234567890 (sin +, con código de país)
        
        Args:
            phone: Número de teléfono a formatear
            country_code: Código de país (sin +). Si es None, usa '52' (México) como fallback
        """
        # Usar código de país por defecto si no se proporciona
        if country_code is None:
            country_code = '52'  # México como fallback
        
        # Remover espacios, guiones, paréntesis
        phone = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Remover símbolo + si existe
        if phone.startswith('+'):
            phone = phone[1:]
        
        # Remover el símbolo + del country_code si lo tiene
        if country_code.startswith('+'):
            country_code = country_code[1:]
        
        # Si el número ya tiene el código de país, devolverlo
        if phone.startswith(country_code):
            return phone
        
        # Si el número tiene 10 dígitos (número local), agregar código de país
        if len(phone) == 10:
            phone = f'{country_code}{phone}'
        
        return phone
    
    def send_template_message(
        self, 
        to_phone: str, 
        template_name: str, 
        template_params: List[str],
        language_code: str = 'es',
        country_code: str = None
    ) -> Dict[str, Any]:
        """
        Enviar mensaje usando plantilla aprobada
        
        Args:
            to_phone: Número de teléfono destino (ej: 5512345678)
            template_name: Nombre de la plantilla aprobada
            template_params: Lista de parámetros para la plantilla
            language_code: Código de idioma (es, es_MX, en, etc.)
            country_code: Código de país para formatear el teléfono (ej: '52', '58')
        
        Returns:
            Dict con resultado del envío
        """
        if not self.phone_id or not self.access_token:
            return {
                'success': False,
                'error': 'WhatsApp not configured. Please set META_WHATSAPP_PHONE_ID and META_WHATSAPP_TOKEN'
            }
        
        url = f'{self.base_url}/{self.phone_id}/messages'
        formatted_phone = self._format_phone_number(to_phone, country_code)
        logger.info(f"📞 Original phone: {to_phone}, Country code: {country_code}, Formatted phone: {formatted_phone}")
        
        # Construir componentes de la plantilla
        components = []
        if template_params:
            parameters = [{'type': 'text', 'text': str(param)} for param in template_params]
            components.append({
                'type': 'body',
                'parameters': parameters
            })
        
        payload = {
            'messaging_product': 'whatsapp',
            'to': formatted_phone,
            'type': 'template',
            'template': {
                'name': template_name,
                'language': {'code': language_code},
                'components': components
            }
        }
        
        # Log detallado para debugging
        
        try:
            logger.info(f"Sending WhatsApp to {formatted_phone} using template {template_name}")
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"WhatsApp sent successfully. Message ID: {result.get('messages', [{}])[0].get('id')}")
            
            return {
                'success': True,
                'message_id': result.get('messages', [{}])[0].get('id'),
                'response': result
            }
            
        except requests.exceptions.HTTPError as e:
            # Manejo robusto del cuerpo de error
            status_code = e.response.status_code if e.response is not None else None
            if e.response is not None:
                try:
                    error_detail = e.response.json()
                except Exception:
                    try:
                        error_detail = e.response.text
                    except Exception:
                        error_detail = str(e)
            else:
                error_detail = str(e)
            
            # Try to extract status code from error message if not available directly
            if status_code is None and '401' in str(e):
                status_code = 401
            elif status_code is None and '403' in str(e):
                status_code = 403
                
            logger.error(f"HTTP Error sending WhatsApp: {error_detail}, Status: {status_code}")
            
            # Check for specific error types
            if status_code == 401 or '401' in str(e) or 'Unauthorized' in str(e):
                return {
                    'success': False,
                    'error': 'WhatsApp credentials invalid or expired. Please contact administrator.',
                    'details': error_detail
                }
            elif status_code == 403 or '403' in str(e) or 'Forbidden' in str(e):
                return {
                    'success': False,
                    'error': 'WhatsApp access forbidden. Please check permissions.',
                    'details': error_detail
                }
            else:
                return {
                    'success': False,
                    'error': f'HTTP Error {status_code}',
                    'details': error_detail
                }
        except Exception as e:
            logger.error(f"Error sending WhatsApp: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_simple_message(self, to_phone: str, message: str, country_code: str = None) -> Dict[str, Any]:
        """
        Enviar mensaje simple de texto
        """
        if not self.phone_id or not self.access_token:
            return {
                'success': False,
                'error': 'WhatsApp not configured. Please set META_WHATSAPP_PHONE_ID and META_WHATSAPP_TOKEN'
            }
        
        url = f'{self.base_url}/{self.phone_id}/messages'
        formatted_phone = self._format_phone_number(to_phone, country_code)
        logger.info(f"📞 Sending simple message to {formatted_phone}")
        
        payload = {
            'messaging_product': 'whatsapp',
            'to': formatted_phone,
            'type': 'text',
            'text': {
                'body': message
            }
        }
        
        try:
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Simple message sent successfully. Message ID: {result.get('messages', [{}])[0].get('id')}")
            
            return {
                'success': True,
                'message_id': result.get('messages', [{}])[0].get('id'),
                'response': result
            }
            
        except requests.exceptions.HTTPError as e:
            error_detail = e.response.json() if e.response else str(e)
            status_code = e.response.status_code if e.response else None
            logger.error(f"HTTP Error sending simple message: {error_detail}, Status: {status_code}")
            
            return {
                'success': False,
                'error': f'HTTP Error {status_code}',
                'details': error_detail
            }
        except Exception as e:
            logger.error(f"Error sending simple message: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_appointment_reminder(
        self,
        patient_phone: str,
        patient_full_name: str,
        appointment_date: str,
        appointment_time: str,
        doctor_title: str,
        doctor_full_name: str,
        office_address: str,
        country_code: str = None,
        appointment_type: str = "presencial",
        online_consultation_url: str = None,
        maps_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enviar recordatorio de cita médica usando plantilla aprobada
        
        Usa la plantilla 'appointment_reminder' aprobada en Meta Business Manager
        
        Args:
            country_code: Código de país del consultorio. Si es None, usa '52' (México) como fallback
            appointment_type: "presencial" o "online"
            online_consultation_url: URL para citas online (parámetro 7)
        """
        # Preparar parámetros para la plantilla según el formato exacto:
        # ¡Hola *{{1}}*, 🗓️
        # Este es un recordatorio de tu cita hoy *{{2}} a las {{3}}* con {{4}} {{5}}
        # 📍 *Lugar:* {{6}}
        
        # Usar maps_url de Office si viene, si no generar una de respaldo (param 7)
        maps_url_final = maps_url or f"https://www.google.com/maps/search/?api=1&query={office_address.replace(' ', '+')}"

        # Dirección limpia sin URL (param 6)
        office_address_clean = str(office_address or "Consultorio médico")

        # Parámetros EXACTOS según plantilla aprobada:
        # {{1}} paciente, {{2}} fecha, {{3}} hora, {{4}} título, {{5}} nombre médico, {{6}} dirección, {{7}} URL Maps
        template_params = [
            str(patient_full_name or "Paciente"),
            str(appointment_date or "Fecha no especificada"),
            str(appointment_time or "Hora no especificada"),
            str(doctor_title or "Dr"),
            str(doctor_full_name.replace(doctor_title, "").strip() if doctor_title and doctor_title in doctor_full_name else (doctor_full_name or "Médico")),
            office_address_clean,
            maps_url_final
        ]

        # Debug logging
        print(f"📱 Template parameters: {template_params}")
        print(f"📱 Doctor title: {doctor_title}")
        print(f"📱 Doctor full name: {doctor_full_name}")
        print(f"📱 Office address: {office_address_clean}")
        print(f"🗺️ Maps URL: {maps_url_final}")
        
        
        return self.send_template_message(
            to_phone=patient_phone,
            template_name='appointment_reminder',
            template_params=template_params,
            language_code='es',
            country_code=country_code
        )
    
    def send_lab_results_notification(
        self,
        patient_phone: str,
        patient_name: str,
        study_name: str,
        secure_link: str
    ) -> Dict[str, Any]:
        """
        Notificar que los resultados de laboratorio están disponibles
        
        Requiere plantilla 'lab_results_ready' aprobada en Meta
        """
        template_params = [
            patient_name,
            study_name,
            secure_link
        ]
        
        return self.send_template_message(
            to_phone=patient_phone,
            template_name='lab_results_ready',
            template_params=template_params,
            language_code='es'
        )
    
    def send_generic_notification(
        self,
        patient_phone: str,
        message: str,
        office_name: str,
        office_phone: str
    ) -> Dict[str, Any]:
        """
        Enviar notificación genérica
        
        Requiere plantilla 'appointment_confirmation' aprobada en Meta
        """
        template_params = [
            message,
            office_name,
            office_phone
        ]
        
        return self.send_template_message(
            to_phone=patient_phone,
            template_name='appointment_confirmation',
            template_params=template_params,
            language_code='es'
        )
    
    def send_upload_link(
        self,
        patient_phone: str,
        patient_name: str,
        study_name: str,
        upload_link: str
    ) -> Dict[str, Any]:
        """
        Enviar link seguro para subir resultados de estudios
        
        Usa plantilla 'lab_results_ready' (reutilizada)
        """
        return self.send_lab_results_notification(
            patient_phone=patient_phone,
            patient_name=patient_name,
            study_name=study_name,
            secure_link=upload_link
        )
    
    def get_message_status(self, message_id: str) -> Dict[str, Any]:
        """
        Obtener estado de un mensaje enviado
        
        Estados posibles: sent, delivered, read, failed
        """
        if not self.access_token:
            return {'success': False, 'error': 'WhatsApp not configured'}
        
        url = f'{self.base_url}/{message_id}'
        
        try:
            response = requests.get(url, headers=self._get_headers(), timeout=10)
            response.raise_for_status()
            return {
                'success': True,
                'data': response.json()
            }
        except Exception as e:
            logger.error(f"Error getting message status: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_interactive_privacy_notice(
        self,
        patient_name: str,
        patient_phone: str,
        doctor_name: str,
        privacy_notice_url: str,
        consent_id: int,
        country_code: str = None
    ) -> Dict[str, Any]:
        """
        Envía aviso de privacidad con UN SOLO botón interactivo "Acepto"
        Cumple con LFPDPPP - Consentimiento libre e informado
        
        Args:
            patient_name: Nombre del paciente
            patient_phone: Teléfono del paciente
            doctor_name: Nombre completo del médico
            privacy_notice_url: URL del aviso completo
            consent_id: ID del registro de consentimiento
            country_code: Código de país
            
        Returns:
            Dict con resultado del envío (message_id, etc)
        """
        if not self.phone_id or not self.access_token:
            return {
                'success': False,
                'error': 'WhatsApp not configured. Please set META_WHATSAPP_PHONE_ID and META_WHATSAPP_TOKEN'
            }
        
        url = f'{self.base_url}/{self.phone_id}/messages'
        formatted_phone = self._format_phone_number(patient_phone, country_code)
        
        # Mensaje con botón interactivo
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "interactive",
            "interactive": {
                "type": "button",
                "header": {
                    "type": "text",
                    "text": "📋 Aviso de Privacidad"
                },
                "body": {
                    "text": f"Hola {patient_name},\n\n"
                            f"Soy {doctor_name} y necesito tu consentimiento para brindarte "
                            f"atención médica y manejar tus datos personales de forma segura.\n\n"
                            f"📄 Lee nuestro Aviso de Privacidad completo aquí:\n"
                            f"{privacy_notice_url}\n\n"
                            f"IMPORTANTE:\n"
                            f"✅ Si ACEPTAS, presiona el botón 'Acepto' abajo\n"
                            f"❌ Si NO ACEPTAS, simplemente NO respondas este mensaje\n\n"
                            f"Este consentimiento es voluntario y puedes revocarlo en cualquier momento.\n\n"
                            f"Ley Federal de Protección de Datos Personales (LFPDPPP)"
                },
                "footer": {
                    "text": "Puedes revocar tu consentimiento contactando al consultorio"
                },
                "action": {
                    "buttons": [
                        {
                            "type": "reply",
                            "reply": {
                                "id": f"accept_privacy_{consent_id}",
                                "title": "✅ Acepto"
                            }
                        }
                    ]
                }
            }
        }
        
        try:
            response = requests.post(
                url,
                headers=self._get_headers(),
                json=payload,
                timeout=10
            )
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"✅ Interactive privacy notice sent to {formatted_phone}")
            
            return {
                'success': True,
                'message_id': result.get('messages', [{}])[0].get('id'),
                'phone': formatted_phone,
                'response': result
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error sending interactive privacy notice: {str(e)}")
            error_detail = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                except:
                    error_detail = e.response.text
            
            return {
                'success': False,
                'error': error_detail
            }
    
    def send_text_message(
        self,
        to_phone: str,
        message: str,
        country_code: str = None
    ) -> Dict[str, Any]:
        """
        Envía mensaje de texto simple (sin template)
        Útil para confirmaciones y respuestas
        
        Args:
            to_phone: Número de teléfono destino
            message: Texto del mensaje
            country_code: Código de país
            
        Returns:
            Dict con resultado del envío
        """
        if not self.phone_id or not self.access_token:
            return {'success': False, 'error': 'WhatsApp not configured'}
        
        url = f'{self.base_url}/{self.phone_id}/messages'
        formatted_phone = self._format_phone_number(to_phone, country_code)
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": formatted_phone,
            "type": "text",
            "text": {
                "preview_url": True,
                "body": message
            }
        }
        
        try:
            response = requests.post(
                url,
                headers=self._get_headers(),
                json=payload,
                timeout=10
            )
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"✅ Text message sent to {formatted_phone}")
            
            return {
                'success': True,
                'message_id': result.get('messages', [{}])[0].get('id'),
                'response': result
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Error sending text message: {str(e)}")
            return {'success': False, 'error': str(e)}

# =============================================================
# Implementación Twilio
# =============================================================

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
            logger.warning("Twilio WhatsApp not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM")

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

        try:
            msg = self._client.messages.create(body=message, from_=from_, to=to)
            return {'success': True, 'message_sid': msg.sid}
        except Exception as e:
            logger.error(f"Twilio send error: {e}")
            return {'success': False, 'error': str(e)}

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
            # Twilio acepta content_variables como dict o JSON string
            msg = self._client.messages.create(
                content_sid=content_sid,
                from_=from_,
                to=to,
                content_variables=content_variables
            )
            return {'success': True, 'message_sid': msg.sid}
        except Exception as e:
            logger.error(f"Twilio template send error: {e}")
            return {'success': False, 'error': str(e)}

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
            # Variables para el template (ajusta según tu template en Twilio)
            # Template espera: {1} paciente, {2} fecha, {3} hora, {4} título médico, {5} nombre médico, {6} dirección, {7} URL Maps
            content_variables = {
                '1': patient_full_name,
                '2': appointment_date,
                '3': appointment_time,
                '4': doctor_title,
                '5': doctor_full_name.replace(doctor_title, "").strip() if doctor_title and doctor_title in doctor_full_name else doctor_full_name,
                '6': office_address,
                '7': maps_url or f"https://www.google.com/maps/search/?api=1&query={office_address.replace(' ', '+')}"
            }
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
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envía aviso de privacidad con template o mensaje interactivo
        Si hay Content SID configurado, usa template aprobado. Si no, usa mensaje de texto con URL.
        """
        # Si hay Content SID configurado, usar template aprobado
        if self.content_sid_privacy_notice:
            # Variables para el template (ajusta según tu template en Twilio)
            # Template espera: {1} paciente, {2} doctor, {3} URL privacidad, {4} consent_id
            content_variables = {
                '1': patient_name,
                '2': doctor_name,
                '3': privacy_notice_url,
                '4': str(consent_id)
            }
            return self.send_template_message(
                to_phone=patient_phone,
                content_sid=self.content_sid_privacy_notice,
                content_variables=content_variables,
                country_code=country_code
            )
        
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


# =============================================================
# Factory de servicio
# =============================================================
def get_whatsapp_service():
    """Devuelve el servicio de WhatsApp basado en variables de entorno.
    Prioriza Twilio si WHATSAPP_PROVIDER=twilio o si hay credenciales de Twilio.
    """
    provider = (os.getenv('WHATSAPP_PROVIDER') or '').lower()
    has_twilio = bool(os.getenv('TWILIO_ACCOUNT_SID') and os.getenv('TWILIO_AUTH_TOKEN') and os.getenv('TWILIO_WHATSAPP_FROM'))

    if provider == 'twilio' or has_twilio:
        return TwilioWhatsAppService()
    # Fallback a Meta (existente)
    return WhatsAppService()

