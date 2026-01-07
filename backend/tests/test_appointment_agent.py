"""
Unit tests for Appointment Agent
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.orm import Session
from agents.appointment_agent import AppointmentAgent
from agents.appointment_agent.state import AppointmentSessionState


@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock(spec=Session)


@pytest.fixture
def agent(mock_db):
    """Create AppointmentAgent instance for testing"""
    with patch('agents.appointment_agent.agent.vertexai.init'):
        with patch('agents.appointment_agent.agent.GenerativeModel'):
            return AppointmentAgent(mock_db)


@pytest.mark.asyncio
async def test_greeting(agent):
    """Test that agent responds to greeting"""
    with patch.object(agent.model, 'start_chat') as mock_chat:
        mock_chat_instance = Mock()
        mock_chat_instance.send_message = Mock(return_value=Mock(
            text="¡Hola! 👋 Bienvenido al sistema de agendamiento de citas médicas. ¿Con qué doctor te gustaría agendar tu cita?",
            candidates=[Mock(content=Mock(parts=[Mock(text="¡Hola! 👋 Bienvenido...")]))]
        ))
        mock_chat.return_value = mock_chat_instance
        
        response = await agent.process_message("+521234567890", "Hola")
        
        assert "doctor" in response.lower() or "bienvenido" in response.lower()
        assert len(response) > 0


@pytest.mark.asyncio
async def test_cancel_command(agent):
    """Test that cancel command works"""
    response = await agent.process_message("+521234567890", "cancelar")
    
    assert "cancelado" in response.lower()
    # Session should be reset
    assert len(agent.session_state.get_history("+521234567890")) == 0


@pytest.mark.asyncio
async def test_help_command(agent):
    """Test that help command works"""
    response = await agent.process_message("+521234567890", "ayuda")
    
    assert "ayuda" in response.lower() or "paso" in response.lower()
    assert len(response) > 0


@pytest.mark.asyncio
async def test_bot_disabled(agent):
    """Test that agent respects GEMINI_BOT_ENABLED setting"""
    with patch('agents.appointment_agent.agent.settings') as mock_settings:
        mock_settings.GEMINI_BOT_ENABLED = False
        
        response = await agent.process_message("+521234567890", "Hola")
        
        assert "no está disponible" in response.lower()


def test_session_state():
    """Test session state management"""
    state = AppointmentSessionState()
    phone = "+521234567890"
    
    # Test initial state
    assert len(state.get_history(phone)) == 0
    
    # Test updating history
    history = [
        {"role": "user", "parts": ["Hola"]},
        {"role": "model", "parts": ["¡Hola! ¿En qué puedo ayudarte?"]}
    ]
    state.update_history(phone, history)
    
    assert len(state.get_history(phone)) == 2
    
    # Test reset
    state.reset_session(phone)
    assert len(state.get_history(phone)) == 0


def test_session_timeout():
    """Test that sessions expire after timeout"""
    state = AppointmentSessionState()
    phone = "+521234567890"
    
    # Set old last_activity
    from datetime import datetime, timedelta
    state._sessions[phone] = {
        'history': [{"role": "user", "parts": ["test"]}],
        'last_activity': datetime.now() - timedelta(hours=1)  # 1 hour ago
    }
    
    # With default 30 min timeout, session should be expired
    session = state.get_session(phone)
    assert len(session) == 0  # Should be empty after timeout

