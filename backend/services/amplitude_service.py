"""
Amplitude Analytics Service for Backend
Tracks events from backend operations (WhatsApp webhooks, Google Calendar sync, etc.)
"""
import os
import requests
import json
from typing import Dict, Any, Optional
from logger import get_logger

api_logger = get_logger("medical_records.amplitude")

class AmplitudeService:
    """Service for tracking events in Amplitude from backend"""
    
    AMPLITUDE_API_URL = "https://api2.amplitude.com/2/httpapi"
    API_KEY = os.getenv("AMPLITUDE_API_KEY")
    
    @staticmethod
    def track(
        event_type: str,
        user_id: Optional[str] = None,
        event_properties: Optional[Dict[str, Any]] = None,
        user_properties: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Track an event in Amplitude
        
        Args:
            event_type: Type of event (e.g., 'whatsapp_reminder_confirmed')
            user_id: User ID (optional, can be doctor_id or patient_id)
            event_properties: Event-specific properties
            user_properties: User-specific properties
        
        Returns:
            bool: True if event was sent successfully, False otherwise
        """
        if not AmplitudeService.API_KEY:
            # Silently skip if API key not configured
            return False
        
        try:
            event_data = {
                "event_type": event_type,
                "event_properties": event_properties or {},
                "user_properties": user_properties or {}
            }
            
            if user_id:
                event_data["user_id"] = str(user_id)
            
            payload = {
                "api_key": AmplitudeService.API_KEY,
                "events": [event_data]
            }
            
            response = requests.post(
                AmplitudeService.AMPLITUDE_API_URL,
                json=payload,
                timeout=5
            )
            
            if response.status_code == 200:
                # Successfully tracked, no logging needed
                return True
            else:
                # Silently fail - don't log warnings for tracking failures
                return False
                
        except Exception as e:
            # Only log critical errors
            api_logger.error(f"Critical error tracking Amplitude event: {event_type}", exc_info=True, extra={
                "event_type": event_type,
                "error": str(e)
            })
            return False
    
    @staticmethod
    def track_whatsapp_reminder_confirmed(appointment_id: int, patient_id: Optional[int] = None):
        """Track when a patient confirms appointment via WhatsApp"""
        return AmplitudeService.track(
            event_type="whatsapp_reminder_confirmed",
            user_id=str(patient_id) if patient_id else None,
            event_properties={
                "appointment_id": appointment_id,
                "confirmation_method": "whatsapp"
            }
        )
    
    @staticmethod
    def track_whatsapp_reminder_cancelled(appointment_id: int, patient_id: Optional[int] = None):
        """Track when a patient cancels appointment via WhatsApp"""
        return AmplitudeService.track(
            event_type="whatsapp_reminder_cancelled",
            user_id=str(patient_id) if patient_id else None,
            event_properties={
                "appointment_id": appointment_id,
                "cancellation_method": "whatsapp"
            }
        )
    
    @staticmethod
    def track_calendar_sync(
        event_type: str,
        appointment_id: int,
        doctor_id: int,
        success: bool,
        error_message: Optional[str] = None
    ):
        """Track Google Calendar sync events"""
        event_properties = {
            "appointment_id": appointment_id,
            "doctor_id": doctor_id,
            "success": success
        }
        
        if error_message:
            event_properties["error_message"] = error_message[:200]  # Limit error message length
        
        return AmplitudeService.track(
            event_type=event_type,
            user_id=str(doctor_id),
            event_properties=event_properties
        )


