import os
import requests
import logging
import json
from typing import Dict, Any, List, Optional
from pathlib import Path

# Configurar logging
logger = logging.getLogger(__name__)

def _debug_log(location: str, message: str, data: dict, hypothesis_id: str = "A"):
    """Write debug log entry to stdout (captured by Cloud Logging)"""
    try:
        log_entry = {
            "location": location,
            "message": message,
            "data": data,
            "hypothesisId": hypothesis_id
        }
        # Log to stdout so it appears in Cloud Logging
        logger.info(f"🔍 DEBUG [{hypothesis_id}] {location}: {message} | Data: {json.dumps(data)}")
    except Exception:
        pass  # Fail silently to not break production

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
        
        # CRITICAL FIX: Para México (country_code = '52'), asegurar formato 52 + 1 + 10 dígitos
        # Si el número ya tiene el código de país, verificar formato para México
        if phone.startswith(country_code):
            # Para México (country_code = '52'), asegurar formato 52 + 1 + 10 dígitos
            if country_code == '52' and len(phone) == 12:
                # Si tiene 12 dígitos (52 + 10 dígitos), insertar "1" después de "52"
                if phone.startswith('52') and not phone.startswith('521'):
                    phone = '52' + '1' + phone[2:]
                    logger.info(f"📞 Fixed Mexico phone format: inserted '1' -> {phone}")
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
        
        # #region agent log
        _debug_log("meta.py:87", "Phone number formatting", {
            "original_phone": to_phone,
            "country_code": country_code,
            "formatted_phone": formatted_phone,
            "phone_id": self.phone_id[:8] + "..." if self.phone_id else None
        }, "B")
        # #endregion
        
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
        
        # #region agent log
        _debug_log("meta.py:99", "Before API call", {
            "template_name": template_name,
            "language_code": language_code,
            "formatted_phone": formatted_phone,
            "template_params_count": len(template_params),
            "url": url
        }, "C")
        # #endregion
        
        try:
            logger.info(f"📤 Sending WhatsApp to {formatted_phone} using template {template_name}")
            logger.debug(f"📤 Payload: {payload}")
            response = requests.post(url, headers=self._get_headers(), json=payload, timeout=10)
            
            logger.info(f"📤 Response status: {response.status_code}")
            logger.debug(f"📤 Response headers: {dict(response.headers)}")
            
            # #region agent log
            _debug_log("meta.py:115", "API response received", {
                "status_code": response.status_code,
                "response_headers": dict(response.headers)
            }, "A")
            # #endregion
            
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"📤 Response body: {result}")
            message_id = result.get('messages', [{}])[0].get('id') if result.get('messages') else None
            message_status = result.get('messages', [{}])[0].get('message_status') if result.get('messages') else None
            
            # Check for phone number mismatch (input vs wa_id)
            contacts = result.get('contacts', [])
            input_phone = formatted_phone
            wa_id = None
            if contacts:
                wa_id = contacts[0].get('wa_id')
                input_phone = contacts[0].get('input', formatted_phone)
            
            # #region agent log
            _debug_log("meta.py:123", "API response parsed", {
                "message_id": message_id,
                "message_status": message_status,
                "input_phone": input_phone,
                "wa_id": wa_id,
                "phone_mismatch": input_phone != wa_id if wa_id else None,
                "has_messages": bool(result.get('messages')),
                "response_keys": list(result.keys()),
                "full_response": result
            }, "A")
            # #endregion
            
            # Warn if message_status is only 'accepted' (not delivered)
            if message_status == 'accepted':
                logger.warning(f"⚠️ CRITICAL: Message status is 'accepted' - delivery NOT confirmed!")
                logger.warning(f"⚠️ Message ID: {message_id} | Input phone: {input_phone} | WA ID: {wa_id}")
                logger.warning(f"⚠️ Meta accepted the message but actual delivery is unknown. Check webhooks for 'delivered' or 'read' status.")
                logger.warning(f"⚠️ If message doesn't arrive, possible causes:")
                logger.warning(f"   1. Phone number {wa_id} not registered with WhatsApp")
                logger.warning(f"   2. Phone number format issue (input {input_phone} was normalized to {wa_id})")
                logger.warning(f"   3. Message blocked by Meta spam filters")
                logger.warning(f"   4. Template not approved or recipient not opted in")
                _debug_log("meta.py:130", "Message status is 'accepted' not 'delivered'", {
                    "message_id": message_id,
                    "message_status": message_status,
                    "input_phone": input_phone,
                    "wa_id": wa_id,
                    "note": "Meta accepted the message but delivery status is unknown. Check webhook for delivery confirmation."
                }, "D")
            
            if input_phone != wa_id and wa_id:
                logger.error(f"❌ CRITICAL: Phone number mismatch detected!")
                logger.error(f"❌ Input phone: {input_phone} | WhatsApp ID: {wa_id}")
                logger.error(f"❌ Meta normalized the phone number. Area code changed: {input_phone[:4]} -> {wa_id[:4]}")
                logger.error(f"❌ This mismatch may cause delivery failures. Verify the original phone number format.")
                _debug_log("meta.py:135", "Phone number formatting mismatch", {
                    "input_phone": input_phone,
                    "wa_id": wa_id,
                    "area_code_input": input_phone[:4],
                    "area_code_wa_id": wa_id[:4],
                    "note": "Meta normalized the phone number. This mismatch may cause delivery issues."
                }, "B")
            
            logger.info(f"✅ WhatsApp sent successfully. Message ID: {message_id}, Status: {message_status}")
            
            # If message_status is only 'accepted', try to check actual delivery status after a short delay
            # Note: This is async, so we return success but log a warning
            if message_status == 'accepted':
                logger.warning(f"⚠️ Message status is 'accepted' - delivery not confirmed. Check webhooks for delivery status.")
                logger.info(f"💡 Tip: Monitor webhook events for 'delivered' or 'read' status updates for message {message_id}")
            
            # #region agent log
            _debug_log("meta.py:150", "Returning success result", {
                "success": True,
                "message_id": message_id,
                "message_status": message_status,
                "note": f"API returned success with status '{message_status}'. If status is 'accepted', delivery is not yet confirmed."
            }, "D")
            # #endregion
            
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
            
            # #region agent log
            _debug_log("meta.py:132", "HTTP error caught", {
                "status_code": status_code,
                "error_detail": error_detail if isinstance(error_detail, str) else str(error_detail),
                "error_type": type(e).__name__
            }, "E")
            # #endregion
            
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
            # #region agent log
            _debug_log("meta.py:196", "Unexpected exception", {
                "error": str(e),
                "error_type": type(e).__name__
            }, "F")
            # #endregion
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
        
        # #region agent log
        _debug_log("meta.py:333", "Calling send_template_message", {
            "patient_phone": patient_phone,
            "template_name": template_name,
            "template_language": template_language,
            "country_code": country_code,
            "appointment_status": appointment_status,
            "template_params": template_params
        }, "G")
        # #endregion
        
        result = self.send_template_message(
            to_phone=patient_phone,
            template_name=template_name,
            template_params=template_params,
            language_code=template_language,
            country_code=country_code
        )
        
        # #region agent log
        _debug_log("meta.py:340", "send_template_message returned", {
            "success": result.get('success'),
            "message_id": result.get('message_id'),
            "error": result.get('error'),
            "has_details": bool(result.get('details'))
        }, "H")
        # #endregion
        
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
                    # #region agent log
                    _debug_log("meta.py:390", "Template retry succeeded", {
                        "variant": variant,
                        "message_id": result.get('message_id')
                    }, "I")
                    # #endregion
                    break
                else:
                    logger.debug(f"❌ Failed with language code '{variant}': {result.get('error')}")
                    # #region agent log
                    _debug_log("meta.py:393", "Template retry failed", {
                        "variant": variant,
                        "error": result.get('error')
                    }, "I")
                    # #endregion
        
        # #region agent log
        _debug_log("meta.py:395", "send_appointment_reminder final result", {
            "success": result.get('success'),
            "message_id": result.get('message_id'),
            "error": result.get('error')
        }, "J")
        # #endregion
        
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
            
            # #region agent log
            _debug_log("meta.py:478", "Message status checked", {
                "message_id": message_id,
                "status": result.get('status'),
                "full_response": result
            }, "K")
            # #endregion
            
            return {
                'success': True,
                'data': result,
                'status': result.get('status')
            }
        except Exception as e:
            logger.error(f"Error getting message status: {str(e)}")
            # #region agent log
            _debug_log("meta.py:490", "Error checking message status", {
                "message_id": message_id,
                "error": str(e)
            }, "K")
            # #endregion
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
