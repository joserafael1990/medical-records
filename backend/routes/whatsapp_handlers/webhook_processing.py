"""
Webhook processing logic for WhatsApp integration
"""
import json
import os
import hmac
import hashlib
import re # Added for markup parsing
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session
from logger import get_logger

from .privacy import process_privacy_consent
from .appointment_ops import (
    cancel_appointment_via_whatsapp,
    confirm_appointment_via_whatsapp,
    process_text_cancellation_request
)
from whatsapp_service import get_whatsapp_service
from config import settings

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
                
                # Process status updates (delivered, read, failed)
                # Note: Status updates come within the 'messages' field, not as a separate 'statuses' field
                # Meta sends: field='messages', value.statuses=[...]
                if field == 'statuses':
                    # Legacy support: if Meta ever sends statuses as a separate field
                    statuses = value.get('statuses', [])
                    for status in statuses:
                        message_id = status.get('id')
                        status_type = status.get('status')  # sent, delivered, read, failed
                        recipient_id = status.get('recipient_id')
                        timestamp = status.get('timestamp')
                        
                        api_logger.info(
                            f"📊 WhatsApp message status update: {status_type}",
                            extra={
                                "message_id": message_id,
                                "status": status_type,
                                "recipient_id": recipient_id,
                                "timestamp": timestamp,
                                "full_status": status
                            }
                        )
                        
                        # Log critical statuses
                        if status_type == 'failed':
                            error = status.get('errors', [{}])[0] if status.get('errors') else {}
                            api_logger.error(
                                f"❌ WhatsApp message FAILED to deliver",
                                extra={
                                    "message_id": message_id,
                                    "recipient_id": recipient_id,
                                    "error_code": error.get('code'),
                                    "error_title": error.get('title'),
                                    "error_message": error.get('message'),
                                    "error_details": error
                                }
                            )
                        elif status_type == 'delivered':
                            api_logger.info(
                                f"✅ WhatsApp message DELIVERED",
                                extra={
                                    "message_id": message_id,
                                    "recipient_id": recipient_id
                                }
                            )
                        elif status_type == 'read':
                            api_logger.info(
                                f"👁️ WhatsApp message READ by recipient",
                                extra={
                                    "message_id": message_id,
                                    "recipient_id": recipient_id
                                }
                            )
                    continue
                
                if field != 'messages':
                    continue
                
                # Process status updates that come within the 'messages' field
                # Meta sends status updates as: value.statuses = [...]
                statuses = value.get('statuses', [])
                if statuses:
                    for status in statuses:
                        message_id = status.get('id')
                        status_type = status.get('status')  # sent, delivered, read, failed
                        recipient_id = status.get('recipient_id')
                        timestamp = status.get('timestamp')
                        
                        api_logger.info(
                            f"📊 WhatsApp message status update: {status_type}",
                            extra={
                                "message_id": message_id,
                                "status": status_type,
                                "recipient_id": recipient_id,
                                "timestamp": timestamp,
                                "full_status": status
                            }
                        )
                        
                        # Log critical statuses
                        if status_type == 'failed':
                            error = status.get('errors', [{}])[0] if status.get('errors') else {}
                            api_logger.error(
                                f"❌ WhatsApp message FAILED to deliver",
                                extra={
                                    "message_id": message_id,
                                    "recipient_id": recipient_id,
                                    "error_code": error.get('code'),
                                    "error_title": error.get('title'),
                                    "error_message": error.get('message'),
                                    "error_details": error
                                }
                            )
                        elif status_type == 'delivered':
                            api_logger.info(
                                f"✅ WhatsApp message DELIVERED",
                                extra={
                                    "message_id": message_id,
                                    "recipient_id": recipient_id
                                }
                            )
                        elif status_type == 'read':
                            api_logger.info(
                                f"👁️ WhatsApp message READ by recipient",
                                extra={
                                    "message_id": message_id,
                                    "recipient_id": recipient_id
                                }
                            )
                
                messages = value.get('messages', [])
                
                for message in messages:
                    message_type = message.get('type')
                    from_phone = message.get('from')
                    timestamp = message.get('timestamp')
                    
                    # Handle button replies (from quick reply buttons in templates)
                    if message_type == 'button':
                        button_data = message.get('button', {})
                        button_payload = button_data.get('payload', '').lower()
                        button_text = button_data.get('text', '').lower()
                        api_logger.info(f"📱 Button reply received: {button_payload}", extra={"payload": button_payload, "text": button_text, "from_phone": from_phone})
                        
                        # Handle Confirmar/Cancelar buttons
                        if 'confirm' in button_payload or 'confirmar' in button_payload:
                            api_logger.info(f"✅ Confirmation button pressed by {from_phone}")
                            # Find the most recent pending appointment for this user
                            await confirm_appointment_via_whatsapp(None, from_phone, db)
                            processed_messages += 1
                        elif 'cancel' in button_payload or 'cancelar' in button_payload:
                            api_logger.info(f"🚫 Cancellation button pressed by {from_phone}")
                            # Find the most recent pending appointment for this user
                            await cancel_appointment_via_whatsapp(None, from_phone, db)
                            processed_messages += 1
                        continue
                    
                    if message_type == 'interactive':
                        interactive_data = message.get('interactive', {})
                        button_reply = interactive_data.get('button_reply', {})
                        button_id = button_reply.get('id', '')
                        
                        api_logger.info(f"📱 Interactive button pressed: {button_id}", extra={"button_id": button_id, "from_phone": from_phone})
                        
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
                        else:
                            # Generic interactive handler: pass the ID as if it was text input
                            # This allows buttons like "id1", "id2" for doctor/office selection
                            api_logger.info(f"🔄 Routing generic interactive ID to Gemini: {button_id}")
                            # We'll let the 'else' block for text processing handle it by re-injecting
                            # Or we can call the agent directly here. Let's redirect to agent call.
                            await process_agent_interaction(button_id, from_phone, db)
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
                            # Process with Gemini bot (conversational appointment scheduling)
                            api_logger.info(
                                "🤖 Processing text message with Gemini bot",
                                extra={"from_phone": from_phone, "text": text_body}
                            )
                            
                            try:
                                # Get original text (not lowercased) for better context
                                original_text = message.get('text', {}).get('body', '').strip()
                                
                                # Use local Appointment Agent (Cloud Run deployment)
                                api_logger.info(
                                    "Using local Appointment Agent",
                                    extra={"from_phone": from_phone, "message_text": original_text[:50]}
                                )
                                
                                from agents.appointment_agent import AppointmentAgent
                                agent = AppointmentAgent(db, use_adk=True)
                                response_text = await agent.process_message(from_phone, original_text)
                                
                                if not response_text:
                                    raise ValueError("No response from agent")
                                
                                api_logger.info(
                                    "Agent response received",
                                    extra={"from_phone": from_phone, "response_length": len(response_text)}
                                )
                                
                                # Send response via WhatsApp (Handles Interactive Markup)
                                await parse_and_send_interactive_response(from_phone, response_text)
                                
                                processed_messages += 1
                                
                                api_logger.info(
                                    "✅ Gemini bot response sent",
                                    extra={"from_phone": from_phone, "response_length": len(response_text)}
                                )
                            
                            except Exception as e:
                                # #region agent log
                                import traceback
                                api_logger.error(
                                    "🔍 [DEBUG-EXCEPTION] Exception caught in webhook handler",
                                    extra={
                                        "from_phone": from_phone,
                                        "error_type": type(e).__name__,
                                        "error_message": str(e),
                                        "traceback": traceback.format_exc(),
                                        "hypothesis": "A,B,C,D,E",
                                        "sessionId": "debug-session",
                                        "runId": "run1"
                                    },
                                    exc_info=True
                                )
                                # #endregion
                                
                                api_logger.error(
                                    f"❌ Error processing message with Gemini bot: {e}",
                                    exc_info=True,
                                    extra={"from_phone": from_phone}
                                )
                                
                                # Send fallback message if enabled
                                if settings.GEMINI_FALLBACK_ENABLED:
                                    try:
                                        whatsapp_service = get_whatsapp_service()
                                        whatsapp_service.send_text_message(
                                            to_phone=from_phone,
                                            message="Lo siento, hubo un problema técnico. Por favor intenta de nuevo en un momento o contacta directamente."
                                        )
                                    except Exception as send_error:
                                        api_logger.error(f"Error sending fallback message: {send_error}", exc_info=True)
        
        return {"status": "ok", "processed_messages": processed_messages}
        
    except Exception as e:
        api_logger.error("❌ Error processing WhatsApp webhook", exc_info=True)
        return {"status": "error", "message": str(e)}

