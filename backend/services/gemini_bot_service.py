"""
Gemini Bot Service for WhatsApp appointment scheduling
Uses Vertex AI (GCP) to provide conversational appointment booking
"""
import os
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from datetime import datetime
import vertexai
from vertexai.generative_models import GenerativeModel, Tool, FunctionDeclaration, Part
from config import settings
from logger import get_logger
from services.whatsapp_handlers.conversation_state import ConversationState
from services.whatsapp_handlers import gemini_helpers

api_logger = get_logger("medical_records.gemini_bot")


class GeminiBotService:
    """
    Service for managing Gemini AI conversations for WhatsApp appointment scheduling.
    Uses Vertex AI (GCP) with function calling to interact with the database.
    """
    
    def __init__(self, db: Session):
        """
        Initialize Gemini Bot Service with Vertex AI.
        Uses Application Default Credentials (works automatically in Cloud Run).
        """
        self.db = db
        self.conversation_state = ConversationState()
        
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
            system_instruction=self._get_system_instructions(),
            tools=tools if tools else None
        )
        
        api_logger.info(
            f"Gemini Bot Service initialized",
            extra={
                "model": settings.GEMINI_MODEL,
                "project": settings.GCP_PROJECT_ID,
                "region": settings.GCP_REGION
            }
        )
    
    def _create_tools(self) -> List[Tool]:
        """
        Create function calling tools for Gemini.
        These functions allow Gemini to interact with the database.
        """
        tools = []
        
        # Tool: Get active doctors
        get_doctors_func = FunctionDeclaration(
            name="get_active_doctors",
            description="Get list of all active doctors. Use this when user wants to see available doctors or select a doctor.",
            parameters={
                "type": "object",
                "properties": {},
                "required": []
            }
        )
        
        # Tool: Get doctor offices
        get_offices_func = FunctionDeclaration(
            name="get_doctor_offices",
            description="Get list of active offices for a specific doctor. Use this after doctor is selected to check if doctor has multiple offices.",
            parameters={
                "type": "object",
                "properties": {
                    "doctor_id": {
                        "type": "integer",
                        "description": "The ID of the doctor"
                    }
                },
                "required": ["doctor_id"]
            }
        )
        
        # Tool: Get available slots
        get_slots_func = FunctionDeclaration(
            name="get_available_slots",
            description="Get available appointment time slots for a doctor on a specific date. Use this when user wants to see available times or select a time.",
            parameters={
                "type": "object",
                "properties": {
                    "doctor_id": {
                        "type": "integer",
                        "description": "The ID of the doctor"
                    },
                    "office_id": {
                        "type": "integer",
                        "description": "The ID of the office"
                    },
                    "date_str": {
                        "type": "string",
                        "description": "Date in format YYYY-MM-DD (e.g., '2024-01-15')"
                    }
                },
                "required": ["doctor_id", "office_id", "date_str"]
            }
        )
        
        # Tool: Find patient by phone
        find_patient_func = FunctionDeclaration(
            name="find_patient_by_phone",
            description="Find a patient by their phone number. Use this to check if the user is already registered as a patient.",
            parameters={
                "type": "object",
                "properties": {
                    "phone": {
                        "type": "string",
                        "description": "Phone number to search for"
                    }
                },
                "required": ["phone"]
            }
        )
        
        # Tool: Create patient
        create_patient_func = FunctionDeclaration(
            name="create_patient_from_chat",
            description="Create a new patient record. Use this when user is not registered and provides their information.",
            parameters={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Patient's full name"
                    },
                    "phone": {
                        "type": "string",
                        "description": "Patient's primary phone number"
                    },
                    "birth_date": {
                        "type": "string",
                        "description": "Birth date in format YYYY-MM-DD (optional)"
                    },
                    "contact_phone": {
                        "type": "string",
                        "description": "Contact phone if different from primary phone (optional)"
                    }
                },
                "required": ["name", "phone"]
            }
        )
        
        # Tool: Check previous appointments
        check_appointments_func = FunctionDeclaration(
            name="check_patient_has_previous_appointments",
            description="Check if patient has previous COMPLETED appointments with a specific doctor. Use this to determine if appointment is 'Primera vez' or 'Seguimiento'. Only counts appointments with status='completed', not cancelled or pending.",
            parameters={
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "integer",
                        "description": "The ID of the patient"
                    },
                    "doctor_id": {
                        "type": "integer",
                        "description": "The ID of the doctor"
                    }
                },
                "required": ["patient_id", "doctor_id"]
            }
        )
        
        # Tool: Validate appointment slot
        validate_slot_func = FunctionDeclaration(
            name="validate_appointment_slot",
            description="Validate that an appointment slot is still available before creating. Use this as a double-check before creating the appointment.",
            parameters={
                "type": "object",
                "properties": {
                    "doctor_id": {
                        "type": "integer",
                        "description": "The ID of the doctor"
                    },
                    "office_id": {
                        "type": "integer",
                        "description": "The ID of the office"
                    },
                    "date_str": {
                        "type": "string",
                        "description": "Date in format YYYY-MM-DD"
                    },
                    "time_str": {
                        "type": "string",
                        "description": "Time in format HH:MM (24-hour format, e.g., '14:30')"
                    }
                },
                "required": ["doctor_id", "office_id", "date_str", "time_str"]
            }
        )
        
        # Tool: Get appointment types
        get_appointment_types_func = FunctionDeclaration(
            name="get_appointment_types",
            description="Get list of appointment types (Presencial, En línea). Use this to show options to user.",
            parameters={
                "type": "object",
                "properties": {},
                "required": []
            }
        )
        
        # Tool: Create appointment
        create_appointment_func = FunctionDeclaration(
            name="create_appointment_from_chat",
            description="Create a new appointment. Use this ONLY after all information is collected and user has confirmed. Always validate the slot first using validate_appointment_slot.",
            parameters={
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "integer",
                        "description": "The ID of the patient"
                    },
                    "doctor_id": {
                        "type": "integer",
                        "description": "The ID of the doctor"
                    },
                    "office_id": {
                        "type": "integer",
                        "description": "The ID of the office"
                    },
                    "date_str": {
                        "type": "string",
                        "description": "Date in format YYYY-MM-DD"
                    },
                    "time_str": {
                        "type": "string",
                        "description": "Time in format HH:MM (24-hour format, e.g., '14:30')"
                    },
                    "consultation_type": {
                        "type": "string",
                        "description": "Type of consultation: 'Primera vez' or 'Seguimiento'"
                    },
                    "appointment_type_id": {
                        "type": "integer",
                        "description": "Appointment type ID (1 for Presencial, 2 for En línea, etc.)"
                    }
                },
                "required": ["patient_id", "doctor_id", "office_id", "date_str", "time_str", "consultation_type", "appointment_type_id"]
            }
        )
        
        # Create Tool objects
        tools = [
            Tool(function_declarations=[
                get_doctors_func,
                get_offices_func,
                get_slots_func,
                find_patient_func,
                create_patient_func,
                check_appointments_func,
                validate_slot_func,
                get_appointment_types_func,
                create_appointment_func
            ])
        ]
        
        return tools
    
    def _get_system_instructions(self) -> str:
        """
        Get detailed system instructions for Gemini.
        These instructions define the complete conversational flow and logic.
        """
        return """Eres un asistente de agendamiento de citas médicas por WhatsApp. Tu objetivo es guiar al usuario a través del proceso de agendar una cita de forma amigable, clara y profesional.

# IDENTIDAD Y TONO
- Eres un asistente virtual profesional y amigable
- Hablas en español mexicano, de forma clara y concisa
- Usa emojis estratégicamente: 🗓️ para fechas, ⏰ para horarios, ✅ para confirmaciones, ❌ para cancelaciones, 👨‍⚕️ para doctores
- Sé paciente y comprensivo si el usuario no entiende algo
- Mantén las respuestas breves pero completas

# FLUJO DE CONVERSACIÓN

## 1. SALUDO INICIAL
Cuando el usuario escribe por primera vez:
- Saluda amigablemente: "¡Hola! 👋 Bienvenido al sistema de agendamiento de citas médicas."
- Pregunta: "¿Con qué doctor te gustaría agendar tu cita?"
- Usa la función `get_active_doctors()` para obtener la lista de doctores disponibles
- Presenta los doctores de forma clara, numerados o con viñetas

## 2. SELECCIÓN DE DOCTOR
- Cuando el usuario indique un doctor (por nombre, número, o descripción):
  - Valida que el doctor existe en la lista
  - Si hay ambigüedad, pregunta para aclarar
  - Una vez seleccionado, usa `get_doctor_offices(doctor_id)` para verificar consultorios

## 3. SELECCIÓN DE CONSULTORIO Y TIPO DE CITA
- Si el doctor tiene MÚLTIPLES consultorios activos:
  - Muestra la lista de consultorios con sus direcciones
  - Para cada consultorio, indica si es "Presencial" o "En línea" basándote en el campo `is_virtual`:
    - Si `is_virtual` es `true`: el consultorio es virtual → la cita será "En línea"
    - Si `is_virtual` es `false`: el consultorio es físico → la cita será "Presencial"
  - Pregunta: "¿En cuál consultorio te gustaría agendar? (1, 2, etc.)"
- Si el doctor tiene SOLO UN consultorio:
  - NO preguntes, usa ese consultorio automáticamente
  - Determina el tipo de cita automáticamente basándote en `is_virtual`:
    - Si `is_virtual` es `true`: informa "El doctor tiene un consultorio virtual. La consulta será En línea."
    - Si `is_virtual` es `false`: informa "El doctor tiene un consultorio en [dirección]. La consulta será Presencial."
- **IMPORTANTE**: Después de seleccionar el consultorio:
  - Usa `get_appointment_types()` para obtener los tipos disponibles
  - Determina automáticamente el `appointment_type_id`:
    - Si el consultorio es virtual (`is_virtual = true`): usa el `appointment_type_id` correspondiente a "En línea"
    - Si el consultorio es físico (`is_virtual = false`): usa el `appointment_type_id` correspondiente a "Presencial"
  - NO preguntes al usuario sobre el tipo de cita, ya está determinado por el consultorio seleccionado

## 4. CONSULTA DE AGENDA
- Pregunta: "¿Para qué fecha te gustaría agendar?"
- Acepta múltiples formatos: "mañana", "15 de enero", "15/01/2024", "2024-01-15", etc.
- **IMPORTANTE**: No permitas fechas en el pasado. Si el usuario intenta agendar en el pasado, informa amigablemente y pide otra fecha.
- Una vez tengas la fecha, usa `get_available_slots(doctor_id, office_id, date_str)` para obtener horarios disponibles
- Presenta los horarios de forma clara, agrupados si hay muchos
- Si no hay horarios disponibles, sugiere otras fechas cercanas

## 5. VALIDACIÓN DE PACIENTE
- Usa `find_patient_by_phone(phone)` para buscar si el número ya está registrado
- **Si el paciente EXISTE**:
  - Pregunta: "¿La cita es para [nombre del paciente registrado] o para otra persona?"
  - **Si es para el paciente registrado**: Continúa con el agendamiento usando ese patient_id
  - **Si es para otra persona**:
    - Informa claramente: "El número desde el que estás agendando ([número actual]) quedará registrado como número de contacto para esta cita. ¿Estás de acuerdo con esto?"
    - **Si está de acuerdo**: Solicita datos del nuevo paciente (nombre completo, fecha de nacimiento) y usa `create_patient_from_chat()` para crearlo
    - **Si NO está de acuerdo**: Pregunta: "¿Cuál debe ser el número de contacto para este paciente?" y espera la respuesta. Luego crea el paciente con ese número de contacto.
- **Si el paciente NO EXISTE**:
  - Solicita datos básicos: nombre completo y fecha de nacimiento (opcional)
  - Usa `create_patient_from_chat()` para crear el paciente

## 6. TIPO DE CONSULTA (Primera vez/Seguimiento)
- Usa `check_patient_has_previous_appointments(patient_id, doctor_id)` para verificar
- **IMPORTANTE**: Solo cuenta citas con status='completed' (completadas), NO cuentes citas canceladas ni pendientes
- **Si el paciente tiene al menos una cita COMPLETADA con ese doctor**:
  - Tipo de consulta: "Seguimiento"
  - Informa: "Veo que ya has tenido consultas previas con este doctor, así que será una cita de Seguimiento."
- **Si el paciente NO tiene citas completadas** (solo canceladas, pendientes, o ninguna):
  - Tipo de consulta: "Primera vez"
  - Informa: "Esta será tu primera consulta con este doctor, así que será una cita de Primera vez."
- **NO preguntes al usuario**, solo informa lo que detectaste

## 7. CONFIRMACIÓN ANTES DE CREAR
- ANTES de crear la cita, SIEMPRE muestra un resumen completo:
  ```
  📋 Resumen de tu cita:
  
  👨‍⚕️ Doctor: [nombre del doctor]
  🏥 Consultorio: [nombre y dirección]
  📅 Fecha: [fecha en formato legible]
  ⏰ Hora: [hora]
  📍 Tipo: [Presencial/En línea]
  👤 Paciente: [nombre del paciente]
  🩺 Tipo de consulta: [Primera vez/Seguimiento]
  
  ¿Confirmas esta cita? (Responde "sí" o "confirmar" para crear la cita)
  ```
- Espera confirmación explícita del usuario
- Si el usuario no confirma o quiere cambiar algo, permite corregir

## 8. CREACIÓN DE CITA
- Solo después de confirmación explícita:
  1. Primero valida el slot: `validate_appointment_slot(doctor_id, office_id, date_str, time_str)`
  2. Si el slot está disponible, crea la cita: `create_appointment_from_chat(...)`
  3. Si el slot ya no está disponible, informa y ofrece alternativas cercanas
- Después de crear exitosamente, envía mensaje de confirmación:
  ```
  ✅ ¡Cita agendada exitosamente!
  
  Tu cita ha sido registrada:
  [Resumen de la cita]
  
  Recibirás un recordatorio antes de tu cita. Si necesitas cancelar o modificar, puedes escribirnos.
  ```

# COMANDOS ESPECIALES
- Si el usuario escribe "cancelar" o "salir": Resetea la conversación y confirma: "Proceso cancelado. Si necesitas agendar una cita más adelante, escríbenos."
- Si el usuario escribe "ayuda" o "?": Proporciona orientación sobre el proceso de agendamiento
- Si el usuario escribe "sí", "no", "confirmar": Procesa como confirmación o negación según el contexto

# VALIDACIONES Y REGLAS
- **Fechas en el pasado**: NO permitas agendar en el pasado. Si el usuario intenta, informa amigablemente y pide otra fecha.
- **Límite de días**: No permitas agendar más de 90 días en el futuro (configurable)
- **Horarios**: Valida que los horarios estén dentro del horario de trabajo del doctor
- **Nombres**: Valida que los nombres no estén vacíos
- **Formatos de fecha**: Acepta múltiples formatos pero normaliza a YYYY-MM-DD para las funciones

# MANEJO DE ERRORES
- Si hay error al consultar doctores, horarios, o crear cita:
  - Informa claramente: "Lo siento, hubo un problema al [acción]. Por favor intenta de nuevo o contacta directamente."
  - Ofrece alternativas cuando sea posible
- Si el usuario escribe algo que no entiendes 2-3 veces:
  - Ofrece ayuda: "Parece que hay confusión. ¿Te gustaría que te guíe paso a paso? Escribe 'ayuda' para ver las opciones."
- Si un horario ya no está disponible:
  - Informa: "Lo siento, ese horario ya no está disponible. Aquí tienes otros horarios disponibles: [lista]"

# MANEJO DE AMBIGÜEDADES
- Si el usuario escribe algo ambiguo, pregunta para aclarar de forma amigable
- Si hay múltiples doctores con nombres similares, muestra la lista y pide que especifique
- Si el usuario no responde claramente, sé paciente y reformula la pregunta

# FORMATO DE RESPUESTAS
- Usa emojis estratégicamente para hacer mensajes más legibles
- Formatea listas de opciones de forma clara (números o viñetas)
- Separa información importante en bloques claros
- Mantén respuestas breves pero completas (no más de 3-4 líneas por mensaje cuando sea posible)

# OPTIMIZACIÓN
- Usa las funciones solo cuando sea necesario, no para cada mensaje
- Mantén el contexto de la conversación para no repetir preguntas
- Si el usuario proporciona múltiples datos en un mensaje, procésalos todos

# IMPORTANTE
- SIEMPRE muestra un resumen completo antes de crear la cita
- SIEMPRE valida el slot antes de crear la cita
- SIEMPRE espera confirmación explícita antes de crear
- NO cuentes citas canceladas o pendientes para determinar "Primera vez" vs "Seguimiento"
- NO permitas fechas en el pasado
- NO preguntes por el tipo de cita (Presencial/En línea) - se determina automáticamente del consultorio seleccionado basándote en `is_virtual`
- El tipo de cita se determina automáticamente: consultorio virtual → "En línea", consultorio físico → "Presencial"
- Sé paciente y amigable en todo momento"""

    def _execute_function_call(self, function_name: str, args: Dict[str, Any]) -> Any:
        """
        Execute a function call from Gemini.
        Maps function names to actual helper functions.
        """
        try:
            if function_name == "get_active_doctors":
                return gemini_helpers.get_active_doctors(self.db)
            
            elif function_name == "get_doctor_offices":
                return gemini_helpers.get_doctor_offices(self.db, args.get("doctor_id"))
            
            elif function_name == "get_available_slots":
                return gemini_helpers.get_available_slots(
                    self.db,
                    args.get("doctor_id"),
                    args.get("office_id"),
                    args.get("date_str")
                )
            
            elif function_name == "find_patient_by_phone":
                return gemini_helpers.find_patient_by_phone(self.db, args.get("phone"))
            
            elif function_name == "create_patient_from_chat":
                return gemini_helpers.create_patient_from_chat(
                    self.db,
                    args.get("name"),
                    args.get("phone"),
                    args.get("birth_date"),
                    args.get("contact_phone")
                )
            
            elif function_name == "check_patient_has_previous_appointments":
                return gemini_helpers.check_patient_has_previous_appointments(
                    self.db,
                    args.get("patient_id"),
                    args.get("doctor_id")
                )
            
            elif function_name == "validate_appointment_slot":
                return gemini_helpers.validate_appointment_slot(
                    self.db,
                    args.get("doctor_id"),
                    args.get("office_id"),
                    args.get("date_str"),
                    args.get("time_str")
                )
            
            elif function_name == "get_appointment_types":
                return gemini_helpers.get_appointment_types(self.db)
            
            elif function_name == "create_appointment_from_chat":
                return gemini_helpers.create_appointment_from_chat(
                    self.db,
                    args.get("patient_id"),
                    args.get("doctor_id"),
                    args.get("office_id"),
                    args.get("date_str"),
                    args.get("time_str"),
                    args.get("consultation_type"),
                    args.get("appointment_type_id")
                )
            
            else:
                api_logger.warning(f"Unknown function call: {function_name}")
                return {"error": f"Unknown function: {function_name}"}
        
        except Exception as e:
            api_logger.error(f"Error executing function {function_name}: {e}", exc_info=True)
            return {"error": str(e)}
    
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
        
        # Simple confirmations (only if context suggests it)
        # We'll let Gemini handle these in context
        
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
                self.conversation_state.reset_state(phone_number)
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
            history = self.conversation_state.get_history(phone_number)
            
            # Add current message to history
            history.append({"role": "user", "parts": [message_text]})
            
            # Start chat with history
            chat = self.model.start_chat(history=history)
            
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
                        function_result = self._execute_function_call(function_name, function_args)
                        
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
                
                # Update conversation history
                updated_history = history + [{"role": "model", "parts": [final_response_text]}]
                self.conversation_state.update_history(phone_number, updated_history)
                
                return final_response_text
            
            # Fallback: return text response
            if response.text:
                updated_history = history + [{"role": "model", "parts": [response.text]}]
                self.conversation_state.update_history(phone_number, updated_history)
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

