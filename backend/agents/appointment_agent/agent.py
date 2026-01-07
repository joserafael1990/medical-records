"""
Appointment Agent using ADK pattern
Manages WhatsApp appointment scheduling conversations
"""
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from datetime import datetime
import vertexai
from vertexai.generative_models import GenerativeModel, Tool, Part, Content
from config import settings
from logger import get_logger
from .tools import get_all_tools, execute_tool
from .prompts import APPOINTMENT_AGENT_PROMPT
from .state import AppointmentSessionState

api_logger = get_logger("medical_records.adk_agent")


class AppointmentAgent:
    """
    Agent for managing WhatsApp appointment scheduling conversations.
    Uses Vertex AI GenerativeModel with function calling (ADK pattern).
    """
    
    def __init__(self, db: Session):
        """
        Initialize Appointment Agent with Vertex AI.
        Uses Application Default Credentials (works automatically in Cloud Run).
        """
        self.db = db
        self.session_state = AppointmentSessionState()
        
        # Initialize Vertex AI
        if not settings.GCP_PROJECT_ID:
            raise ValueError("GCP_PROJECT_ID must be set in environment variables")
        
        vertexai.init(
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_REGION
        )
        
        # Create tools (function declarations) for Gemini
        tools = self._create_tools()
        
        # Initialize model with system instructions and tools
        self.model = GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=APPOINTMENT_AGENT_PROMPT,
            tools=tools if tools else None
        )
        
        api_logger.info(
            f"Appointment Agent initialized",
            extra={
                "model": settings.GEMINI_MODEL,
                "project": settings.GCP_PROJECT_ID,
                "region": settings.GCP_REGION
            }
        )
    
    def _create_tools(self) -> List[Tool]:
        """Create function calling tools for Gemini."""
        function_declarations = get_all_tools()
        return [Tool(function_declarations=function_declarations)] if function_declarations else []
    
    def _detect_simple_command(self, message: str) -> Optional[str]:
        """
        Detect simple commands that don't require Gemini processing.
        Returns command type or None if should use Gemini.
        """
        message_lower = message.lower().strip()
        
        # Cancel commands
        if message_lower in ["cancelar", "salir", "cancel", "exit"]:
            return "cancel"
        
        # Help commands
        if message_lower in ["ayuda", "help", "?", "¿"]:
            return "help"
        
        return None
    
    async def process_message(self, phone_number: str, message_text: str) -> str:
        """
        Process a WhatsApp message and generate a response using Gemini.
        
        Args:
            phone_number: User's phone number
            message_text: Message text from user
        
        Returns:
            Response text to send to user
        """
        try:
            # Check if bot is enabled
            if not settings.GEMINI_BOT_ENABLED:
                return "Lo siento, el servicio de agendamiento por chat no está disponible en este momento."
            
            # Check for simple commands (bypass Gemini for cost optimization)
            simple_command = self._detect_simple_command(message_text)
            if simple_command == "cancel":
                self.session_state.reset_session(phone_number)
                return "✅ Proceso cancelado. Si necesitas agendar una cita más adelante, escríbenos."
            elif simple_command == "help":
                return """📋 Ayuda - Agendamiento de Citas

Para agendar una cita, simplemente escribe y te guiaré paso a paso:
1. Seleccionarás un doctor
2. Elegirás fecha y hora disponible
3. Confirmarás los datos

Comandos disponibles:
- "cancelar" o "salir" - Cancelar el proceso
- "ayuda" - Ver este mensaje

¿Listo para comenzar? Escribe cualquier mensaje para empezar."""
            
            # Get conversation history
            history_dicts = self.session_state.get_history(phone_number)
            
            # Convert history dicts to Content objects
            history = []
            if history_dicts:
                for h in history_dicts:
                    role = h.get("role", "user")
                    parts = h.get("parts", [])
                    # Convert string parts to Part objects
                    part_objects = [Part.from_text(p) if isinstance(p, str) else p for p in parts]
                    if part_objects:  # Only add if parts exist
                        history.append(Content(role=role, parts=part_objects))
            
            # Start chat with history (pass None if empty, which creates a new chat)
            chat = self.model.start_chat(history=history if history else None)
            
            # Generate response
            response = chat.send_message(message_text)
            
            # Process function calls if any
            if response.candidates and response.candidates[0].content.parts:
                final_response_text = ""
                function_calls_processed = False
                
                for part in response.candidates[0].content.parts:
                    if hasattr(part, 'function_call'):
                        # Execute function call
                        function_call = part.function_call
                        function_name = function_call.name
                        function_args = dict(function_call.args) if hasattr(function_call, 'args') else {}
                        
                        api_logger.debug(
                            f"Executing function call: {function_name}",
                            extra={"args": function_args, "phone": phone_number}
                        )
                        
                        # Execute function
                        function_result = execute_tool(self.db, function_name, function_args)
                        
                        # Add function result to conversation
                        function_response_part = Part.from_function_response(
                            name=function_name,
                            response={"result": function_result}
                        )
                        
                        # Get final response after function call
                        follow_up_response = chat.send_message([function_response_part])
                        if follow_up_response and follow_up_response.text:
                            final_response_text = follow_up_response.text
                        
                        function_calls_processed = True
                    
                    elif hasattr(part, 'text'):
                        final_response_text = part.text
                
                # If no function calls, use text response
                if not function_calls_processed and response.text:
                    final_response_text = response.text
                
                # Update conversation history (convert back to dicts for storage)
                updated_history_dicts = [{"role": "user", "parts": [message_text]}]
                updated_history_dicts.append({"role": "model", "parts": [final_response_text]})
                self.session_state.update_history(phone_number, updated_history_dicts)
                
                return final_response_text
            
            # Fallback: return text response
            if response.text:
                updated_history_dicts = [{"role": "user", "parts": [message_text]}]
                updated_history_dicts.append({"role": "model", "parts": [response.text]})
                self.session_state.update_history(phone_number, updated_history_dicts)
                return response.text
            
            # Fallback message
            if settings.GEMINI_FALLBACK_ENABLED:
                return "Lo siento, no pude procesar tu mensaje. Por favor intenta de nuevo o escribe 'ayuda' para ver las opciones."
            
            return "Error procesando mensaje."
        
        except Exception as e:
            api_logger.error(f"Error processing message: {e}", exc_info=True)
            
            if settings.GEMINI_FALLBACK_ENABLED:
                return "Lo siento, hubo un problema técnico. Por favor intenta de nuevo en un momento o contacta directamente."
            
            raise

