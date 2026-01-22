from sqlalchemy import Column, Integer, String, DateTime, JSON
from .base import Base, utc_now

class WhatsAppSession(Base):
    """
    Model to store WhatsApp conversation state and history.
    This replaces in-memory storage for persistence across restarts.
    """
    __tablename__ = "whatsapp_sessions"
    
    id = Column(Integer, primary_key=True)
    phone_number = Column(String(50), unique=True, index=True, nullable=False)
    
    # Store conversation history: [{"role": "user|model", "parts": [text]}]
    history = Column(JSON, default=list)
    
    # Store arbitrary state data: {"doctor_id": 1, "step": "select_date", ...}
    state_data = Column(JSON, default=dict)
    
    last_activity = Column(DateTime, default=utc_now, onupdate=utc_now)
    created_at = Column(DateTime, default=utc_now)
