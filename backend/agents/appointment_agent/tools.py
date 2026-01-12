"""
ADK Tools for Appointment Agent
These tools wrap the existing gemini_helpers functions for use with ADK Agent Engine
"""
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session

# Import existing helper functions
from services.whatsapp_handlers import gemini_helpers
from logger import get_logger

api_logger = get_logger("medical_records.adk_agent")

# ADK imports - using google.adk (correct path for ADK 1.21.0+)
try:
    from google.adk.tools import FunctionTool
    ADK_AVAILABLE = True
except ImportError:
    try:
        from google.cloud.aiplatform.adk.tools import FunctionTool
        ADK_AVAILABLE = True
    except ImportError:
        # Fallback: use FunctionDeclaration for now if ADK not available
        from vertexai.generative_models import FunctionDeclaration
        ADK_AVAILABLE = False
        api_logger.warning("ADK FunctionTool not available, using FunctionDeclaration as fallback")


def get_active_doctors(db: Session) -> List[Dict[str, Any]]:
    """Get list of all active doctors. Use when user wants to see available doctors."""
    api_logger.debug("Executing get_active_doctors", extra={"hypothesisId": "D"})
    return gemini_helpers.get_active_doctors(db)


def get_doctor_offices(doctor_id: int, db: Session) -> List[Dict[str, Any]]:
    """Get list of active offices for a specific doctor."""
    api_logger.debug(f"Executing get_doctor_offices for doctor_id={doctor_id}", extra={"doctor_id": doctor_id})
    return gemini_helpers.get_doctor_offices(db, doctor_id)


def get_available_slots(doctor_id: int, office_id: int, date_str: str, db: Session) -> List[Dict[str, Any]]:
    """Get available appointment time slots for a doctor on a specific date."""
    api_logger.debug(f"Executing get_available_slots for doctor_id={doctor_id}, office_id={office_id}, date={date_str}")
    return gemini_helpers.get_available_slots(db, doctor_id, office_id, date_str)


def find_patient_by_phone(phone: str, db: Session) -> Optional[Dict[str, Any]]:
    """Find a patient by their phone number."""
    api_logger.debug(f"Executing find_patient_by_phone for phone={phone}")
    return gemini_helpers.find_patient_by_phone(db, phone)


def create_patient_from_chat(
    name: str,
    phone: str,
    db: Session,
    birth_date: Optional[str] = None,
    contact_phone: Optional[str] = None
) -> Dict[str, Any]:
    """Create a new patient record."""
    api_logger.debug(f"Executing create_patient_from_chat for name={name}, phone={phone}")
    return gemini_helpers.create_patient_from_chat(db, name, phone, birth_date, contact_phone)


def check_patient_has_previous_appointments(patient_id: int, doctor_id: int, db: Session) -> Dict[str, Any]:
    """Check if patient has previous COMPLETED appointments with a specific doctor."""
    api_logger.debug(f"Executing check_patient_has_previous_appointments for patient_id={patient_id}, doctor_id={doctor_id}")
    return gemini_helpers.check_patient_has_previous_appointments(db, patient_id, doctor_id)


def validate_appointment_slot(
    doctor_id: int,
    office_id: int,
    date_str: str,
    time_str: str,
    db: Session
) -> Dict[str, Any]:
    """Validate that an appointment slot is still available before creating."""
    api_logger.debug(f"Executing validate_appointment_slot for doctor_id={doctor_id}, office_id={office_id}, date={date_str}, time={time_str}")
    return gemini_helpers.validate_appointment_slot(db, doctor_id, office_id, date_str, time_str)


def get_appointment_types(db: Session) -> List[Dict[str, Any]]:
    """Get list of appointment types."""
    api_logger.debug("Executing get_appointment_types")
    return gemini_helpers.get_appointment_types(db)


def create_appointment_from_chat(
    patient_id: int,
    doctor_id: int,
    office_id: int,
    date_str: str,
    time_str: str,
    consultation_type: str,
    appointment_type_id: int,
    db: Session
) -> Dict[str, Any]:
    """Create a new appointment. Use ONLY after all information is collected and user has confirmed."""
    api_logger.debug(f"Executing create_appointment_from_chat for patient_id={patient_id}, doctor_id={doctor_id}")
    return gemini_helpers.create_appointment_from_chat(
        db, patient_id, doctor_id, office_id, date_str, time_str, consultation_type, appointment_type_id
    )


