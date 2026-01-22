"""
Client for calling Appointment Agent deployed in Vertex AI Agent Engine
"""
import httpx
from typing import Optional
from google.auth import default
from google.auth.transport.requests import Request
from config import settings
from logger import get_logger

api_logger = get_logger("medical_records.agent_engine_client")


async def call_agent_engine(phone_number: str, message_text: str) -> Optional[str]:
    """
    Call the Appointment Agent deployed in Vertex AI Agent Engine.
    
    Args:
        phone_number: User's phone number
        message_text: Message text from user
    
    Returns:
        Response text from agent, or None if error
    """
    if not settings.AGENT_ENGINE_ENDPOINT:
        api_logger.warning("AGENT_ENGINE_ENDPOINT not configured, cannot call Agent Engine")
        return None
    
    try:
        # Get authentication credentials
        credentials, project = default()
        
        # Refresh credentials if needed
        if not credentials.valid:
            credentials.refresh(Request())
        
        # Get access token
        access_token = credentials.token
        
        # Call Agent Engine endpoint
        # Note: The exact endpoint format may vary - adjust based on actual Agent Engine API
        endpoint = settings.AGENT_ENGINE_ENDPOINT
        
        # Construct request payload
        payload = {
            "phone": phone_number,
            "message": message_text
        }
        
        # Make HTTP request
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        api_logger.info(
            f"Calling Agent Engine endpoint: {endpoint}",
            extra={"phone": phone_number, "message_length": len(message_text)}
        )
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                endpoint,
                json=payload,
                headers=headers
            )
            
            response.raise_for_status()
            
            # Parse response
            response_data = response.json()
            
            # Extract response text
            # Note: The exact response format may vary - adjust based on actual Agent Engine API
            if isinstance(response_data, str):
                response_text = response_data
            elif isinstance(response_data, dict):
                response_text = response_data.get("text") or response_data.get("response") or response_data.get("message")
            else:
                response_text = str(response_data)
            
            api_logger.info(
                f"Agent Engine response received",
                extra={"phone": phone_number, "response_length": len(response_text) if response_text else 0}
            )
            
            return response_text
    
    except httpx.HTTPStatusError as e:
        api_logger.error(
            f"HTTP error calling Agent Engine: {e.response.status_code}",
            extra={"status_code": e.response.status_code, "response": e.response.text}
        )
        return None
    
    except Exception as e:
        api_logger.error(f"Error calling Agent Engine: {e}", exc_info=True)
        return None


def is_agent_engine_available() -> bool:
    """Check if Agent Engine endpoint is configured and available."""
    return bool(settings.AGENT_ENGINE_ENDPOINT)
