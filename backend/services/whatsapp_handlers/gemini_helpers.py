"""
Helper functions for Gemini bot to interact with the database.
These functions are exposed to Gemini via function calling.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Any
from database import Person, Office, Appointment, AppointmentType
from services.appointments.query import get_available_time_slots
from services.appointments.creation import create_appointment
from services.appointments.validation import get_doctor_duration
from crud.person import generate_person_code
from logger import get_logger

api_logger = get_logger("medical_records.gemini_bot")


def get_active_doctors(db: Session) -> List[Dict[str, Any]]:
    """
    Get list of active doctors.
    Returns list of dicts with id and name.
    """
    try:
        # #region agent log
        import json
        import os
        log_data = {
            "location": "gemini_helpers.py:24",
            "message": "get_active_doctors called - starting query",
            "data": {"timestamp": str(datetime.now())},
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "production-debug",
            "hypothesisId": "A,B,D"
        }
        log_file = "/Users/rafaelgarcia/Documents/Software projects/medical-records-main/.cursor/debug.log"
        try:
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_data) + '\n')
        except:
            pass
        # #endregion
        
        doctors = db.query(Person).filter(
            Person.person_type == 'doctor',
            Person.is_active == True
        ).all()
        
        # #region agent log
        log_data = {
            "location": "gemini_helpers.py:35",
            "message": "get_active_doctors - doctors queried from DB",
            "data": {"doctor_count": len(doctors), "doctor_ids": [d.id for d in doctors]},
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "production-debug",
            "hypothesisId": "A,D"
        }
        try:
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_data) + '\n')
        except:
            pass
        # #endregion
        
        result = []
        for doctor in doctors:
            # #region agent log
            doctor_raw_data = {
                "id": doctor.id,
                "name": doctor.name,
                "title": doctor.title,
                "full_name_property": doctor.full_name,
                "has_specialty": doctor.specialty is not None,
                "specialty_id": doctor.specialty_id,
                "specialty_name": doctor.specialty.name if doctor.specialty else None
            }
            log_data = {
                "location": "gemini_helpers.py:42",
                "message": f"get_active_doctors - processing doctor {doctor.id}",
                "data": doctor_raw_data,
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "production-debug",
                "hypothesisId": "A,B,D"
            }
            try:
                with open(log_file, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except:
                pass
            # #endregion
            
            doctor_name = doctor.full_name or doctor.name
            specialty_name = None
            try:
                if doctor.specialty:
                    specialty_name = doctor.specialty.name
            except Exception as spec_error:
                # #region agent log
                log_data = {
                    "location": "gemini_helpers.py:60",
                    "message": f"get_active_doctors - ERROR accessing specialty for doctor {doctor.id}",
                    "data": {"doctor_id": doctor.id, "error": str(spec_error), "specialty_id": doctor.specialty_id},
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "production-debug",
                    "hypothesisId": "B"
                }
                try:
                    with open(log_file, 'a') as f:
                        f.write(json.dumps(log_data) + '\n')
                except:
                    pass
                # #endregion
                api_logger.warning(f"Error accessing specialty for doctor {doctor.id}: {spec_error}")
            
            doctor_dict = {
                "id": doctor.id,
                "name": doctor_name,
                "specialty": specialty_name
            }
            result.append(doctor_dict)
            
            # #region agent log
            log_data = {
                "location": "gemini_helpers.py:78",
                "message": f"get_active_doctors - doctor {doctor.id} added to result",
                "data": {"doctor_dict": doctor_dict},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "production-debug",
                "hypothesisId": "A,D"
            }
            try:
                with open(log_file, 'a') as f:
                    f.write(json.dumps(log_data) + '\n')
            except:
                pass
            # #endregion
        
        # #region agent log
        log_data = {
            "location": "gemini_helpers.py:91",
            "message": "get_active_doctors - final result",
            "data": {"result_count": len(result), "result": result},
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "production-debug",
            "hypothesisId": "A,D,E"
        }
        try:
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_data) + '\n')
        except:
            pass
        # #endregion
        
        api_logger.debug(f"Found {len(result)} active doctors")
        return result
    except Exception as e:
        # #region agent log
        log_data = {
            "location": "gemini_helpers.py:107",
            "message": "get_active_doctors - EXCEPTION caught",
            "data": {"error_type": type(e).__name__, "error_message": str(e)},
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "production-debug",
            "hypothesisId": "A,B,C"
        }
        try:
            with open(log_file, 'a') as f:
                f.write(json.dumps(log_data) + '\n')
        except:
            pass
        # #endregion
        api_logger.error(f"Error getting active doctors: {e}", exc_info=True)
        return []


def get_doctor_offices(db: Session, doctor_id: int) -> List[Dict[str, Any]]:
    """
    Get list of active offices for a doctor.
    Returns list of dicts with id, name, and address.
    """
    try:
        offices = db.query(Office).filter(
            Office.doctor_id == doctor_id,
            Office.is_active == True
        ).all()
        
        result = []
        for office in offices:
            result.append({
                "id": office.id,
                "name": office.name,
                "address": office.address or "",
                "city": office.city or "",
                "is_virtual": office.is_virtual or False
            })
        
        api_logger.debug(f"Found {len(result)} active offices for doctor {doctor_id}")
        return result
    except Exception as e:
        api_logger.error(f"Error getting doctor offices: {e}", exc_info=True)
        return []


def get_available_slots(
    db: Session, 
    doctor_id: int, 
    office_id: int, 
    date_str: str
) -> List[Dict[str, Any]]:
    """
    Get available appointment slots for a doctor on a specific date.
    Args:
        db: Database session
        doctor_id: Doctor ID
        office_id: Office ID (for future use, currently not used in query)
        date_str: Date in format "YYYY-MM-DD"
    Returns:
        List of available time slots with time and display format
    """
    try:
        # Parse date
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        # Validate date is not in the past
        today = date.today()
        if target_date < today:
            api_logger.warning(f"Requested date {date_str} is in the past")
            return []
        
        # Get doctor's appointment duration (defaults to 30 if not set)
        slot_duration = get_doctor_duration(db, doctor_id)
        
        # Get available slots using existing service with doctor's duration
        slots = get_available_time_slots(db, target_date, str(doctor_id), slot_duration)
        
        # Format for Gemini
        result = []
        for slot in slots:
            if slot.get("available", False):
                time_str = slot.get("time", "")
                result.append({
                    "time": time_str,
                    "display": time_str  # Can be formatted as "10:00 AM" if needed
                })
        
        api_logger.debug(f"Found {len(result)} available slots for doctor {doctor_id} on {date_str}")
        return result
    except Exception as e:
        api_logger.error(f"Error getting available slots: {e}", exc_info=True)
        return []


def find_patient_by_phone(db: Session, phone: str) -> Optional[Dict[str, Any]]:
    """
    Find patient by phone number.
    Returns patient info if found, None otherwise.
    """
    try:
        # Normalize phone (remove spaces, dashes, etc.)
        normalized_phone = phone.replace(" ", "").replace("-", "").replace("+", "")
        
        # Try exact match first
        patient = db.query(Person).filter(
            Person.person_type == 'patient',
            Person.primary_phone == phone
        ).first()
        
        # If not found, try normalized
        if not patient:
            patient = db.query(Person).filter(
                Person.person_type == 'patient',
                func.replace(func.replace(func.replace(Person.primary_phone, " ", ""), "-", ""), "+", "") == normalized_phone
            ).first()
        
        if patient:
            return {
                "id": patient.id,
                "name": patient.full_name or patient.name,
                "phone": patient.primary_phone,
                "birth_date": patient.birth_date.isoformat() if patient.birth_date else None
            }
        
        return None
    except Exception as e:
        api_logger.error(f"Error finding patient by phone: {e}", exc_info=True)
        return None


def create_patient_from_chat(
    db: Session, 
    name: str, 
    phone: str, 
    birth_date: Optional[str] = None,
    contact_phone: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new patient from chat data.
    Args:
        db: Database session
        name: Patient full name
        phone: Primary phone number
        birth_date: Birth date in format "YYYY-MM-DD" (optional)
        contact_phone: Contact phone if different from primary phone (optional)
    Returns:
        Dict with patient id and name
    """
    try:
        # Generate person code
        person_code = generate_person_code(db, 'patient')
        
        # Parse birth date if provided
        birth_date_obj = None
        if birth_date:
            try:
                birth_date_obj = datetime.strptime(birth_date, "%Y-%m-%d").date()
            except ValueError:
                api_logger.warning(f"Invalid birth date format: {birth_date}")
        
        # Create patient
        patient = Person(
            person_code=person_code,
            person_type='patient',
            name=name,
            primary_phone=phone,
            birth_date=birth_date_obj,
            is_active=True
        )
        
        db.add(patient)
        db.commit()
        db.refresh(patient)
        
        api_logger.info(f"Created new patient: {patient.id} - {name}")
        
        return {
            "id": patient.id,
            "name": patient.full_name or patient.name
        }
    except Exception as e:
        db.rollback()
        api_logger.error(f"Error creating patient: {e}", exc_info=True)
        raise