def create_adk_tools(db: Session) -> List[Any]:
    """
    Create ADK FunctionTool objects from the tool functions.
    This function will be called by the agent with the db session.
    """
    tools = []
    
    # Check if ADK is available (use global variable)
    global ADK_AVAILABLE
    adk_available = ADK_AVAILABLE
    
    if adk_available:
        # Use ADK FunctionTool if available
        # Note: The exact API may vary - we'll adjust based on actual ADK documentation
        # For now, create tools with proper descriptions and parameters
        try:
            tools = [
                FunctionTool(
                    func=lambda: get_active_doctors(db),
                    name="get_active_doctors",
                    description="Get list of all active doctors. Use this when user wants to see available doctors or select a doctor."
                ),
                FunctionTool(
                    func=lambda doctor_id: get_doctor_offices(doctor_id, db),
                    name="get_doctor_offices",
                    description="Get list of active offices for a specific doctor. Use this after doctor is selected to check if doctor has multiple offices.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "doctor_id": {"type": "integer", "description": "The ID of the doctor"}
                        },
                        "required": ["doctor_id"]
                    }
                ),
                FunctionTool(
                    func=lambda doctor_id, office_id, date_str: get_available_slots(doctor_id, office_id, date_str, db),
                    name="get_available_slots",
                    description="Get available appointment time slots for a doctor on a specific date. Use this when user wants to see available times or select a time.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                            "office_id": {"type": "integer", "description": "The ID of the office"},
                            "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD (e.g., '2024-01-15')"}
                        },
                        "required": ["doctor_id", "office_id", "date_str"]
                    }
                ),
                FunctionTool(
                    func=lambda phone: find_patient_by_phone(phone, db),
                    name="find_patient_by_phone",
                    description="Find a patient by their phone number. Use this to check if the user is already registered as a patient.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "phone": {"type": "string", "description": "Phone number to search for"}
                        },
                        "required": ["phone"]
                    }
                ),
                FunctionTool(
                    func=lambda name, phone, birth_date=None, contact_phone=None: create_patient_from_chat(name, phone, db, birth_date, contact_phone),
                    name="create_patient_from_chat",
                    description="Create a new patient record. Use this when user is not registered and provides their information.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Patient's full name"},
                            "phone": {"type": "string", "description": "Patient's primary phone number"},
                            "birth_date": {"type": "string", "description": "Birth date in format YYYY-MM-DD (optional)"},
                            "contact_phone": {"type": "string", "description": "Contact phone if different from primary phone (optional)"}
                        },
                        "required": ["name", "phone"]
                    }
                ),
                FunctionTool(
                    func=lambda patient_id, doctor_id: check_patient_has_previous_appointments(patient_id, doctor_id, db),
                    name="check_patient_has_previous_appointments",
                    description="Check if patient has previous COMPLETED appointments with a specific doctor. Use this to determine if appointment is 'Primera vez' or 'Seguimiento'. Only counts appointments with status='completed', not cancelled or pending.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "patient_id": {"type": "integer", "description": "The ID of the patient"},
                            "doctor_id": {"type": "integer", "description": "The ID of the doctor"}
                        },
                        "required": ["patient_id", "doctor_id"]
                    }
                ),
                FunctionTool(
                    func=lambda doctor_id, office_id, date_str, time_str: validate_appointment_slot(doctor_id, office_id, date_str, time_str, db),
                    name="validate_appointment_slot",
                    description="Validate that an appointment slot is still available before creating. Use this as a double-check before creating the appointment.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                            "office_id": {"type": "integer", "description": "The ID of the office"},
                            "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD"},
                            "time_str": {"type": "string", "description": "Time in format HH:MM (24-hour format, e.g., '14:30')"}
                        },
                        "required": ["doctor_id", "office_id", "date_str", "time_str"]
                    }
                ),
                FunctionTool(
                    func=lambda: get_appointment_types(db),
                    name="get_appointment_types",
                    description="Get list of appointment types (Presencial, En línea). Use this to show options to user."
                ),
                FunctionTool(
                    func=lambda patient_id, doctor_id, office_id, date_str, time_str, consultation_type, appointment_type_id: create_appointment_from_chat(
                        patient_id, doctor_id, office_id, date_str, time_str, consultation_type, appointment_type_id, db
                    ),
                    name="create_appointment_from_chat",
                    description="Create a new appointment. Use this ONLY after all information is collected and user has confirmed. Always validate the slot first using validate_appointment_slot.",
                    parameters={
                        "type": "object",
                        "properties": {
                            "patient_id": {"type": "integer", "description": "The ID of the patient"},
                            "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                            "office_id": {"type": "integer", "description": "The ID of the office"},
                            "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD"},
                            "time_str": {"type": "string", "description": "Time in format HH:MM (24-hour format, e.g., '14:30')"},
                            "consultation_type": {"type": "string", "description": "Type of consultation: 'Primera vez' or 'Seguimiento'"},
                            "appointment_type_id": {"type": "integer", "description": "Appointment type ID (1 for Presencial, 2 for En línea, etc.)"}
                        },
                        "required": ["patient_id", "doctor_id", "office_id", "date_str", "time_str", "consultation_type", "appointment_type_id"]
                    }
                )
            ]
        except Exception as e:
            api_logger.error(f"Error creating ADK tools: {e}", exc_info=True)
            # Fallback to FunctionDeclaration
            adk_available = False
    
    if not adk_available:
        # Fallback: Use FunctionDeclaration (for backward compatibility)
        from vertexai.generative_models import FunctionDeclaration
        tools = [
            FunctionDeclaration(
                name="get_active_doctors",
                description="Get list of all active doctors. Use this when user wants to see available doctors or select a doctor.",
                parameters={"type": "object", "properties": {}, "required": []}
            ),
            FunctionDeclaration(
                name="get_doctor_offices",
                description="Get list of active offices for a specific doctor. Use this after doctor is selected to check if doctor has multiple offices.",
                parameters={
                    "type": "object",
                    "properties": {
                        "doctor_id": {"type": "integer", "description": "The ID of the doctor"}
                    },
                    "required": ["doctor_id"]
                }
            ),
            FunctionDeclaration(
                name="get_available_slots",
                description="Get available appointment time slots for a doctor on a specific date. Use this when user wants to see available times or select a time.",
                parameters={
                    "type": "object",
                    "properties": {
                        "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                        "office_id": {"type": "integer", "description": "The ID of the office"},
                        "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD (e.g., '2024-01-15')"}
                    },
                    "required": ["doctor_id", "office_id", "date_str"]
                }
            ),
            FunctionDeclaration(
                name="find_patient_by_phone",
                description="Find a patient by their phone number. Use this to check if the user is already registered as a patient.",
                parameters={
                    "type": "object",
                    "properties": {
                        "phone": {"type": "string", "description": "Phone number to search for"}
                    },
                    "required": ["phone"]
                }
            ),
            FunctionDeclaration(
                name="create_patient_from_chat",
                description="Create a new patient record. Use this when user is not registered and provides their information.",
                parameters={
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Patient's full name"},
                        "phone": {"type": "string", "description": "Patient's primary phone number"},
                        "birth_date": {"type": "string", "description": "Birth date in format YYYY-MM-DD (optional)"},
                        "contact_phone": {"type": "string", "description": "Contact phone if different from primary phone (optional)"}
                    },
                    "required": ["name", "phone"]
                }
            ),
            FunctionDeclaration(
                name="check_patient_has_previous_appointments",
                description="Check if patient has previous COMPLETED appointments with a specific doctor. Use this to determine if appointment is 'Primera vez' or 'Seguimiento'. Only counts appointments with status='completed', not cancelled or pending.",
                parameters={
                    "type": "object",
                    "properties": {
                        "patient_id": {"type": "integer", "description": "The ID of the patient"},
                        "doctor_id": {"type": "integer", "description": "The ID of the doctor"}
                    },
                    "required": ["patient_id", "doctor_id"]
                }
            ),
            FunctionDeclaration(
                name="validate_appointment_slot",
                description="Validate that an appointment slot is still available before creating. Use this as a double-check before creating the appointment.",
                parameters={
                    "type": "object",
                    "properties": {
                        "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                        "office_id": {"type": "integer", "description": "The ID of the office"},
                        "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD"},
                        "time_str": {"type": "string", "description": "Time in format HH:MM (24-hour format, e.g., '14:30')"}
                    },
                    "required": ["doctor_id", "office_id", "date_str", "time_str"]
                }
            ),
            FunctionDeclaration(
                name="get_appointment_types",
                description="Get list of appointment types (Presencial, En línea). Use this to show options to user.",
                parameters={"type": "object", "properties": {}, "required": []}
            ),
            FunctionDeclaration(
                name="create_appointment_from_chat",
                description="Create a new appointment. Use this ONLY after all information is collected and user has confirmed. Always validate the slot first using validate_appointment_slot.",
                parameters={
                    "type": "object",
                    "properties": {
                        "patient_id": {"type": "integer", "description": "The ID of the patient"},
                        "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                        "office_id": {"type": "integer", "description": "The ID of the office"},
                        "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD"},
                        "time_str": {"type": "string", "description": "Time in format HH:MM (24-hour format, e.g., '14:30')"},
                        "consultation_type": {"type": "string", "description": "Type of consultation: 'Primera vez' or 'Seguimiento'"},
                        "appointment_type_id": {"type": "integer", "description": "Appointment type ID (1 for Presencial, 2 for En línea, etc.)"}
                    },
                    "required": ["patient_id", "doctor_id", "office_id", "date_str", "time_str", "consultation_type", "appointment_type_id"]
                }
            )
        ]
    
    return tools


