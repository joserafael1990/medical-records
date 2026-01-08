"""
Appointment Agent using ADK (Agent Development Kit)
Manages WhatsApp appointment scheduling conversations
Supports both ADK official (for Agent Engine deployment) and GenerativeModel fallback
"""
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from datetime import datetime
import vertexai
from vertexai.generative_models import GenerativeModel, Tool, Part, Content
from config import settings
from logger import get_logger
from .tools import get_all_tools, execute_tool, create_adk_tools
from .prompts import APPOINTMENT_AGENT_PROMPT
from .state import AppointmentSessionState

api_logger = get_logger("medical_records.adk_agent")

# Try to import direct Generative AI API as fallback
try:
    import google.generativeai as genai
    GENERATIVE_AI_AVAILABLE = True
except ImportError:
    GENERATIVE_AI_AVAILABLE = False
    api_logger.info("google-generativeai not available, will only use Vertex AI")

# Try to import ADK classes
try:
    from google.cloud.aiplatform.adk.agents import Agent, LlmAgent
    ADK_AVAILABLE = True
except ImportError:
    try:
        from google.adk.agents import Agent, LlmAgent
        ADK_AVAILABLE = True
    except ImportError:
        ADK_AVAILABLE = False
        api_logger.info("ADK not available, using GenerativeModel as fallback")