def check_patient_has_previous_appointments(
    db: Session, 
    patient_id: int, 
    doctor_id: int
) -> bool:
    """
    Check if patient has previous COMPLETED appointments with this doctor.
    Only counts appointments with status='completed' (not cancelled or pending).
    Returns True if patient has at least one completed appointment, False otherwise.
    """
    try:
        completed_count = db.query(Appointment).filter(
            Appointment.patient_id == patient_id,
            Appointment.doctor_id == doctor_id,
            Appointment.status == 'completed'
        ).count()
        
        has_previous = completed_count > 0
        api_logger.debug(
            f"Patient {patient_id} has {completed_count} completed appointments with doctor {doctor_id}: {has_previous}"
        )
        return has_previous
    except Exception as e:
        api_logger.error(f"Error checking previous appointments: {e}", exc_info=True)
        return False


def validate_appointment_slot(
    db: Session, 
    doctor_id: int, 
    office_id: int, 
    date_str: str, 
    time_str: str
) -> bool:
    """
    Validate that an appointment slot is still available (double-check before creating).
    Returns True if slot is available, False otherwise.
    """
    try:
        # Parse date and time
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        time_obj = datetime.strptime(time_str, "%H:%M").time()
        appointment_datetime = datetime.combine(target_date, time_obj)
        
        # Check if date is in the past
        if target_date < date.today():
            return False
        
        # Get doctor's duration
        doctor = db.query(Person).filter(Person.id == doctor_id).first()
        duration_minutes = doctor.appointment_duration if doctor and doctor.appointment_duration else 30
        
        # Calculate end time
        end_datetime = appointment_datetime + timedelta(minutes=duration_minutes)
        end_time = end_datetime.time()
        
        # Check for conflicting appointments
        conflicting = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id,
            func.date(Appointment.appointment_date) == target_date,
            Appointment.status.in_(['confirmada', 'por_confirmar']),
            and_(
                Appointment.appointment_date < end_datetime,
                Appointment.end_time > appointment_datetime
            )
        ).first()
        
        is_available = conflicting is None
        api_logger.debug(
            f"Slot validation for doctor {doctor_id} on {date_str} at {time_str}: {is_available}"
        )
        return is_available
    except Exception as e:
        api_logger.error(f"Error validating appointment slot: {e}", exc_info=True)
        return False