def get_all_tools() -> List[Any]:
    """
    Get all tool declarations for backward compatibility with GenerativeModel.
    Returns FunctionDeclaration objects for use with Vertex AI GenerativeModel.
    """
    from vertexai.generative_models import FunctionDeclaration
    
    return [
        FunctionDeclaration(
            name="get_active_doctors",
            description="Get list of all active doctors with their specialties and office addresses. Use this when user wants to see available doctors or select a doctor.",
            parameters={"type": "object", "properties": {}, "required": []}
        ),
        FunctionDeclaration(
            name="get_doctor_offices",
            description="Get list of active offices for a specific doctor. Each office includes name and physical address.",
            parameters={
                "type": "object",
                "properties": {
                    "doctor_id": {"type": "integer", "description": "The ID of the doctor"}
                },
                "required": ["doctor_id"]
            }
        ),
        FunctionDeclaration(
            name="get_available_slots",
            description="Get available appointment time slots for a doctor on a specific date. Use this when user wants to see available times or select a time.",
            parameters={
                "type": "object",
                "properties": {
                    "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                    "office_id": {"type": "integer", "description": "The ID of the office"},
                    "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD (e.g., '2024-01-15')"}
                },
                "required": ["doctor_id", "office_id", "date_str"]
            }
        ),
        FunctionDeclaration(
            name="find_patient_by_phone",
            description="Find patient(s) by their phone number. Returns a list of matching patients (since multiple people can share a phone). Use this to check if user is registered.",
            parameters={
                "type": "object",
                "properties": {
                    "phone": {"type": "string", "description": "Phone number to search for"}
                },
                "required": ["phone"]
            }
        ),
        FunctionDeclaration(
            name="create_patient_from_chat",
            description="Create a new patient record. Use this when user is not registered. Ask for name and verify if they want to use their WhatsApp number or a new contact phone.",
            parameters={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Patient's full name"},
                    "phone": {"type": "string", "description": "Patient's primary phone number (contact phone specified by user)"},
                    "birth_date": {"type": "string", "description": "Birth date in format YYYY-MM-DD (optional)"},
                    "contact_phone": {"type": "string", "description": "Contact phone if different from primary phone (optional)"}
                },
                "required": ["name", "phone"]
            }
        ),
        FunctionDeclaration(
            name="check_patient_has_previous_appointments",
            description="Check if patient has previous COMPLETED appointments with a specific doctor. Use this to determine if appointment is 'Primera vez' or 'Seguimiento'. Only counts appointments with status='completed', not cancelled or pending.",
            parameters={
                "type": "object",
                "properties": {
                    "patient_id": {"type": "integer", "description": "The ID of the patient"},
                    "doctor_id": {"type": "integer", "description": "The ID of the doctor"}
                },
                "required": ["patient_id", "doctor_id"]
            }
        ),
        FunctionDeclaration(
            name="validate_appointment_slot",
            description="Validate that an appointment slot is still available before creating. Use this as a double-check before creating the appointment.",
            parameters={
                "type": "object",
                "properties": {
                    "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                    "office_id": {"type": "integer", "description": "The ID of the office"},
                    "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD"},
                    "time_str": {"type": "string", "description": "Time in format HH:MM (24-hour format, e.g., '14:30')"}
                },
                "required": ["doctor_id", "office_id", "date_str", "time_str"]
            }
        ),
        FunctionDeclaration(
            name="get_appointment_types",
            description="Get list of appointment types (Presencial, En línea). Use this to show options to user.",
            parameters={"type": "object", "properties": {}, "required": []}
        ),
        FunctionDeclaration(
            name="create_appointment_from_chat",
            description="Create a new appointment. Use this ONLY after all information is collected and user has confirmed. Always validate the slot first using validate_appointment_slot.",
            parameters={
                "type": "object",
                "properties": {
                    "patient_id": {"type": "integer", "description": "The ID of the patient"},
                    "doctor_id": {"type": "integer", "description": "The ID of the doctor"},
                    "office_id": {"type": "integer", "description": "The ID of the office"},
                    "date_str": {"type": "string", "description": "Date in format YYYY-MM-DD"},
                    "time_str": {"type": "string", "description": "Time in format HH:MM (24-hour format, e.g., '14:30')"},
                    "consultation_type": {"type": "string", "description": "Type of consultation: 'Primera vez' or 'Seguimiento'"},
                    "appointment_type_id": {"type": "integer", "description": "Appointment type ID (1 for Presencial, 2 for En línea, etc.)"}
                },
                "required": ["patient_id", "doctor_id", "office_id", "date_str", "time_str", "consultation_type", "appointment_type_id"]
            }
        )
    ]


