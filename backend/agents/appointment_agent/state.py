"""
Session state management for ADK Appointment Agent
Uses in-memory storage (can be migrated to Redis for production)
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from config import settings
from logger import get_logger

api_logger = get_logger("medical_records.adk_agent")


class AppointmentSessionState:
    """
    Manages conversation session state for each user's WhatsApp conversation.
    Stores state in memory (dict) - can be migrated to Redis for production.
    """
    
    _sessions: Dict[str, Dict[str, Any]] = {}
    
    def get_session(self, phone_number: str) -> Dict[str, Any]:
        """
        Get conversation session for a phone number.
        Returns empty dict if session expired or doesn't exist.
        """
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
        self._sessions[phone_number] = session
    
    def reset_session(self, phone_number: str) -> None:
        """
        Reset conversation session for a phone number.
        Clears all state including history.
        """
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
        return {
            'has_session': phone_number in self._sessions,
            'session_keys': list(session.keys()) if session else [],
            'history_length': len(session.get('history', [])),
            'last_activity': session.get('last_activity'),
            'within_whatsapp_window': self.is_within_whatsapp_window(phone_number)
        }

