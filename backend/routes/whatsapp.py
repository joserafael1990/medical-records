"""
WhatsApp Routes - Refactored to use modular handlers
"""
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from typing import Optional

from database import Person, get_db, ClinicalStudy
from auth import get_user_from_token
from whatsapp_service import get_whatsapp_service
from services.whatsapp_business_service import WhatsAppBusinessService
from logger import get_logger

# Import modular handlers
from .whatsapp_handlers import (
    mask_phone,
    process_webhook_event
)

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])
api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")


def get_current_user(
    authorization: str = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Person:
    """Dependency para obtener el usuario actual desde el header Authorization Bearer."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    user = get_user_from_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.post("/appointment-reminder/{appointment_id}")
async def send_whatsapp_appointment_reminder(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Enviar recordatorio de cita por WhatsApp"""
    api_logger.debug("Sending WhatsApp reminder for appointment", appointment_id=appointment_id)

    try:
        result = WhatsAppBusinessService.send_appointment_reminder(db, appointment_id)
        
        # Log success details
        if result.get('success'):
            security_logger.info(
                "WhatsApp reminder sent successfully",
                appointment_id=appointment_id
            )
            return {
                "message": "WhatsApp reminder sent successfully",
                "message_id": result.get('message_id') or result.get('message_sid')
            }
        else:
            # This branch might not be reached if service raises HTTPException, but for safety
            raise HTTPException(status_code=500, detail=result.get('error', 'Unknown error'))

    except HTTPException:
        raise
    except Exception as e:
        security_logger.error(
            "Unexpected error sending WhatsApp reminder",
            appointment_id=appointment_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Error sending WhatsApp: {str(e)}")


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook para recibir respuestas de WhatsApp (botones interactivos)
    """
    return await process_webhook_event(request, db)


@router.get("/webhook")
async def whatsapp_webhook_verification(
    request: Request
):
    """
    Verificación del webhook de WhatsApp (requerido por Meta)
    """
    import os
    mode = request.query_params.get('hub.mode')
    token = request.query_params.get('hub.verify_token')
    challenge = request.query_params.get('hub.challenge')
    
    verify_token = os.getenv('META_WHATSAPP_VERIFY_TOKEN', 'mi_token_secreto_123')
    
    # Log para debugging (sin exponer el token completo)
    api_logger.info(
        f"🔍 Webhook verification attempt - mode: {mode}, token_received: {token[:10] if token else 'None'}..., token_expected: {verify_token[:10] if verify_token else 'None'}..., challenge: {challenge}"
    )
    
    if mode == 'subscribe' and token == verify_token:
        api_logger.info("✅ WhatsApp webhook verified successfully")
        return int(challenge)
    
    api_logger.warning(
        "❌ WhatsApp webhook verification failed",
        extra={
            "mode": mode, 
            "token_received": token[:10] + "..." if token else None,
            "token_expected": verify_token[:10] + "..." if verify_token else None,
            "tokens_match": token == verify_token if token and verify_token else False
        }
    )
    return {"status": "error", "message": "Verification failed"}


@router.post("/study-results/{study_id}")
async def send_whatsapp_study_results_notification(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Notificar por WhatsApp que los resultados de un estudio están disponibles"""
    api_logger.info(
        "📱 Sending WhatsApp notification for study results",
        extra={"study_id": study_id, "doctor_id": current_user.id}
    )
    
    try:
        # Get study
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Study not found or no access")
        
        # Get patient
        patient = db.query(Person).filter(Person.id == study.patient_id).first()
        
        if not patient or not patient.primary_phone:
            raise HTTPException(status_code=400, detail="Patient phone number not found")
        
        # Generate secure link (placeholder - implement token system later)
        secure_link = f"http://localhost:3000/patient/studies/{study.id}"
        
        # Send WhatsApp
        whatsapp = get_whatsapp_service()
        # Get patient first name (first word of full name)
        patient_first_name = patient.name.split()[0] if patient.name else 'Paciente'
        
        result = whatsapp.send_lab_results_notification(
            patient_phone=patient.primary_phone,
            patient_name=patient_first_name,
            study_name=study.study_name,
            secure_link=secure_link
        )
        
        if result['success']:
            api_logger.info(
                "✅ WhatsApp notification sent successfully",
                extra={
                    "study_id": study.id,
                    "patient_id": patient.id,
                    "phone": patient.primary_phone
                }
            )
            return {
                "message": "WhatsApp notification sent successfully",
                "message_id": result.get('message_id'),
                "phone": patient.primary_phone
            }
        else:
            api_logger.error(
                "❌ Failed to send WhatsApp notification",
                extra={
                    "study_id": study.id,
                    "patient_id": patient.id,
                    "phone": patient.primary_phone,
                    "error": result.get('error')
                }
            )
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send WhatsApp: {result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "❌ Error sending WhatsApp notification",
            extra={"study_id": study_id, "doctor_id": current_user.id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error sending WhatsApp: {str(e)}")


@router.post("/test")
async def test_whatsapp_service(
    phone: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Endpoint de prueba para WhatsApp (agnóstico del proveedor)
    Envía un mensaje de prueba de texto simple
    """
    api_logger.info(
        "📱 Testing WhatsApp service",
        extra={"phone": phone, "doctor_id": current_user.id}
    )
    
    try:
        whatsapp = get_whatsapp_service()
        result = whatsapp.send_text_message(
            to_phone=phone,
            message='Mensaje de prueba desde el sistema de citas',
        )
        
        if result['success']:
            return {
                "message": "Test message sent successfully",
                "message_id": result.get('message_id') or result.get('message_sid'),
                "phone": phone,
                "note": "If you didn't receive the message, make sure your number is registered in Meta WhatsApp dashboard"
            }
        else:
            raise HTTPException(status_code=500, detail=f"Failed to send message: {result.get('error')}")
            
    except Exception as e:
        api_logger.error("❌ Error testing WhatsApp service", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
