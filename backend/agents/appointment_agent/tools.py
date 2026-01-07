"""
MCP Tools for Appointment Agent
These tools wrap the existing gemini_helpers functions for use with ADK
"""
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from vertexai.generative_models import FunctionDeclaration

# Import existing helper functions
from services.whatsapp_handlers import gemini_helpers
from logger import get_logger

api_logger = get_logger("medical_records.adk_agent")


def get_active_doctors_tool() -> FunctionDeclaration:
    """Get list of all active doctors. Use when user wants to see available doctors."""
    return FunctionDeclaration(
        name="get_active_doctors",
        description="Get list of all active doctors. Use this when user wants to see available doctors or select a doctor.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    )


def get_doctor_offices_tool() -> FunctionDeclaration:
    """Get list of active offices for a specific doctor."""
    return FunctionDeclaration(
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


def get_available_slots_tool() -> FunctionDeclaration:
    """Get available appointment time slots for a doctor on a specific date."""
    return FunctionDeclaration(
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


def find_patient_by_phone_tool() -> FunctionDeclaration:
    """Find a patient by their phone number."""
    return FunctionDeclaration(
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


def create_patient_tool() -> FunctionDeclaration:
    """Create a new patient record."""
    return FunctionDeclaration(
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


def check_previous_appointments_tool() -> FunctionDeclaration:
    """Check if patient has previous completed appointments with a specific doctor."""
    return FunctionDeclaration(
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


def validate_slot_tool() -> FunctionDeclaration:
    """Validate that an appointment slot is still available."""
    return FunctionDeclaration(
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


def get_appointment_types_tool() -> FunctionDeclaration:
    """Get list of appointment types."""
    return FunctionDeclaration(
        name="get_appointment_types",
        description="Get list of appointment types (Presencial, En línea). Use this to show options to user.",
        parameters={
            "type": "object",
            "properties": {},
            "required": []
        }
    )


def create_appointment_tool() -> FunctionDeclaration:
    """Create a new appointment."""
    return FunctionDeclaration(
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


def get_all_tools() -> List[FunctionDeclaration]:
    """Get all tool declarations for the appointment agent."""
    return [
        get_active_doctors_tool(),
        get_doctor_offices_tool(),
        get_available_slots_tool(),
        find_patient_by_phone_tool(),
        create_patient_tool(),
        check_previous_appointments_tool(),
        validate_slot_tool(),
        get_appointment_types_tool(),
        create_appointment_tool()
    ]


def execute_tool(db: Session, function_name: str, args: Dict[str, Any]) -> Any:
    """
    Execute a tool function call.
    Maps function names to actual helper functions from gemini_helpers.
    """
    try:
        if function_name == "get_active_doctors":
            return gemini_helpers.get_active_doctors(db)
        
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