class AppointmentAgent:
    """
    Agent for managing WhatsApp appointment scheduling conversations.
    Uses ADK official if available, otherwise falls back to GenerativeModel.
    """
    
    def __init__(self, db: Session, use_adk: bool = True):
        """
        Initialize Appointment Agent.
        
        Args:
            db: Database session
            use_adk: If True, try to use ADK official. If False or ADK unavailable, use GenerativeModel.
        """
        self.db = db
        self.session_state = AppointmentSessionState()
        self.use_adk = use_adk and ADK_AVAILABLE
        
        # Initialize Vertex AI
        if not settings.GCP_PROJECT_ID:
            raise ValueError("GCP_PROJECT_ID must be set in environment variables")
        
        api_logger.info(
            "Initializing Appointment Agent",
            extra={
                "gcp_project_id": settings.GCP_PROJECT_ID,
                "gcp_region": settings.GCP_REGION,
                "gemini_model": settings.GEMINI_MODEL,
                "use_adk": self.use_adk,
                "adk_available": ADK_AVAILABLE
            }
        )
        
        vertexai.init(
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_REGION
        )
        
        if self.use_adk:
            # Try to use ADK official
            try:
                self._init_adk_agent()
                api_logger.info("Appointment Agent initialized with ADK")
                return
            except Exception as e:
                api_logger.warning(f"Failed to initialize ADK agent, falling back to GenerativeModel: {e}", exc_info=True)
                self.use_adk = False
        
        # Fallback to GenerativeModel
        try:
            self._init_generative_model()
            api_logger.info("Appointment Agent initialized with GenerativeModel (fallback)")
        except Exception as e:
            api_logger.error(f"Failed to initialize any model: {e}", exc_info=True)
            raise
    
    def _init_adk_agent(self):
        """Initialize agent using ADK official."""
        # Create tools using ADK
        tools = create_adk_tools(self.db)
        
        # Create ADK agent
        # Note: The exact API may vary - we'll adjust based on actual ADK documentation
        # For now, try different possible APIs
        try:
            # Try LlmAgent with tools
            self.agent = LlmAgent(
                model=settings.GEMINI_MODEL,
                system_instruction=APPOINTMENT_AGENT_PROMPT,
                tools=tools
            )
        except (TypeError, AttributeError) as e:
            # If that doesn't work, try alternative API
            api_logger.warning(f"First ADK API attempt failed: {e}. Trying alternative...")
            # Alternative: create Agent with different structure
            # This will be adjusted based on actual ADK documentation
            raise
    
    def _init_generative_model(self):
        """Initialize agent using GenerativeModel (fallback)."""
        # Create tools (FunctionDeclaration for GenerativeModel)
        function_declarations = get_all_tools()
        tools = [Tool(function_declarations=function_declarations)] if function_declarations else []
        
        # Try to initialize Vertex AI model first, but don't fail if it doesn't work
        # We'll test it when we actually use it
        try:
            self.model = GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                system_instruction=APPOINTMENT_AGENT_PROMPT,
                tools=tools if tools else None
            )
            self.use_direct_api = False
            self.vertex_ai_available = True
            api_logger.info("Vertex AI GenerativeModel initialized (will test on first use)")
        except Exception as e:
            api_logger.warning(f"Vertex AI model initialization failed: {e}. Will use direct Generative AI API as fallback.")
            self.vertex_ai_available = False
            
            # Initialize direct Generative AI API as fallback
            if GENERATIVE_AI_AVAILABLE:
                try:
                    # Configure direct API - use Application Default Credentials
                    # The API will use GOOGLE_APPLICATION_CREDENTIALS automatically
                    genai.configure()
                    # Map Vertex AI model names to Generative AI model names
                    model_map = {
                        "gemini-1.5-flash": "gemini-1.5-flash",
                        "gemini-1.5-pro": "gemini-1.5-pro",
                        "gemini-pro": "gemini-pro",
                    }
                    direct_model_name = model_map.get(settings.GEMINI_MODEL, "gemini-1.5-flash")
                    
                    self.model = genai.GenerativeModel(
                        model_name=direct_model_name,
                        system_instruction=APPOINTMENT_AGENT_PROMPT
                    )
                    self.use_direct_api = True
                    api_logger.info(f"Using direct Generative AI API with model: {direct_model_name}")
                except Exception as e2:
                    api_logger.error(f"Direct Generative AI API also failed: {e2}", exc_info=True)
                    # Store the error but don't raise - we'll try again on first use
                    self.direct_api_error = e2
            else:
                api_logger.error("Direct Generative AI API not available")
                raise
    
    def _detect_simple_command(self, message: str) -> Optional[str]:
        """
        Detect simple commands that don't require LLM processing.
        Returns command type or None if should use LLM.
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
        Process a WhatsApp message and generate a response.
        
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
            
            # Check for simple commands (bypass LLM for cost optimization)
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
            
            if self.use_adk:
                return await self._process_message_adk(phone_number, message_text)
            else:
                return await self._process_message_generative_model(phone_number, message_text)
        
        except Exception as e:
            api_logger.error(f"Error processing message: {e}", exc_info=True)
            
            if settings.GEMINI_FALLBACK_ENABLED:
                return "Lo siento, hubo un problema técnico. Por favor intenta de nuevo en un momento o contacta directamente."
            
            raise
    
    async def _process_message_adk(self, phone_number: str, message_text: str) -> str:
        """Process message using ADK agent."""
        # Get conversation history
        history_dicts = self.session_state.get_history(phone_number)
        
        # TODO: Adapt history format for ADK
        # ADK may use a different history format - we'll adjust based on actual API
        # For now, use a placeholder that will be updated based on actual ADK documentation
        
        try:
            # Call ADK agent
            # Note: The exact API may vary - we'll adjust based on actual ADK documentation
            # Possible APIs:
            # 1. agent.chat(message_text, history=history)
            # 2. agent.run(message_text, context=history)
            # 3. agent.process(message_text, session=phone_number)
            
            # For now, try a generic approach
            if hasattr(self.agent, 'chat'):
                response = await self.agent.chat(message_text, history=history_dicts)
            elif hasattr(self.agent, 'run'):
                response = await self.agent.run(message_text, context=history_dicts)
            elif hasattr(self.agent, 'process'):
                response = await self.agent.process(message_text, session=phone_number)
            else:
                # If ADK API is different, fall back to GenerativeModel
                api_logger.warning("ADK agent doesn't have expected methods, falling back to GenerativeModel")
                self.use_adk = False
                return await self._process_message_generative_model(phone_number, message_text)
            
            # Extract response text
            if hasattr(response, 'text'):
                response_text = response.text
            elif isinstance(response, str):
                response_text = response
            elif isinstance(response, dict):
                response_text = response.get('text', str(response))
            else:
                response_text = str(response)
            
            # Update conversation history
            updated_history_dicts = [{"role": "user", "parts": [message_text]}]
            updated_history_dicts.append({"role": "model", "parts": [response_text]})
            self.session_state.update_history(phone_number, updated_history_dicts)
            
            return response_text
        
        except Exception as e:
            api_logger.error(f"Error in ADK agent processing: {e}", exc_info=True)
            # Fall back to GenerativeModel on error
            api_logger.info("Falling back to GenerativeModel due to ADK error")
            self.use_adk = False
            return await self._process_message_generative_model(phone_number, message_text)
    
    async def _process_message_generative_model(self, phone_number: str, message_text: str) -> str:
        """Process message using GenerativeModel (fallback)."""
        # Get conversation history
        history_dicts = self.session_state.get_history(phone_number)
        
        # Check if using direct API or Vertex AI
        if hasattr(self, 'use_direct_api') and self.use_direct_api:
            return await self._process_message_direct_api(phone_number, message_text, history_dicts)
        
        # Use Vertex AI API - try it first, fallback to direct API if it fails
        try:
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
            # Important: pass None explicitly if history is empty, not an empty list
            chat = self.model.start_chat(history=history if len(history) > 0 else None)
            
            # Generate response
            response = chat.send_message(message_text)
        except Exception as e:
            # Vertex AI failed, try direct API as fallback
            api_logger.warning(f"Vertex AI failed: {e}. Falling back to direct Generative AI API...")
            if GENERATIVE_AI_AVAILABLE and not (hasattr(self, 'use_direct_api') and self.use_direct_api):
                # Initialize direct API on the fly
                try:
                    genai.configure()
                    model_map = {
                        "gemini-1.5-flash": "gemini-1.5-flash",
                        "gemini-1.5-pro": "gemini-1.5-pro",
                        "gemini-pro": "gemini-pro",
                    }
                    direct_model_name = model_map.get(settings.GEMINI_MODEL, "gemini-1.5-flash")
                    self.model = genai.GenerativeModel(
                        model_name=direct_model_name,
                        system_instruction=APPOINTMENT_AGENT_PROMPT
                    )
                    self.use_direct_api = True
                    api_logger.info(f"Switched to direct Generative AI API with model: {direct_model_name}")
                    return await self._process_message_direct_api(phone_number, message_text, history_dicts)
                except Exception as e2:
                    api_logger.error(f"Direct API fallback also failed: {e2}", exc_info=True)
                    raise
            else:
                raise
        
        # Process function calls if any
        if response.candidates and response.candidates[0].content.parts:
            final_response_text = ""
            function_calls_processed = False
            
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call is not None:
                    # Execute function call
                    function_call = part.function_call
                    function_name = function_call.name if hasattr(function_call, 'name') else None
                    if not function_name:
                        continue  # Skip if no function name
                    function_args = dict(function_call.args) if hasattr(function_call, 'args') and function_call.args else {}
                    
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
    
    async def _process_message_direct_api(self, phone_number: str, message_text: str, history_dicts: List[Dict]) -> str:
        """Process message using direct Generative AI API (google-generativeai)."""
        try:
            # Convert history to format expected by direct API
            chat_history = []
            if history_dicts:
                for h in history_dicts:
                    role = h.get("role", "user")
                    parts = h.get("parts", [])
                    if parts:
                        # Direct API expects simple text or dict format
                        content = " ".join(parts) if isinstance(parts[0], str) else str(parts[0])
                        chat_history.append({"role": role, "parts": [content]})
            
            # Start or continue chat
            if hasattr(self, '_direct_chat') and self._direct_chat:
                chat = self._direct_chat
            else:
                chat = self.model.start_chat(history=chat_history if chat_history else None)
                self._direct_chat = chat
            
            # Send message
            response = chat.send_message(message_text)
            
            # Extract response text
            if hasattr(response, 'text'):
                response_text = response.text
            else:
                response_text = str(response)
            
            # Update conversation history
            updated_history_dicts = [{"role": "user", "parts": [message_text]}]
            updated_history_dicts.append({"role": "model", "parts": [response_text]})
            self.session_state.update_history(phone_number, updated_history_dicts)
            
            return response_text
            
        except Exception as e:
            api_logger.error(f"Error in direct API: {e}", exc_info=True)
            raise
    
    def get_deployment_config(self) -> Dict[str, Any]:
        """
        Get configuration for deploying this agent to Vertex AI Agent Engine.
        Returns the agent object and requirements for deployment.
        """
        if not self.use_adk:
            raise ValueError("Agent must be initialized with ADK to be deployed to Agent Engine")
        
        return {
            "agent": self.agent,
            "requirements": [
                "google-cloud-aiplatform[agent_engines,adk]>=1.112",
                "sqlalchemy==2.0.23",
                "psycopg2-binary==2.9.9",
            ],
            "environment": {
                "GCP_PROJECT_ID": settings.GCP_PROJECT_ID,
                "GCP_REGION": settings.GCP_REGION,
                "GEMINI_MODEL": settings.GEMINI_MODEL,
            }
        }