def create_appointment_from_chat(
    db: Session,
    patient_id: int,
    doctor_id: int,
    office_id: int,
    date_str: str,
    time_str: str,
    consultation_type: str,
    appointment_type_id: int
) -> Dict[str, Any]:
    """
    Create an appointment from chat data.
    Args:
        db: Database session
        patient_id: Patient ID
        doctor_id: Doctor ID
        office_id: Office ID
        date_str: Date in format "YYYY-MM-DD"
        time_str: Time in format "HH:MM"
        consultation_type: "Primera vez" or "Seguimiento"
        appointment_type_id: Appointment type ID (Presencial/En línea)
    Returns:
        Dict with appointment id
    """
    try:
        # Parse date and time
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        time_obj = datetime.strptime(time_str, "%H:%M").time()
        appointment_datetime = datetime.combine(target_date, time_obj)
        
        # Validate slot is still available
        if not validate_appointment_slot(db, doctor_id, office_id, date_str, time_str):
            raise ValueError(f"Slot {date_str} {time_str} is no longer available")
        
        # Prepare appointment data
        appointment_data = {
            'patient_id': patient_id,
            'doctor_id': doctor_id,
            'office_id': office_id,
            'appointment_date': appointment_datetime,
            'consultation_type': consultation_type,
            'appointment_type_id': appointment_type_id,
            'status': 'por_confirmar'
        }
        
        # Create appointment using existing service
        appointment = create_appointment(db, appointment_data)
        
        api_logger.info(
            f"Created appointment {appointment.id} for patient {patient_id} with doctor {doctor_id}"
        )
        
        return {
            "id": appointment.id,
            "appointment_date": appointment.appointment_date.isoformat() if appointment.appointment_date else None
        }
    except Exception as e:
        db.rollback()
        api_logger.error(f"Error creating appointment: {e}", exc_info=True)
        raise


def get_appointment_types(db: Session) -> List[Dict[str, Any]]:
    """
    Get list of active appointment types (Presencial, En línea).
    Returns list of dicts with id and name.
    """
    try:
        types = db.query(AppointmentType).filter(
            AppointmentType.is_active == True
        ).all()
        
        result = []
        for apt_type in types:
            result.append({
                "id": apt_type.id,
                "name": apt_type.name
            })
        
        api_logger.debug(f"Found {len(result)} appointment types")
        return result
    except Exception as e:
        api_logger.error(f"Error getting appointment types: {e}", exc_info=True)
        return []