async def process_agent_interaction(user_input: str, phone: str, db: Session):
    """Refactored core agent processing to be called from both text and interactive inputs"""
    try:
        from agents.appointment_agent import AppointmentAgent
        agent = AppointmentAgent(db, use_adk=True)
        response_text = await agent.process_message(phone, user_input)
        if response_text:
            await parse_and_send_interactive_response(phone, response_text)
    except Exception as e:
        api_logger.error(f"Error in process_agent_interaction: {e}", exc_info=True)

async def parse_and_send_interactive_response(to_phone: str, text: str):
    """Parses [[LIST: ...]], [[BUTTONS: ...]], [[LOCATION: ...]] and sends accordingly"""
    whatsapp_service = get_whatsapp_service()
    
    # 1. Check for LOCATION
    loc_match = re.search(r'\[\[LOCATION:\s*(.*?)\s*\]\]', text, re.IGNORECASE)
    if loc_match:
        parts = [p.strip() for p in loc_match.group(1).split('|')]
        api_logger.info(f"📍 Parsing location: {parts}")
        if len(parts) >= 4:
            # Name | Address | Lat | Lng
            whatsapp_service.send_location_message(
                to_phone=to_phone,
                name=parts[0],
                address=parts[1],
                latitude=float(parts[2]),
                longitude=float(parts[3])
            )
        # Clean the text of the tag
        text = re.sub(r'\[\[LOCATION:.*?\]\]', '', text, flags=re.IGNORECASE).strip()

    # 2. Check for LIST
    list_match = re.search(r'\[\[LIST:\s*(.*?)\s*\]\]', text, re.IGNORECASE)
    if list_match:
        parts = [p.strip() for p in list_match.group(1).split('|')]
        api_logger.info(f"📋 Parsing list: {parts}")
        if len(parts) >= 3:
            # Body | ButtonText | Item1:id1 | Item2:id2
            body = parts[0]
            button_label = parts[1]
            rows = []
            for item in parts[2:]:
                if ':' in item:
                    title, row_id = item.split(':', 1)
                    rows.append({"id": row_id.strip(), "title": title.strip()[:24]})
            
            sections = [{"title": "Opciones", "rows": rows[:10]}]
            whatsapp_service.send_interactive_list(
                to_phone=to_phone,
                body_text=body,
                button_text=button_label,
                sections=sections
            )
            return # Don't send the text as simple message if it was converted

    # 3. Check for BUTTONS
    btn_match = re.search(r'\[\[BUTTONS:\s*(.*?)\s*\]\]', text, re.IGNORECASE)
    if btn_match:
        parts = [p.strip() for p in btn_match.group(1).split('|')]
        api_logger.info(f"🔘 Parsing buttons: {parts}")
        if len(parts) >= 2:
            # Body | Title1:id1 | Title2:id2
            body = parts[0]
            btns = []
            for item in parts[1:]:
                if ':' in item:
                    title, btn_id = item.split(':', 1)
                    btns.append({"id": btn_id.strip(), "title": title.strip()[:20]})
            
            whatsapp_service.send_interactive_buttons(
                to_phone=to_phone,
                body_text=body,
                buttons=btns[:3]
            )
            return # Don't send as text

    # 4. Check for IMAGE
    image_match = re.search(r'\[\[IMAGE:\s*(.*?)\s*\]\]', text, re.IGNORECASE)
    if image_match:
        url = image_match.group(1).strip()
        api_logger.info(f"🖼️ Parsing image: {url}")
        whatsapp_service.send_image_message(to_phone=to_phone, image_url=url)
        text = re.sub(r'\[\[IMAGE:.*?\]\]', '', text, flags=re.IGNORECASE).strip()

    # 5. Check for SUCCESS (random celebration)
    if '[[SUCCESS]]' in text.upper():
        api_logger.info(f"🎉 Sending success sticker")
        # Use a professional medical/success sticker (Public URL)
        # Note: In a real environment, these would be hosted on the clinic's CDN
        success_sticker = "https://i.ibb.co/vzG7L8T/success-sticker.webp" # Placeholder or clinic branded
        whatsapp_service.send_sticker_message(to_phone=to_phone, sticker_url=success_sticker)
        text = text.replace('[[SUCCESS]]', '').replace('[[success]]', '').strip()

    # Default: Send as plain text if no markup or markup was just location/image
    if text:
        whatsapp_service.send_text_message(to_phone=to_phone, message=text)
