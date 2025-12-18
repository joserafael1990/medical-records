"""
Webhook processing logic for WhatsApp integration
"""
import json
import os
import hmac
import hashlib
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session
from logger import get_logger

from .privacy import process_privacy_consent
from .appointment_ops import (
    cancel_appointment_via_whatsapp,
    confirm_appointment_via_whatsapp,
    process_text_cancellation_request
)

api_logger = get_logger("medical_records.api")

async def verify_webhook_signature(request: Request, raw_body: bytes):
    """
    Verify the webhook signature from Meta
    """
    signature_header = request.headers.get("X-Hub-Signature-256", "")
    is_production = os.getenv("APP_ENV", "development").lower() == "production"
    
    if is_production and not signature_header:
        raise HTTPException(status_code=403, detail="Missing signature header")
    
    if signature_header:
        if not signature_header.startswith("sha256="):
            if is_production:
                raise HTTPException(status_code=403, detail="Invalid signature format")
        else:
            received_signature = signature_header[7:]
            app_secret = os.getenv("META_WHATSAPP_APP_SECRET")
            if app_secret:
                expected_signature = hmac.new(
                    app_secret.encode('utf-8'),
                    raw_body,
                    hashlib.sha256
                ).hexdigest()
                
                if not hmac.compare_digest(received_signature, expected_signature):
                    raise HTTPException(status_code=403, detail="Invalid signature")

async def process_webhook_event(request: Request, db: Session):
    """
    Process the webhook event from WhatsApp
    """
    try:
        raw_body = await request.body()
        await verify_webhook_signature(request, raw_body)
        
        body = json.loads(raw_body.decode('utf-8'))
        
        api_logger.info(
            "📥 WhatsApp webhook received",
            extra={"body_keys": list(body.keys()), "entry_count": len(body.get('entry', []))}
        )
        
        if 'entry' not in body:
            api_logger.warning("⚠️ Webhook has no 'entry' field, ignoring")
            return {"status": "ignored"}
        
        processed_messages = 0
        for entry in body['entry']:
            for change in entry.get('changes', []):
                field = change.get('field')
                value = change.get('value', {})
                
                if field != 'messages':
                    continue
                
                messages = value.get('messages', [])
                
                for message in messages:
                    message_type = message.get('type')
                    from_phone = message.get('from')
                    timestamp = message.get('timestamp')
                    
                    if message_type == 'interactive':
                        interactive_data = message.get('interactive', {})
                        button_reply = interactive_data.get('button_reply', {})
                        button_id = button_reply.get('id', '')
                        
                        parts = button_id.split('_')
                        
                        if len(parts) >= 3 and parts[0] == 'accept' and parts[1] == 'privacy':
                            consent_id = int(parts[2])
                            if await process_privacy_consent(consent_id, from_phone, timestamp, db, request):
                                processed_messages += 1
                            
                        elif len(parts) >= 3 and parts[0] == 'cancel' and parts[1] == 'appointment':
                            appointment_id = int(parts[2])
                            await cancel_appointment_via_whatsapp(appointment_id, from_phone, db)
                            processed_messages += 1
                            
                        elif len(parts) >= 3 and parts[0] == 'confirm' and parts[1] == 'appointment':
                            appointment_id = int(parts[2])
                            await confirm_appointment_via_whatsapp(appointment_id, from_phone, db)
                            processed_messages += 1
                            
                    elif message_type == 'text':
                        text_body = message.get('text', {}).get('body', '').lower().strip()
                        
                        api_logger.info(
                            "📱 Received text message from WhatsApp",
                            extra={
                                "from_phone": from_phone, 
                                "text": text_body,
                                "full_message": message # Enhanced logging
                            }
                        )
                        
                        # Robust matching for cancellation
                        is_cancellation = (
                            ('cancel' in text_body or 'cancelar' in text_body) and
                            not any(neg in text_body for neg in ['no ', 'no quiero', 'sin '])
                        )
                        
                        # Robust matching for confirmation
                        is_confirmation = (
                            any(word in text_body for word in ['confirm', 'si', 'sí', 'ire', 'iré', 'asistire', 'asistiré', 'asistir']) and
                            not any(neg in text_body for neg in ['no ', 'no voy', 'no asistire', 'no asistiré'])
                        )
                        
                        if is_cancellation:
                            api_logger.info("🚫 Cancellation request detected", extra={"from_phone": from_phone, "text": text_body})
                            await process_text_cancellation_request(text_body, from_phone, db)
                            processed_messages += 1
                        elif is_confirmation:
                            api_logger.info("✅ Confirmation request detected", extra={"from_phone": from_phone, "text": text_body})
                            await confirm_appointment_via_whatsapp(None, from_phone, db)
                            processed_messages += 1
                        else:
                            api_logger.info(
                                "ℹ️ Text message doesn't match confirm/cancel patterns",
                                extra={"from_phone": from_phone, "text": text_body}
                            )
        
        return {"status": "ok", "processed_messages": processed_messages}
        
    except Exception as e:
        api_logger.error("❌ Error processing WhatsApp webhook", exc_info=True)
        return {"status": "error", "message": str(e)}
