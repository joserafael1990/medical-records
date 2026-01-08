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
        
        # #region agent log
        import json; import time; log_path = '/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log'; open(log_path, 'a').write(json.dumps({"location":"agent.py:37","message":"Initializing Vertex AI","data":{"gcp_project_id":settings.GCP_PROJECT_ID,"gcp_region":settings.GCP_REGION,"gemini_model":settings.GEMINI_MODEL},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"B"})+'\n')
        # #endregion
        
        vertexai.init(
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_REGION
        )
        
        # #region agent log
        open(log_path, 'a').write(json.dumps({"location":"agent.py:40","message":"Vertex AI initialized, creating tools","data":{},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"B"})+'\n')
        # #endregion
        
        # Create tools (function declarations) for Gemini
        tools = self._create_tools()
        
        # #region agent log
        open(log_path, 'a').write(json.dumps({"location":"agent.py:45","message":"Creating GenerativeModel","data":{"tools_count":len(tools[0].function_declarations) if tools and tools[0].function_declarations else 0},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"B"})+'\n')
        # #endregion
        
        # Initialize model with system instructions and tools
        self.model = GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=APPOINTMENT_AGENT_PROMPT,
            tools=tools if tools else None
        )
        
        # #region agent log
        open(log_path, 'a').write(json.dumps({"location":"agent.py:51","message":"GenerativeModel created successfully","data":{},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"B"})+'\n')
        # #endregion
        
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
            
            # #region agent log
            import json; import time; log_path = '/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log'; open(log_path, 'a').write(json.dumps({"location":"agent.py:118","message":"process_message called","data":{"phone_number":phone_number,"message_length":len(message_text)},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"E"})+'\n')
            # #endregion
            
            # Get conversation history
            history_dicts = self.session_state.get_history(phone_number)
            
            # #region agent log
            open(log_path, 'a').write(json.dumps({"location":"agent.py:120","message":"Got conversation history","data":{"history_length":len(history_dicts) if history_dicts else 0},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"C"})+'\n')
            # #endregion
            
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
            
            # #region agent log
            open(log_path, 'a').write(json.dumps({"location":"agent.py:133","message":"History converted to Content objects, starting chat","data":{"history_content_length":len(history)},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"C"})+'\n')
            # #endregion
            
            # Start chat with history (pass None if empty, which creates a new chat)
            chat = self.model.start_chat(history=history if history else None)
            
            # #region agent log
            open(log_path, 'a').write(json.dumps({"location":"agent.py:136","message":"Chat started, sending message to Gemini","data":{"message_text_length":len(message_text)},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"D"})+'\n')
            # #endregion
            
            # Generate response
            response = chat.send_message(message_text)
            
            # #region agent log
            open(log_path, 'a').write(json.dumps({"location":"agent.py:138","message":"Gemini response received","data":{"has_candidates":bool(response.candidates) if response else False,"has_text":bool(response.text) if response else False},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"D"})+'\n')
            # #endregion
            
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
            # #region agent log
            import json; import traceback; import time; log_path = '/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log'; open(log_path, 'a').write(json.dumps({"location":"agent.py:198","message":"Exception in process_message","data":{"phone_number":phone_number,"error_type":type(e).__name__,"error_message":str(e),"traceback":traceback.format_exc()},"timestamp":time.time()*1000,"sessionId":"debug-session","runId":"run1","hypothesisId":"A,B,C,D,E"})+'\n')
            # #endregion
            
            api_logger.error(f"Error processing message: {e}", exc_info=True)
            
            if settings.GEMINI_FALLBACK_ENABLED:
                return "Lo siento, hubo un problema técnico. Por favor intenta de nuevo en un momento o contacta directamente."
            
            raise

