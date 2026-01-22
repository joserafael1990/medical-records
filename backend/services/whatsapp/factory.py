import os
from .meta import WhatsAppService
from .twilio_provider import TwilioWhatsAppService

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