def execute_tool(db: Session, function_name: str, args: Dict[str, Any]) -> Any:
    """
    Execute a tool function call.
    Maps function names to actual helper functions from gemini_helpers.
    This is used for backward compatibility with GenerativeModel.
    """
    try:
        # #region agent log
        import json
        from datetime import datetime
        log_data = {
            "location": "tools.py:471",
            "message": "execute_tool called",
            "data": {"function_name": function_name, "args": args},
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "production-debug",
            "hypothesisId": "C"
        }
        log_file = "/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log"
        try:
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_data) + '\n')
        except:
            pass
        # #endregion
        
        if function_name == "get_active_doctors":
            # #region agent log
            log_data = {
                "location": "tools.py:482",
                "message": "execute_tool - calling get_active_doctors",
                "data": {},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "production-debug",
                "hypothesisId": "C"
            }
            try:
                with open(log_file, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except:
                pass
            # #endregion
            result = gemini_helpers.get_active_doctors(db)
            # #region agent log
            log_data = {
                "location": "tools.py:496",
                "message": "execute_tool - get_active_doctors returned",
                "data": {"result_count": len(result) if result else 0, "result": result},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "production-debug",
                "hypothesisId": "C,E"
            }
            try:
                with open(log_file, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except:
                pass
            # #endregion
            return result
        
        elif function_name == "get_doctor_offices":
            return gemini_helpers.get_doctor_offices(db, args.get("doctor_id"))
        
        elif function_name == "get_available_slots":
            return gemini_helpers.get_available_slots(
                db,
                args.get("doctor_id"),
                args.get("office_id"),
                args.get("date_str")
            )
        
        elif function_name == "find_patient_by_phone":
            return gemini_helpers.find_patient_by_phone(db, args.get("phone"))
        
        elif function_name == "create_patient_from_chat":
            return gemini_helpers.create_patient_from_chat(
                db,
                args.get("name"),
                args.get("phone"),
                args.get("birth_date"),
                args.get("contact_phone")
            )
        
        elif function_name == "check_patient_has_previous_appointments":
            return gemini_helpers.check_patient_has_previous_appointments(
                db,
                args.get("patient_id"),
                args.get("doctor_id")
            )
        
        elif function_name == "validate_appointment_slot":
            return gemini_helpers.validate_appointment_slot(
                db,
                args.get("doctor_id"),
                args.get("office_id"),
                args.get("date_str"),
                args.get("time_str")
            )
        
        elif function_name == "get_appointment_types":
            return gemini_helpers.get_appointment_types(db)
        
        elif function_name == "create_appointment_from_chat":
            return gemini_helpers.create_appointment_from_chat(
                db,
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
