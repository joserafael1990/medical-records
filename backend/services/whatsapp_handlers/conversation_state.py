"""
Conversation state management for Gemini WhatsApp bot
Stores conversation history and state in memory (can be migrated to Redis for production)
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from config import settings

class ConversationState:
    """
    Manages conversation state for each user's WhatsApp conversation.
    Stores state in memory (dict) - can be migrated to Redis for production.
    """
    
    _states: Dict[str, Dict[str, Any]] = {}
    
    def get_state(self, phone_number: str) -> Dict[str, Any]:
        """
        Get conversation state for a phone number.
        Returns empty dict if state expired or doesn't exist.
        """
        state = self._states.get(phone_number, {})
        
        # Check for timeout
        last_activity = state.get('last_activity')
        if last_activity:
            if isinstance(last_activity, str):
                last_activity = datetime.fromisoformat(last_activity)
            
            timeout_minutes = settings.GEMINI_CONVERSATION_TIMEOUT_MINUTES
            if (datetime.now() - last_activity) > timedelta(minutes=timeout_minutes):
                self.reset_state(phone_number)
                return {}
        
        return state
    
    def update_state(self, phone_number: str, **kwargs) -> None:
        """
        Update conversation state for a phone number.
        Automatically updates last_activity timestamp.
        """
        state = self.get_state(phone_number)
        state.update(kwargs)
        state['last_activity'] = datetime.now()
        self._states[phone_number] = state
    
    def get_history(self, phone_number: str) -> List[Dict[str, Any]]:
        """
        Get conversation history for a phone number.
        Returns list of messages in format: [{"role": "user|model", "parts": [text]}]
        """
        state = self.get_state(phone_number)
        return state.get('history', [])
    
    def update_history(self, phone_number: str, new_history: List[Dict[str, Any]]) -> None:
        """
        Update conversation history for a phone number.
        Keeps only the last N messages (configurable) to limit context size.
        """
        state = self.get_state(phone_number)
        
        # Limit history to last N messages for cost optimization
        max_messages = settings.GEMINI_MAX_CONTEXT_MESSAGES
        limited_history = new_history[-max_messages:] if len(new_history) > max_messages else new_history
        
        state['history'] = limited_history
        state['last_activity'] = datetime.now()
        state['last_user_message_timestamp'] = datetime.now()  # Track for WhatsApp 24h window
        self._states[phone_number] = state
    
    def reset_state(self, phone_number: str) -> None:
        """
        Reset conversation state for a phone number.
        Clears all state including history.
        """
        if phone_number in self._states:
            del self._states[phone_number]
    
    def is_within_whatsapp_window(self, phone_number: str) -> bool:
        """
        Check if we're within WhatsApp's 24-hour conversation window.
        Returns True if last user message was within 24 hours.
        """
        state = self.get_state(phone_number)
        last_message = state.get('last_user_message_timestamp')
        
        if not last_message:
            return False
        
        if isinstance(last_message, str):
            last_message = datetime.fromisoformat(last_message)
        
        window_hours = settings.WHATSAPP_CONVERSATION_WINDOW_HOURS
        return (datetime.now() - last_message) < timedelta(hours=window_hours)
    
    def get_state_summary(self, phone_number: str) -> Dict[str, Any]:
        """
        Get a summary of the conversation state (for debugging/logging).
        """
        state = self.get_state(phone_number)
        return {
            'has_state': phone_number in self._states,
            'state_keys': list(state.keys()) if state else [],
            'history_length': len(state.get('history', [])),
            'last_activity': state.get('last_activity'),
            'within_whatsapp_window': self.is_within_whatsapp_window(phone_number)
        }

