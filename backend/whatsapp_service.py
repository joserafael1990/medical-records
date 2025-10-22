"""
WhatsApp Business API Service - Meta Cloud API
Servicio para enviar notificaciones a pacientes vía WhatsApp
"""
import os
import requests
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

# Configurar logging
logger = logging.getLogger(__name__)

class WhatsAppService:
    """Servicio para interactuar con WhatsApp Business API de Meta"""
    
    def __init__(self):
        """Inicializar servicio con credenciales de Meta"""
        self.phone_id = os.getenv('META_WHATSAPP_PHONE_ID')
        self.access_token = os.getenv('META_WHATSAPP_TOKEN')
        self.api_version = os.getenv('META_WHATSAPP_API_VERSION', 'v18.0')
        self.base_url = f'https://graph.facebook.com/{self.api_version}'
        
        if not self.phone_id or not self.access_token:
            logger.warning("WhatsApp credentials not configured. Service will not work.")
    
    def _get_headers(self) -> Dict[str, str]:
        """Obtener headers para peticiones a la API"""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def _format_phone_number(self, phone: str, country_code: str = '52') -> str:
        """
        Formatear número de teléfono para WhatsApp
        Input: 5512345678, 581234567890, +581234567890
        Output: 581234567890 (sin +, con código de país)
        
        Args:
            phone: Número de teléfono a formatear
            country_code: Código de país (sin +). Default: '52' (México)
        """
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
        country_code: str = '52'
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
            error_detail = e.response.json() if e.response else str(e)
            logger.error(f"HTTP Error sending WhatsApp: {error_detail}")
            return {
                'success': False,
                'error': 'HTTP Error',
                'details': error_detail
            }
        except Exception as e:
            logger.error(f"Error sending WhatsApp: {str(e)}")
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
        country_code: str = '52'
    ) -> Dict[str, Any]:
        """
        Enviar recordatorio de cita médica
        
        Requiere plantilla 'appointment_reminder' aprobada en Meta
        
        Parámetros de la plantilla:
        1. Nombre y apellido del paciente
        2. Fecha de la cita
        3. Hora de la cita
        4. Título del doctor (ej: "Dr", "Dra")
        5. Nombre completo del doctor
        6. Dirección del consultorio
        
        Args:
            country_code: Código de país del consultorio (ej: '52' para México, '58' para Venezuela)
        """
        template_params = [
            patient_full_name,   # Parámetro 1: Nombre del paciente
            appointment_date,    # Parámetro 2: Fecha (ej: "25 de Enero de 2024")
            appointment_time,    # Parámetro 3: Hora (ej: "10:30 AM")
            doctor_title,        # Parámetro 4: Título (Dr, Dra)
            doctor_full_name,    # Parámetro 5: Nombre del doctor
            office_address       # Parámetro 6: Dirección del consultorio
        ]
        
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
        country_code: str = '52'
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
        country_code: str = '52'
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

# Instancia global del servicio
whatsapp_service = WhatsAppService()

def get_whatsapp_service() -> WhatsAppService:
    """Obtener instancia global del servicio de WhatsApp"""
    return whatsapp_service

