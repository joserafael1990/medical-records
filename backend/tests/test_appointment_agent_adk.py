"""
Unit tests for Appointment Agent with ADK
Tests both ADK and GenerativeModel fallback modes
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from sqlalchemy.orm import Session
from agents.appointment_agent import AppointmentAgent
from agents.appointment_agent.state import AppointmentSessionState
from agents.appointment_agent.tools import create_adk_tools, get_all_tools, execute_tool


@pytest.fixture
def mock_db():
    """Mock database session"""
    db = Mock(spec=Session)
    return db


@pytest.fixture
def agent_with_fallback(mock_db):
    """Create AppointmentAgent instance with GenerativeModel fallback"""
    with patch('agents.appointment_agent.agent.vertexai.init'):
        with patch('agents.appointment_agent.agent.ADK_AVAILABLE', False):
            with patch('agents.appointment_agent.agent.GenerativeModel') as mock_model:
                mock_model_instance = Mock()
                mock_model.return_value = mock_model_instance
                agent = AppointmentAgent(mock_db, use_adk=False)
                agent.model = mock_model_instance
                return agent


@pytest.fixture
def agent_with_adk(mock_db):
    """Create AppointmentAgent instance with ADK (if available)"""
    with patch('agents.appointment_agent.agent.vertexai.init'):
        with patch('agents.appointment_agent.agent.ADK_AVAILABLE', True):
            try:
                with patch('agents.appointment_agent.agent.LlmAgent') as mock_adk:
                    mock_adk_instance = Mock()
                    mock_adk.return_value = mock_adk_instance
                    agent = AppointmentAgent(mock_db, use_adk=True)
                    agent.agent = mock_adk_instance
                    return agent
            except Exception:
                # If ADK not available, return None
                return None


@pytest.mark.asyncio
async def test_greeting_fallback(agent_with_fallback):
    """Test that agent responds to greeting using GenerativeModel fallback"""
    with patch.object(agent_with_fallback.model, 'start_chat') as mock_chat:
        mock_chat_instance = Mock()
        mock_response = Mock()
        mock_response.text = "¡Hola! 👋 Bienvenido al sistema de agendamiento de citas médicas. ¿Con qué doctor te gustaría agendar tu cita?"
        mock_response.candidates = [Mock(content=Mock(parts=[Mock(text="¡Hola! 👋 Bienvenido...")]))]
        mock_chat_instance.send_message = Mock(return_value=mock_response)
        mock_chat.return_value = mock_chat_instance
        
        response = await agent_with_fallback.process_message("+521234567890", "Hola")
        
        assert "doctor" in response.lower() or "bienvenido" in response.lower()
        assert len(response) > 0


@pytest.mark.asyncio
async def test_cancel_command(agent_with_fallback):
    """Test that cancel command works"""
    response = await agent_with_fallback.process_message("+521234567890", "cancelar")
    
    assert "cancelado" in response.lower()
    # Session should be reset
    assert len(agent_with_fallback.session_state.get_history("+521234567890")) == 0


@pytest.mark.asyncio
async def test_help_command(agent_with_fallback):
    """Test that help command works"""
    response = await agent_with_fallback.process_message("+521234567890", "ayuda")
    
    assert "ayuda" in response.lower() or "paso" in response.lower()
    assert len(response) > 0


@pytest.mark.asyncio
async def test_bot_disabled(agent_with_fallback):
    """Test that agent respects GEMINI_BOT_ENABLED setting"""
    with patch('agents.appointment_agent.agent.settings') as mock_settings:
        mock_settings.GEMINI_BOT_ENABLED = False
        
        response = await agent_with_fallback.process_message("+521234567890", "Hola")
        
        assert "no está disponible" in response.lower()


@pytest.mark.asyncio
async def test_function_calling_fallback(agent_with_fallback):
    """Test function calling with GenerativeModel fallback"""
    with patch.object(agent_with_fallback.model, 'start_chat') as mock_chat:
        mock_chat_instance = Mock()
        
        # First response: function call
        mock_function_call = Mock()
        mock_function_call.name = "get_active_doctors"
        mock_function_call.args = {}
        
        mock_part_with_function = Mock()
        mock_part_with_function.function_call = mock_function_call
        
        mock_response1 = Mock()
        mock_response1.candidates = [Mock(content=Mock(parts=[mock_part_with_function]))]
        mock_response1.text = None
        
        # Second response: text after function call
        mock_response2 = Mock()
        mock_response2.text = "Aquí están los doctores disponibles: Dr. Juan, Dr. María"
        
        mock_chat_instance.send_message = Mock(side_effect=[mock_response1, mock_response2])
        mock_chat.return_value = mock_chat_instance
        
        with patch('agents.appointment_agent.agent.execute_tool') as mock_execute:
            mock_execute.return_value = [{"id": 1, "name": "Dr. Juan"}, {"id": 2, "name": "Dr. María"}]
            
            response = await agent_with_fallback.process_message("+521234567890", "Lista de doctores")
            
            # Should call execute_tool
            mock_execute.assert_called_once()
            assert "doctores" in response.lower() or "doctor" in response.lower()


def test_get_all_tools():
    """Test that get_all_tools returns all 9 tools"""
    tools = get_all_tools()
    
    assert len(tools) == 9
    tool_names = [tool.name for tool in tools]
    
    assert "get_active_doctors" in tool_names
    assert "get_doctor_offices" in tool_names
    assert "get_available_slots" in tool_names
    assert "find_patient_by_phone" in tool_names
    assert "create_patient_from_chat" in tool_names
    assert "check_patient_has_previous_appointments" in tool_names
    assert "validate_appointment_slot" in tool_names
    assert "get_appointment_types" in tool_names
    assert "create_appointment_from_chat" in tool_names


def test_create_adk_tools(mock_db):
    """Test that create_adk_tools returns tools"""
    tools = create_adk_tools(mock_db)
    
    # Should return a list of tools
    assert isinstance(tools, list)
    assert len(tools) > 0


def test_execute_tool(mock_db):
    """Test that execute_tool calls the correct helper function"""
    with patch('agents.appointment_agent.tools.gemini_helpers') as mock_helpers:
        mock_helpers.get_active_doctors.return_value = [{"id": 1, "name": "Dr. Juan"}]
        
        result = execute_tool(mock_db, "get_active_doctors", {})
        
        mock_helpers.get_active_doctors.assert_called_once_with(mock_db)
        assert result == [{"id": 1, "name": "Dr. Juan"}]


def test_execute_tool_unknown_function(mock_db):
    """Test that execute_tool handles unknown functions"""
    result = execute_tool(mock_db, "unknown_function", {})
    
    assert "error" in result


def test_execute_tool_error_handling(mock_db):
    """Test that execute_tool handles errors gracefully"""
    with patch('agents.appointment_agent.tools.gemini_helpers') as mock_helpers:
        mock_helpers.get_active_doctors.side_effect = Exception("Database error")
        
        result = execute_tool(mock_db, "get_active_doctors", {})
        
        assert "error" in result


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


def test_get_deployment_config(agent_with_fallback):
    """Test that get_deployment_config raises error for non-ADK agent"""
    with pytest.raises(ValueError, match="Agent must be initialized with ADK"):
        agent_with_fallback.get_deployment_config()


@pytest.mark.asyncio
async def test_fallback_on_adk_error(mock_db):
    """Test that agent falls back to GenerativeModel if ADK fails"""
    with patch('agents.appointment_agent.agent.vertexai.init'):
        with patch('agents.appointment_agent.agent.ADK_AVAILABLE', True):
            with patch('agents.appointment_agent.agent.LlmAgent') as mock_adk:
                # Make ADK initialization fail
                mock_adk.side_effect = Exception("ADK initialization failed")
                
                # Should fall back to GenerativeModel
                with patch('agents.appointment_agent.agent.GenerativeModel') as mock_model:
                    mock_model_instance = Mock()
                    mock_model.return_value = mock_model_instance
                    
                    agent = AppointmentAgent(mock_db, use_adk=True)
                    
                    # Should be using GenerativeModel fallback
                    assert not agent.use_adk
                    assert agent.model is not None
