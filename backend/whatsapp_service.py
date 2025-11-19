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
    - Si phone inicia con +, se respeta y se normaliza
    - Si tiene 10 dígitos y hay country_code, se antepone
    - Remueve espacios, guiones y paréntesis
    - Corrige formatos comunes incorrectos (ej: +521... -> +52...)
    """
    if not phone:
        return phone
    clean = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
    
    # Si inicia con +, verificar y corregir formatos comunes incorrectos
    if clean.startswith('+'):
        # Corregir formato común incorrecto: +521... (México) -> +52...
        # El código de país de México es 52, no 521
        # Ejemplo: +5215579449672 -> +525579449672
        if clean.startswith('+521') and len(clean) >= 13:  # +521 + al menos 10 dígitos
            # Remover el 1 extra: +5215579449672 -> +525579449672
            # Extraer los últimos 10 dígitos después de +521
            digits_after_521 = clean[4:]  # Todo después de '+521'
            if len(digits_after_521) == 10:
                corrected = '+52' + digits_after_521  # +52 + 10 dígitos
                logger.warning(f"⚠️ Corrected phone format: {clean} -> {corrected} (removed extra '1' in country code)")
                return corrected
        return clean
    
    if country_code:
        cc = country_code if not country_code.startswith('+') else country_code[1:]
        # Si el número ya inicia con el código de país, devolverlo con +
        if clean.startswith(cc):
            return f"+{clean}"
        # Si el número tiene 10 dígitos, agregar código de país
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
            logger.info(f"📤 Sending WhatsApp to {formatted_phone} using template {template_name}")
            logger.debug(f"📤 Payload: {payload}")
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            
            logger.info(f"📤 Response status: {response.status_code}")
            logger.debug(f"📤 Response headers: {dict(response.headers)}")
            
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"📤 Response body: {result}")
            message_id = result.get('messages', [{}])[0].get('id') if result.get('messages') else None
            logger.info(f"✅ WhatsApp sent successfully. Message ID: {message_id}")
            
            return {
                'success': True,
                'message_id': message_id,
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
            
            # Check for expired token (Meta/Facebook specific)
            error_message = str(error_detail)
            is_token_expired = False
            if isinstance(error_detail, dict):
                error_obj = error_detail.get('error', {})
                error_msg = error_obj.get('message', '')
                error_subcode = error_obj.get('error_subcode')
                # Meta returns error_subcode 463 for expired tokens
                if 'Session has expired' in error_msg or error_subcode == 463 or 'expired' in error_msg.lower():
                    is_token_expired = True
                    error_message = f"Token de acceso expirado: {error_msg}"
            elif 'Session has expired' in error_message or 'expired' in error_message.lower():
                is_token_expired = True
                
            logger.error(f"HTTP Error sending WhatsApp: {error_detail}, Status: {status_code}")
            
            # Return specific error for expired tokens
            if is_token_expired:
                return {
                    'success': False,
                    'error': 'Token de acceso de Meta WhatsApp expirado. Por favor, renueva el token en la consola de Meta.',
                    'error_type': 'token_expired',
                    'details': error_detail
                }
            
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
        maps_url: Optional[str] = None,
        appointment_status: str = "por_confirmar",
        appointment_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Enviar recordatorio de cita médica usando plantilla aprobada
        
        Selecciona la plantilla según el estado de la cita:
        - Si status es 'por_confirmar': usa 'appointment_reminder_no_confirmed' (botones: Confirmar, Cancelar)
        - Si status es 'confirmada': usa 'appointment_reminder_confirmed' (botón: Cancelar)
        
        Args:
            country_code: Código de país del consultorio. Si es None, usa '52' (México) como fallback
            appointment_type: "presencial" o "online"
            online_consultation_url: URL para citas online (parámetro 7)
            appointment_status: Estado de la cita ('por_confirmar' o 'confirmada')
            appointment_id: ID de la cita para incluir en los botones
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
        
        
        # Select template based on appointment status
        if appointment_status == 'por_confirmar':
            # Template for unconfirmed appointments: has "Confirmar" and "Cancelar" buttons
            template_name = os.getenv('WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_NO_CONFIRMED', 'appointment_reminder_no_confirmed')
        elif appointment_status == 'confirmada':
            # Template for confirmed appointments: has only "Cancelar" button
            template_name = os.getenv('WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_CONFIRMED', 'appointment_reminder_confirmed')
        else:
            # Fallback to no_confirmed template for other statuses
            template_name = os.getenv('WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER_NO_CONFIRMED', 'appointment_reminder_no_confirmed')
        
        template_language = os.getenv('WHATSAPP_TEMPLATE_LANGUAGE', 'es')  # Default to 'es' (Spanish)
        
        # Log what we're trying to send
        logger.info(f"📤 Attempting to send '{template_name}' template with language: '{template_language}' for appointment status: '{appointment_status}'")
        
        result = self.send_template_message(
            to_phone=patient_phone,
            template_name=template_name,
            template_params=template_params,
            language_code=template_language,
            country_code=country_code
        )
        
        # If it fails with template translation error, try other Spanish variants
        # Check both error message and details for the template translation error
        error_text = str(result.get('error', '')).lower()
        details = result.get('details', {})
        
        # Extract error message from nested structure if details is a dict
        details_text = ''
        if isinstance(details, dict):
            # Check for nested error.message structure (Meta API format)
            nested_error = details.get('error', {})
            if isinstance(nested_error, dict):
                details_text = str(nested_error.get('message', '')).lower()
            else:
                details_text = str(details).lower()
        elif isinstance(details, str):
            details_text = details.lower()
        
        # Check for template translation error (code 132001 or message contains "template name does not exist")
        is_template_error = (
            not result.get('success') and 
            ('template name does not exist' in error_text or 
             'template name does not exist' in details_text or
             '132001' in error_text or
             '132001' in details_text or
             (isinstance(details, dict) and 
              isinstance(details.get('error'), dict) and
              details.get('error', {}).get('code') == 132001))
        )
        
        if is_template_error:
            logger.warning(f"⚠️ Template '{template_name}' failed with language '{template_language}', trying other Spanish variants...")
            logger.debug(f"🔍 Error details: {result.get('error')}, Details: {result.get('details')}")
            
            # Try common Spanish language codes (prioritize es_MX, then es, then others)
            # Remove the one we already tried from the list
            spanish_variants = ['es_MX', 'es_ES', 'es_AR', 'es_CO', 'es_CL', 'es_PE', 'es_VE']
            if template_language in spanish_variants:
                spanish_variants.remove(template_language)
            
            for variant in spanish_variants:
                logger.info(f"📤 Trying language code: '{variant}'")
                result = self.send_template_message(
                    to_phone=patient_phone,
                    template_name=template_name,
                    template_params=template_params,
                    language_code=variant,
                    country_code=country_code
                )
                if result.get('success'):
                    logger.info(f"✅ Success with language code: '{variant}'")
                    break
                else:
                    logger.debug(f"❌ Failed with language code '{variant}': {result.get('error')}")
        
        return result
    
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
        doctor_title: Optional[str] = None,
        doctor_full_name: Optional[str] = None,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Envía aviso de privacidad usando template aprobado o mensaje interactivo
        Intenta primero usar el template 'aviso_de_privacidad', si falla usa mensaje interactivo
        
        Args:
            patient_name: Nombre del paciente
            patient_phone: Teléfono del paciente
            doctor_name: Nombre completo del médico (con título, para compatibilidad)
            privacy_notice_url: URL del aviso completo
            consent_id: ID del registro de consentimiento
            doctor_title: Título del doctor (opcional, se extrae de doctor_name si no se proporciona)
            doctor_full_name: Nombre completo del doctor sin título (opcional, se extrae de doctor_name si no se proporciona)
            country_code: Código de país
            
        Returns:
            Dict con resultado del envío (message_id, etc)
        """
        if not self.phone_id or not self.access_token:
            return {
                'success': False,
                'error': 'WhatsApp not configured. Please set META_WHATSAPP_PHONE_ID and META_WHATSAPP_TOKEN'
            }
        
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
        
        formatted_phone = self._format_phone_number(patient_phone, country_code)
        
        # Intentar primero usar el template 'aviso_de_privacidad'
        # El template espera: {{1}} = paciente, {{2}} = titulo, {{3}} = nombre doctor, {{4}} = url
        template_params = [
            patient_name,
            doctor_title,
            doctor_full_name,
            privacy_notice_url
        ]
        
        logger.info(f"📤 Attempting to send privacy notice using template 'aviso_de_privacidad'")
        logger.info(f"📤 Template params: {template_params}")
        logger.info(f"📤 Formatted phone: {formatted_phone}")
        template_result = self.send_template_message(
            to_phone=patient_phone,
            template_name='aviso_de_privacidad',
            template_params=template_params,
            language_code='es',
            country_code=country_code
        )
        
        logger.info(f"📤 Template result: success={template_result.get('success')}, error={template_result.get('error', 'none')}")
        
        if template_result.get('success'):
            logger.info(f"✅ Privacy notice sent successfully using template")
            return template_result
        
        # Si el template falla, usar mensaje interactivo como fallback
        logger.warning(f"⚠️ Template failed ({template_result.get('error', 'unknown error')}), falling back to interactive message")
        
        # Construir nombre completo para el mensaje
        doctor_name_display = f"{doctor_title} {doctor_full_name}".strip() if doctor_title else doctor_full_name
        
        url = f'{self.base_url}/{self.phone_id}/messages'
        
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
                            f"Soy {doctor_name_display} y necesito tu consentimiento para brindarte "
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
            logger.info(f"📤 Sending interactive privacy notice to {formatted_phone}")
            logger.debug(f"📤 Interactive payload: {payload}")
            response = requests.post(
                url,
                headers=self._get_headers(),
                json=payload,
                timeout=10
            )
            
            logger.info(f"📤 Interactive response status: {response.status_code}")
            logger.debug(f"📤 Interactive response headers: {dict(response.headers)}")
            
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"📤 Interactive response body: {result}")
            message_id = result.get('messages', [{}])[0].get('id') if result.get('messages') else None
            logger.info(f"✅ Interactive privacy notice sent to {formatted_phone}, Message ID: {message_id}")
            
            return {
                'success': True,
                'message_id': message_id,
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
        
        Args:
            patient_name: Nombre del paciente
            patient_phone: Teléfono del paciente
            doctor_name: Nombre completo del doctor (con título)
            privacy_notice_url: URL del aviso de privacidad
            consent_id: ID del consentimiento
            doctor_title: Título del doctor (opcional, se extrae de doctor_name si no se proporciona)
            doctor_full_name: Nombre completo del doctor sin título (opcional, se extrae de doctor_name si no se proporciona)
            country_code: Código de país
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

