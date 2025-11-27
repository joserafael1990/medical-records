"""
WhatsApp Service Re-export (Legacy Support)
This file now re-exports classes from the backend/services/whatsapp/ package.
Please import directly from backend.services.whatsapp in new code.
"""

from services.whatsapp import (
    WhatsAppService,
    TwilioWhatsAppService,
    get_whatsapp_service,
    _format_phone_number_generic
)

# Re-export logger for compatibility if needed, though usually not imported from here
import logging
logger = logging.getLogger(__name__)
