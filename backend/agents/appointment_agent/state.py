"""
Session state management for ADK Appointment Agent
Uses Redis for production (if enabled), falls back to in-memory storage
"""
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from config import settings
from logger import get_logger

api_logger = get_logger("medical_records.adk_agent")

# Try to import Redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    api_logger.warning("Redis not available, using in-memory storage")


class AppointmentSessionState:
    """
    Manages conversation session state for each user's WhatsApp conversation.
    Uses Redis if enabled, otherwise falls back to in-memory storage.
    """
    
    _sessions: Dict[str, Dict[str, Any]] = {}  # Fallback in-memory storage
    _redis_client: Optional[Any] = None
    
    def __init__(self):
        """Initialize session state with Redis if available and enabled."""
        self.use_redis = settings.REDIS_ENABLED and REDIS_AVAILABLE
        
        if self.use_redis:
            try:
                # Parse Redis URL
                redis_url = settings.REDIS_URL
                self._redis_client = redis.from_url(redis_url, decode_responses=True)
                
                # Test connection
                self._redis_client.ping()
                
                api_logger.info("Session state using Redis storage", extra={"redis_url": redis_url})
            except Exception as e:
                api_logger.warning(f"Failed to connect to Redis: {e}. Falling back to in-memory storage.", exc_info=True)
                self.use_redis = False
                self._redis_client = None
        else:
            api_logger.info("Session state using in-memory storage", extra={"redis_enabled": settings.REDIS_ENABLED})
    
    def _get_session_key(self, phone_number: str) -> str:
        """Get Redis key for session."""
        return f"appointment_session:{phone_number}"
    
    def _serialize_session(self, session: Dict[str, Any]) -> str:
        """Serialize session to JSON string."""
        # Convert datetime objects to ISO format strings
        serializable_session = {}
        for key, value in session.items():
            if isinstance(value, datetime):
                serializable_session[key] = value.isoformat()
            else:
                serializable_session[key] = value
        return json.dumps(serializable_session)
    
    def _deserialize_session(self, session_str: str) -> Dict[str, Any]:
        """Deserialize session from JSON string."""
        session = json.loads(session_str)
        # Convert ISO format strings back to datetime objects
        for key in ['last_activity', 'last_user_message_timestamp']:
            if key in session and session[key] and isinstance(session[key], str):
                try:
                    session[key] = datetime.fromisoformat(session[key])
                except (ValueError, TypeError):
                    pass
        return session
    
    def get_session(self, phone_number: str) -> Dict[str, Any]:
        """
        Get conversation session for a phone number.
        Returns empty dict if session expired or doesn't exist.
        """
        if self.use_redis and self._redis_client:
            try:
                session_key = self._get_session_key(phone_number)
                session_str = self._redis_client.get(session_key)
                
                if not session_str:
                    return {}
                
                session = self._deserialize_session(session_str)
                
                # Check for timeout
                last_activity = session.get('last_activity')
                if last_activity:
                    if isinstance(last_activity, str):
                        last_activity = datetime.fromisoformat(last_activity)
                    
                    timeout_minutes = settings.GEMINI_CONVERSATION_TIMEOUT_MINUTES
                    if (datetime.now() - last_activity) > timedelta(minutes=timeout_minutes):
                        self.reset_session(phone_number)
                        return {}
                
                return session
            except Exception as e:
                api_logger.error(f"Error getting session from Redis: {e}", exc_info=True)
                # Fallback to in-memory
                self.use_redis = False
        
        # Fallback to in-memory
        session = self._sessions.get(phone_number, {})
        
        # Check for timeout
        last_activity = session.get('last_activity')
        if last_activity:
            if isinstance(last_activity, str):
                last_activity = datetime.fromisoformat(last_activity)
            
            timeout_minutes = settings.GEMINI_CONVERSATION_TIMEOUT_MINUTES
            if (datetime.now() - last_activity) > timedelta(minutes=timeout_minutes):
                self.reset_session(phone_number)
                return {}
        
        return session
    
    def update_session(self, phone_number: str, **kwargs) -> None:
        """
        Update conversation session for a phone number.
        Automatically updates last_activity timestamp.
        """
        session = self.get_session(phone_number)
        session.update(kwargs)
        session['last_activity'] = datetime.now()
        
        if self.use_redis and self._redis_client:
            try:
                session_key = self._get_session_key(phone_number)
                session_str = self._serialize_session(session)
                
                # Set with TTL (timeout + buffer)
                timeout_seconds = settings.GEMINI_CONVERSATION_TIMEOUT_MINUTES * 60 + 300  # Add 5 min buffer
                self._redis_client.setex(session_key, timeout_seconds, session_str)
            except Exception as e:
                api_logger.error(f"Error updating session in Redis: {e}", exc_info=True)
                # Fallback to in-memory
                self.use_redis = False
                self._sessions[phone_number] = session
        else:
            # Fallback to in-memory
            self._sessions[phone_number] = session
    
    def get_history(self, phone_number: str) -> List[Dict[str, Any]]:
        """
        Get conversation history for a phone number.
        Returns list of messages in format: [{"role": "user|model", "parts": [text]}]
        """
        session = self.get_session(phone_number)
        return session.get('history', [])
    
    def update_history(self, phone_number: str, new_history: List[Dict[str, Any]]) -> None:
        """
        Update conversation history for a phone number.
        Keeps only the last N messages (configurable) to limit context size.
        """
        session = self.get_session(phone_number)
        
        # Limit history to last N messages for cost optimization
        max_messages = settings.GEMINI_MAX_CONTEXT_MESSAGES
        limited_history = new_history[-max_messages:] if len(new_history) > max_messages else new_history
        
        session['history'] = limited_history
        session['last_activity'] = datetime.now()
        session['last_user_message_timestamp'] = datetime.now()  # Track for WhatsApp 24h window
        
        # Update session (will save to Redis or in-memory)
        self.update_session(phone_number, **session)
    
    def reset_session(self, phone_number: str) -> None:
        """
        Reset conversation session for a phone number.
        Clears all state including history.
        """
        if self.use_redis and self._redis_client:
            try:
                session_key = self._get_session_key(phone_number)
                self._redis_client.delete(session_key)
            except Exception as e:
                api_logger.error(f"Error resetting session in Redis: {e}", exc_info=True)
                # Fallback to in-memory
                self.use_redis = False
                if phone_number in self._sessions:
                    del self._sessions[phone_number]
        else:
            # Fallback to in-memory
            if phone_number in self._sessions:
                del self._sessions[phone_number]
    
    def is_within_whatsapp_window(self, phone_number: str) -> bool:
        """
        Check if we're within WhatsApp's 24-hour conversation window.
        Returns True if last user message was within 24 hours.
        """
        session = self.get_session(phone_number)
        last_message = session.get('last_user_message_timestamp')
        
        if not last_message:
            return False
        
        if isinstance(last_message, str):
            last_message = datetime.fromisoformat(last_message)
        
        window_hours = settings.WHATSAPP_CONVERSATION_WINDOW_HOURS
        return (datetime.now() - last_message) < timedelta(hours=window_hours)
    
    def get_session_summary(self, phone_number: str) -> Dict[str, Any]:
        """
        Get a summary of the conversation session (for debugging/logging).
        """
        session = self.get_session(phone_number)
        has_session = bool(session) if session else False
        
        if not has_session:
            # Check if session exists in storage
            if self.use_redis and self._redis_client:
                try:
                    session_key = self._get_session_key(phone_number)
                    has_session = self._redis_client.exists(session_key) > 0
                except Exception:
                    pass
            else:
                has_session = phone_number in self._sessions
        
        return {
            'has_session': has_session,
            'session_keys': list(session.keys()) if session else [],
            'history_length': len(session.get('history', [])),
            'last_activity': session.get('last_activity'),
            'within_whatsapp_window': self.is_within_whatsapp_window(phone_number),
            'storage_type': 'redis' if self.use_redis else 'in_memory'
        }
