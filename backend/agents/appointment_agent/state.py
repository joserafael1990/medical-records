"""
Session state management for ADK Appointment Agent
Uses Redis for production (if enabled), falls back to in-memory storage
"""
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from config import settings
from logger import get_logger

from models.whatsapp_session import WhatsAppSession
from sqlalchemy.orm import Session

api_logger = get_logger("medical_records.adk_agent")

# Try to import Redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

class AppointmentSessionState:
    """
    Manages conversation session state for each user's WhatsApp conversation.
    Prioritizes DB persistence (WhatsAppSession), falls back to Redis or in-memory.
    """
    
    _sessions: Dict[str, Dict[str, Any]] = {}  # Fallback in-memory storage
    _redis_client: Optional[Any] = None
    
    def __init__(self, db: Optional[Session] = None):
        """
        Initialize session state.
        Args:
            db: Database session for persistence
        """
        self.db = db
        self.use_redis = settings.REDIS_ENABLED and REDIS_AVAILABLE
        
        if db:
            api_logger.info("Session state using Database storage (WhatsAppSession model)")
        elif self.use_redis:
            try:
                # Parse Redis URL
                redis_url = settings.REDIS_URL
                self._redis_client = redis.from_url(redis_url, decode_responses=True)
                self._redis_client.ping()
                api_logger.info("Session state using Redis storage fallback", extra={"redis_url": redis_url})
            except Exception as e:
                api_logger.warning(f"Failed to connect to Redis: {e}. Falling back to in-memory.", exc_info=True)
                self.use_redis = False
        else:
            api_logger.info("Session state using in-memory storage fallback")
    
    def _get_session_key(self, phone_number: str) -> str:
        """Get Redis key for session."""
        return f"appointment_session:{phone_number}"
    
    def _serialize_session(self, session: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare session for JSON sterilization by converting datetimes."""
        serialized = {}
        for key, value in session.items():
            if isinstance(value, datetime):
                serialized[key] = value.isoformat()
            else:
                serialized[key] = value
        return serialized
    
    def _deserialize_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert ISO format strings back to datetime objects."""
        session = dict(session_data)
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
        """
        # 1. Try DB first if available
        if self.db:
            try:
                db_session_record = self.db.query(WhatsAppSession).filter(
                    WhatsAppSession.phone_number == phone_number
                ).first()
                if db_session_record:
                    # Check for timeout
                    timeout_minutes = settings.GEMINI_CONVERSATION_TIMEOUT_MINUTES
                    if (datetime.now() - db_session_record.last_activity) > timedelta(minutes=timeout_minutes):
                        self.reset_session(phone_number)
                        return {}
                    
                    # Merge history and state_data
                    session = {
                        "history": db_session_record.history or [],
                        "last_activity": db_session_record.last_activity,
                        "created_at": db_session_record.created_at
                    }
                    session.update(db_session_record.state_data or {})
                    return session
                return {}
            except Exception as e:
                api_logger.error(f"Error getting session from DB: {e}", exc_info=True)
        
        # 2. Try Redis fallback
        if self.use_redis and self._redis_client:
            try:
                session_key = self._get_session_key(phone_number)
                session_str = self._redis_client.get(session_key)
                if session_str:
                    session = self._deserialize_session(json.loads(session_str))
                    # Check for timeout
                    last_activity = session.get('last_activity')
                    if last_activity and (datetime.now() - last_activity) > timedelta(minutes=settings.GEMINI_CONVERSATION_TIMEOUT_MINUTES):
                        self.reset_session(phone_number)
                        return {}
                    return session
            except Exception as e:
                api_logger.error(f"Error getting session from Redis: {e}", exc_info=True)
        
        # 3. Fallback to in-memory
        session = self._sessions.get(phone_number, {})
        last_activity = session.get('last_activity')
        if last_activity and (datetime.now() - last_activity) > timedelta(minutes=settings.GEMINI_CONVERSATION_TIMEOUT_MINUTES):
            self.reset_session(phone_number)
            return {}
        
        return session
    
    def update_session(self, phone_number: str, **kwargs) -> None:
        """
        Update conversation session for a phone number.
        """
        session = self.get_session(phone_number)
        session.update(kwargs)
        now = datetime.now()
        session['last_activity'] = now
        
        # 1. Update DB if available
        if self.db:
            try:
                db_record = self.db.query(WhatsAppSession).filter(
                    WhatsAppSession.phone_number == phone_number
                ).first()
                
                history = session.pop('history', [])
                # Remaining kwargs are state_data
                state_data = self._serialize_session(session)
                
                if db_record:
                    db_record.history = history
                    db_record.state_data = state_data
                    db_record.last_activity = now
                else:
                    db_record = WhatsAppSession(
                        phone_number=phone_number,
                        history=history,
                        state_data=state_data,
                        last_activity=now
                    )
                    self.db.add(db_record)
                
                self.db.commit()
                # Restore history to the dict for other fallbacks or immediate use
                session['history'] = history
            except Exception as e:
                api_logger.error(f"Error updating session in DB: {e}", exc_info=True)
                self.db.rollback()
        
        # 2. Update Redis fallback
        if self.use_redis and self._redis_client:
            try:
                session_key = self._get_session_key(phone_number)
                timeout_seconds = settings.GEMINI_CONVERSATION_TIMEOUT_MINUTES * 60 + 300
                self._redis_client.setex(
                    session_key, 
                    timeout_seconds, 
                    json.dumps(self._serialize_session(session))
                )
            except Exception as e:
                api_logger.error(f"Error updating session in Redis: {e}", exc_info=True)
        
        # 3. Update in-memory fallback
        self._sessions[phone_number] = session
    
    def get_history(self, phone_number: str) -> List[Dict[str, Any]]:
        """Get history parts from session."""
        session = self.get_session(phone_number)
        return session.get('history', [])
    
    def update_history(self, phone_number: str, new_history: List[Dict[str, Any]]) -> None:
        """Update history and session context."""
        session = self.get_session(phone_number)
        max_messages = settings.GEMINI_MAX_CONTEXT_MESSAGES
        session['history'] = new_history[-max_messages:]
        session['last_user_message_timestamp'] = datetime.now()
        self.update_session(phone_number, **session)
    
    def reset_session(self, phone_number: str) -> None:
        """Clear all session data."""
        if self.db:
            try:
                self.db.query(WhatsAppSession).filter(WhatsAppSession.phone_number == phone_number).delete()
                self.db.commit()
            except Exception as e:
                api_logger.error(f"Error resetting session in DB: {e}", exc_info=True)
                self.db.rollback()
        
        if self.use_redis and self._redis_client:
            try:
                self._redis_client.delete(self._get_session_key(phone_number))
            except Exception:
                pass
                
        if phone_number in self._sessions:
            del self._sessions[phone_number]
    
    def is_within_whatsapp_window(self, phone_number: str) -> bool:
        """Check 24h window."""
        session = self.get_session(phone_number)
        last_message = session.get('last_user_message_timestamp')
        if not last_message: return False
        if isinstance(last_message, str):
            last_message = datetime.fromisoformat(last_message)
        return (datetime.now() - last_message) < timedelta(hours=settings.WHATSAPP_CONVERSATION_WINDOW_HOURS)
    
    def get_session_summary(self, phone_number: str) -> Dict[str, Any]:
        """Debug summary."""
        session = self.get_session(phone_number)
        return {
            'has_session': bool(session),
            'history_length': len(session.get('history', [])),
            'last_activity': session.get('last_activity'),
            'storage_priority': 'db' if self.db else ('redis' if self.use_redis else 'in_memory')
        }
