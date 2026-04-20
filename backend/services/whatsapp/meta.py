import os
import requests
import logging
import json
from typing import Dict, Any, List, Optional
from pathlib import Path

# Import Sentry for error tracking (optional, fails gracefully if not configured)
try:
    import sentry_sdk
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

# Configurar logging
logger = logging.getLogger(__name__)


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
        else:
            # Log successful initialization (mask sensitive data)
            phone_id_masked = f"{self.phone_id[:4]}...{self.phone_id[-4:]}" if len(self.phone_id) > 8 else "***"
            token_masked = f"{self.access_token[:10]}...{self.access_token[-4:]}" if len(self.access_token) > 14 else "***"
            logger.info(f"✅ WhatsApp Meta service initialized - Phone ID: {phone_id_masked}, Token: {token_masked}, API: {self.api_version}")
    
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
        original_input = phone
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
        
        # Para México (country_code = '52'), NO modificar el número
        # El usuario confirmó que agregar/quitar el "1" afecta la funcionalidad
        # Enviar el número tal cual viene (sin modificaciones)
        if phone.startswith(country_code):
            return phone
        
        # Si el número tiene 10 dígitos (número local), agregar código de país
        if len(phone) == 10:
            phone = f'{country_code}{phone}'
            # Para México, insertar "1" entre el código de país y el número
            if country_code == '52':
                phone = '52' + '1' + phone[2:]
                logger.info(f"📞 Fixed Mexico phone format: added country code + '1' -> {phone}")
        
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
        
        # Meta WhatsApp API accepts E.164 format with or without '+', but standard is with '+'
        # Adding '+' prefix for proper E.164 format
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        logger.info(f"📞 E.164 format: {formatted_phone} -> {to_phone_e164}")
        
        payload = {
            'messaging_product': 'whatsapp',
            'to': to_phone_e164,
            'type': 'template',
            'template': {
                'name': template_name,
                'language': {'code': language_code},
                'components': components
            }
        }
        
        
        try:
            logger.info(f"📤 Sending WhatsApp to {formatted_phone} using template {template_name}")
            logger.debug(f"📤 Payload: {payload}")
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            
            logger.info(f"📤 Response status: {response.status_code}")
            logger.debug(f"📤 Response headers: {dict(response.headers)}")
            
            
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"📤 Response body: {result}")
            
            
            # Check for errors in response (Meta sometimes includes errors even with 200 OK)
            if 'error' in result:
                error_data = result.get('error', {})
                error_code = error_data.get('code')
                error_message = error_data.get('message')
                error_type = error_data.get('type')
                error_subcode = error_data.get('error_subcode')
                error_fbtrace_id = error_data.get('fbtrace_id')
                
                logger.error(f"🚨 Meta API returned ERROR in response (even though HTTP 200):")
                logger.error(f"🚨 Error code: {error_code} | Type: {error_type} | Subcode: {error_subcode}")
                logger.error(f"🚨 Error message: {error_message}")
                logger.error(f"🚨 Full error: {error_data}")


            message_id = result.get('messages', [{}])[0].get('id') if result.get('messages') else None
            message_status = result.get('messages', [{}])[0].get('message_status') if result.get('messages') else None
            
            # Check for phone number mismatch (input vs wa_id)
            contacts = result.get('contacts', [])
            input_phone = formatted_phone
            wa_id = None
            if contacts:
                wa_id = contacts[0].get('wa_id')
                input_phone = contacts[0].get('input', formatted_phone)
                contact_status = contacts[0].get('status', 'unknown')
                contact_has_status = 'status' in contacts[0]

                
                # Check if contact status indicates registration issue
                if contact_has_status:
                    logger.warning(f"⚠️ Contact status from Meta: {contact_status}")
                    if contact_status != 'valid':
                        logger.error(f"🚨 CRITICAL: Contact status is '{contact_status}' - number may not be registered with WhatsApp!")
                        logger.error(f"🚨 This is likely why messages are not being delivered!")
                else:
                    logger.info(f"ℹ️ Meta did not return 'status' field for contact - this is normal for registered numbers")
            
            
            # Warn if message_status is only 'accepted' (not delivered)
            if message_status == 'accepted':
                logger.warning(f"⚠️ CRITICAL: Message status is 'accepted' - delivery NOT confirmed!")
                logger.warning(f"⚠️ Message ID: {message_id} | Input phone: {input_phone} | WA ID: {wa_id}")
                logger.warning(f"⚠️ Meta accepted the message but actual delivery is unknown. Check webhooks for 'delivered' or 'read' status.")
                
                # Check if phone was normalized (mismatch between input and wa_id, excluding '+')
                input_phone_clean = input_phone.replace('+', '')
                phone_normalized = input_phone_clean != wa_id
                if phone_normalized:
                    logger.error(f"🚨 PHONE NUMBER NORMALIZED BY META: {input_phone} → {wa_id}")
                    logger.error(f"🚨 This suggests Meta expects the number in format: {wa_id}")
                    logger.error(f"🚨 Verify if your WhatsApp number is actually: +{wa_id} or {input_phone}")
                else:
                    logger.info(f"✅ Phone number format matches Meta's wa_id: {input_phone_clean} == {wa_id}")
                
                logger.warning(f"⚠️ If message doesn't arrive, possible causes:")
                logger.warning(f"   1. Phone number mismatch: You think it's {input_phone} but Meta expects {wa_id}")
                logger.warning(f"   2. Phone number {wa_id} not registered with WhatsApp")
                logger.warning(f"   3. Message blocked by Meta spam filters")
                logger.warning(f"   4. Template not approved or recipient not opted in")
                logger.warning(f"   5. Webhook not configured correctly (no status updates received)")

            # Check for real phone mismatch (excluding the '+' prefix)
            input_phone_clean = input_phone.replace('+', '')
            if input_phone_clean != wa_id and wa_id:
                logger.error(f"❌ CRITICAL: Phone number mismatch detected!")
                logger.error(f"❌ Input phone: {input_phone} | WhatsApp ID: {wa_id}")
                logger.error(f"❌ Meta normalized the phone number. Area code changed: {input_phone[:4]} -> {wa_id[:4]}")
                logger.error(f"❌ This mismatch may cause delivery failures. Verify the original phone number format.")
                logger.error(f"💡 HYPOTHESIS: Meta expects format {wa_id} but we sent {input_phone_clean}")
                logger.error(f"💡 NEXT STEP: Try sending with format +{wa_id} instead of {input_phone}")

            logger.info(f"✅ WhatsApp sent successfully. Message ID: {message_id}, Status: {message_status}")
            
            # If message_status is only 'accepted', try to check actual delivery status after a short delay
            # Note: This is async, so we return success but log a warning
            if message_status == 'accepted':
                logger.warning(f"⚠️ Message status is 'accepted' - delivery not confirmed. Check webhooks for delivery status.")
                logger.info(f"💡 Tip: Monitor webhook events for 'delivered' or 'read' status updates for message {message_id}")
            
            
            return {
                'success': True,
                'message_id': message_id,
                'message_status': message_status,
                'response': result,
                'delivery_confirmed': message_status not in (None, 'accepted')  # Only confirmed if status is 'sent', 'delivered', or 'read'
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
        # Meta WhatsApp API accepts E.164 format with or without '+', but standard is with '+'
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        logger.info(f"📞 Sending simple message to {to_phone_e164}")
        
        payload = {
            'messaging_product': 'whatsapp',
            'to': to_phone_e164,
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
        """
        # Preparar parámetros para la plantilla según el formato exacto:
        # ¡Hola *{{1}}*, 🗓️
        # Este es un recordatorio de tu cita hoy *{{2}} a las {{3}}* con {{4}} {{5}}
        # 📍 *Lugar:* {{6}}
        
        # Manejar consultorios virtuales vs físicos para parámetro 6 (dirección)
        if appointment_type == "online" and online_consultation_url:
            # Para consultorios virtuales, usar la URL de consulta en línea
            office_address_clean = f"Consulta virtual: {online_consultation_url}"
            maps_url_final = online_consultation_url
        elif office_address and "No especificado" not in office_address and office_address != "Consultorio Médico":
            # Office físico con dirección válida
            office_address_clean = str(office_address)
            maps_url_final = maps_url or f"https://www.google.com/maps/search/?api=1&query={office_address.replace(' ', '+')}"
        elif appointment_type == "online":
            # Consultorio virtual sin URL específica
            office_address_clean = "Consulta virtual"
            maps_url_final = maps_url or online_consultation_url
        else:
            # Fallback para office físico sin dirección
            office_address_clean = "Consultorio médico"
            maps_url_final = maps_url or f"https://www.google.com/maps/search/?api=1&query={office_address.replace(' ', '+')}" if office_address else None

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
            result = response.json()
            
            
            return {
                'success': True,
                'data': result,
                'status': result.get('status')
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
        
        # IMPORTANTE: Usar SIEMPRE mensaje interactivo con botones para que el webhook funcione
        # El template 'aviso_de_privacidad' NO tiene botones interactivos configurados en Meta
        # Si usamos el template, el webhook NO recibirá las respuestas de los botones
        # Por lo tanto, debemos usar mensaje interactivo para capturar las respuestas del botón
        logger.info(f"📤 Using interactive message with buttons for privacy notice (required for webhook to work)")
        logger.info(f"📤 Formatted phone: {formatted_phone}, Consent ID: {consent_id}")
        
        # Construir nombre completo para el mensaje
        doctor_name_display = f"{doctor_title} {doctor_full_name}".strip() if doctor_title else doctor_full_name
        
        url = f'{self.base_url}/{self.phone_id}/messages'
        
        # Meta WhatsApp API accepts E.164 format with or without '+', but standard is with '+'
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        
        # Mensaje con botón interactivo
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone_e164,
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
        """
        if not self.phone_id or not self.access_token:
            return {'success': False, 'error': 'WhatsApp not configured'}
        
        url = f'{self.base_url}/{self.phone_id}/messages'
        formatted_phone = self._format_phone_number(to_phone, country_code)
        # Meta WhatsApp API accepts E.164 format with or without '+', but standard is with '+'
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone_e164,
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

    def send_interactive_list(
        self,
        to_phone: str,
        body_text: str,
        button_text: str,
        sections: List[Dict[str, Any]],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enviar un mensaje interactivo de tipo Lista (hasta 10 opciones)
        """
        if not self.phone_id or not self.access_token:
            return {'success': False, 'error': 'WhatsApp not configured'}
            
        formatted_phone = self._format_phone_number(to_phone, country_code)
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        
        interactive = {
            "type": "list",
            "body": {"text": body_text},
            "action": {
                "button": button_text,
                "sections": sections
            }
        }
        
        if header_text:
            interactive["header"] = {"type": "text", "text": header_text}
        if footer_text:
            interactive["footer"] = {"text": footer_text}
            
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone_e164,
            "type": "interactive",
            "interactive": interactive
        }
        
        try:
            url = f'{self.base_url}/{self.phone_id}/messages'
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            response.raise_for_status()
            return {'success': True, 'message_id': response.json().get('messages', [{}])[0].get('id')}
        except Exception as e:
            logger.error(f"Error sending interactive list: {e}")
            return {'success': False, 'error': str(e)}

    def send_interactive_buttons(
        self,
        to_phone: str,
        body_text: str,
        buttons: List[Dict[str, Any]],
        header_text: Optional[str] = None,
        footer_text: Optional[str] = None,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enviar un mensaje interactivo de tipo Botones (hasta 3)
        Buttons format: [{"id": "btn1", "title": "Option 1"}]
        """
        if not self.phone_id or not self.access_token:
            return {'success': False, 'error': 'WhatsApp not configured'}
            
        formatted_phone = self._format_phone_number(to_phone, country_code)
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        
        whatsapp_buttons = []
        for btn in buttons:
            whatsapp_buttons.append({
                "type": "reply",
                "reply": {
                    "id": btn["id"],
                    "title": btn["title"]
                }
            })
            
        interactive = {
            "type": "button",
            "body": {"text": body_text},
            "action": {"buttons": whatsapp_buttons}
        }
        
        if header_text:
            interactive["header"] = {"type": "text", "text": header_text}
        if footer_text:
            interactive["footer"] = {"text": footer_text}
            
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone_e164,
            "type": "interactive",
            "interactive": interactive
        }
        
        try:
            url = f'{self.base_url}/{self.phone_id}/messages'
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            response.raise_for_status()
            return {'success': True, 'message_id': response.json().get('messages', [{}])[0].get('id')}
        except Exception as e:
            logger.error(f"Error sending interactive buttons: {e}")
            return {'success': False, 'error': str(e)}

    def send_location_message(
        self,
        to_phone: str,
        latitude: float,
        longitude: float,
        name: str,
        address: str,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enviar un mensaje de ubicación nativo
        """
        if not self.phone_id or not self.access_token:
            return {'success': False, 'error': 'WhatsApp not configured'}
            
        formatted_phone = self._format_phone_number(to_phone, country_code)
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        
        payload = {
            "messaging_product": "whatsapp",
            "to": to_phone_e164,
            "type": "location",
            "location": {
                "longitude": longitude,
                "latitude": latitude,
                "name": name,
                "address": address
            }
        }
        
        try:
            url = f'{self.base_url}/{self.phone_id}/messages'
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            response.raise_for_status()
            return {'success': True, 'message_id': response.json().get('messages', [{}])[0].get('id')}
        except Exception as e:
            logger.error(f"Error sending location: {e}")
            return {'success': False, 'error': str(e)}

    def send_image_message(
        self,
        to_phone: str,
        image_url: str,
        caption: Optional[str] = None,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enviar un mensaje de imagen (vía URL pública)
        """
        if not self.phone_id or not self.access_token:
            return {'success': False, 'error': 'WhatsApp not configured'}
            
        formatted_phone = self._format_phone_number(to_phone, country_code)
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone_e164,
            "type": "image",
            "image": {
                "link": image_url
            }
        }
        if caption:
            payload["image"]["caption"] = caption
            
        try:
            url = f'{self.base_url}/{self.phone_id}/messages'
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            response.raise_for_status()
            return {'success': True, 'message_id': response.json().get('messages', [{}])[0].get('id')}
        except Exception as e:
            logger.error(f"Error sending image: {e}")
            return {'success': False, 'error': str(e)}

    def send_sticker_message(
        self,
        to_phone: str,
        sticker_url: str,
        country_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enviar un sticker (vía URL pública)
        Nota: Debe ser un archivo .webp
        """
        if not self.phone_id or not self.access_token:
            return {'success': False, 'error': 'WhatsApp not configured'}
            
        formatted_phone = self._format_phone_number(to_phone, country_code)
        to_phone_e164 = f'+{formatted_phone}' if not formatted_phone.startswith('+') else formatted_phone
        
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to_phone_e164,
            "type": "sticker",
            "sticker": {
                "link": sticker_url
            }
        }
            
        try:
            url = f'{self.base_url}/{self.phone_id}/messages'
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            response.raise_for_status()
            return {'success': True, 'message_id': response.json().get('messages', [{}])[0].get('id')}
        except Exception as e:
            logger.error(f"Error sending sticker: {e}")
            return {'success': False, 'error': str(e)}
