"""
Database service layer for Historias Clínicas
Handles CRUD operations and business logic
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from typing import List, Optional, Dict, Any
from datetime import datetime, date
import uuid

from database import (
    Patient, DoctorProfile, MedicalHistory, VitalSigns, 
    ClinicalStudy, Appointment, MedicalOrder, User, get_db
)
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class PatientService:
    """Service for patient operations"""
    
    @staticmethod
    def create_patient(db: Session, patient_data: dict) -> Patient:
        """Create a new patient"""
        # Generate ID if not provided
        if 'id' not in patient_data or not patient_data['id']:
            patient_data['id'] = f"PAT{str(uuid.uuid4())[:8].upper()}"
        
        # Set active status by default
        if 'is_active' not in patient_data:
            patient_data['is_active'] = True
        
        # Convert date strings to date objects
        if isinstance(patient_data.get('birth_date'), str):
            from datetime import date
            birth_date_str = patient_data['birth_date'].split('T')[0]  # Take only date part
            patient_data['birth_date'] = date.fromisoformat(birth_date_str)
        
        patient = Patient(**patient_data)
        db.add(patient)
        db.commit()
        db.refresh(patient)
        return patient
    
    @staticmethod
    def get_patient(db: Session, patient_id: str) -> Optional[Patient]:
        """Get patient by ID"""
        return db.query(Patient).filter(Patient.id == patient_id).first()
    
    @staticmethod
    def get_patients(db: Session, search: str = "", skip: int = 0, limit: int = 100, doctor_id: Optional[str] = None) -> List[Patient]:
        """Get patients with optional search and doctor filtering"""
        query = db.query(Patient).filter(Patient.is_active == True)
        
        # Filter by doctor_id if provided (data isolation)
        if doctor_id:
            # Filter directly by doctor_id stored in created_by field
            query = query.filter(Patient.created_by == doctor_id)
        
        if search:
            search_filter = or_(
                Patient.first_name.ilike(f"%{search}%"),
                Patient.paternal_surname.ilike(f"%{search}%"),
                Patient.maternal_surname.ilike(f"%{search}%"),
                func.concat(Patient.first_name, ' ', Patient.paternal_surname).ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        return query.order_by(desc(Patient.created_at)).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_patient(db: Session, patient_id: str, patient_data: dict) -> Optional[Patient]:
        """Update patient"""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return None
        
        for key, value in patient_data.items():
            if hasattr(patient, key) and key not in ['id', 'created_at']:
                if key == 'birth_date' and isinstance(value, str):
                    from datetime import date
                    birth_date_str = value.split('T')[0]  # Take only date part
                    value = date.fromisoformat(birth_date_str)
                setattr(patient, key, value)
        
        patient.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(patient)
        return patient
    
    @staticmethod
    def delete_patient(db: Session, patient_id: str) -> bool:
        """Soft delete patient"""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            return False
        
        patient.is_active = False
        patient.updated_at = datetime.utcnow()
        db.commit()
        return True

class DoctorService:
    """Service for doctor profile operations"""
    
    @staticmethod
    def create_profile(db: Session, profile_data: dict) -> DoctorProfile:
        """Create doctor profile"""
        if 'id' not in profile_data or not profile_data['id']:
            profile_data['id'] = f"DR{str(uuid.uuid4())[:8].upper()}"
        
        # Convert date strings
        if isinstance(profile_data.get('birth_date'), str):
            from datetime import date
            birth_date_str = profile_data['birth_date'].split('T')[0]  # Take only date part
            profile_data['birth_date'] = date.fromisoformat(birth_date_str)
        
        # Generate full name
        title = profile_data.get('title', 'Dr.')
        first_name = profile_data.get('first_name', '')
        paternal = profile_data.get('paternal_surname', '')
        maternal = profile_data.get('maternal_surname', '')
        profile_data['full_name'] = f"{title} {first_name} {paternal} {maternal}".strip()
        
        profile = DoctorProfile(**profile_data)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return profile
    
    @staticmethod
    def get_profile(db: Session) -> Optional[DoctorProfile]:
        """Get main doctor profile"""
        return db.query(DoctorProfile).filter(DoctorProfile.is_active == True).first()
    
    @staticmethod
    def get_profile_by_id(db: Session, profile_id: str) -> Optional[DoctorProfile]:
        """Get doctor profile by ID"""
        return db.query(DoctorProfile).filter(DoctorProfile.id == profile_id).first()
    
    @staticmethod
    def update_profile(db: Session, profile_id: str, profile_data: dict) -> Optional[DoctorProfile]:
        """Update doctor profile"""
        profile = db.query(DoctorProfile).filter(DoctorProfile.id == profile_id).first()
        if not profile:
            return None
        
        for key, value in profile_data.items():
            if hasattr(profile, key) and key not in ['id', 'created_at']:
                if key == 'birth_date' and isinstance(value, str):
                    from datetime import date
                    birth_date_str = value.split('T')[0]  # Take only date part
                    value = date.fromisoformat(birth_date_str)
                setattr(profile, key, value)
        
        # Update full name
        title = profile.title
        first_name = profile.first_name
        paternal = profile.paternal_surname
        maternal = profile.maternal_surname or ''
        profile.full_name = f"{title} {first_name} {paternal} {maternal}".strip()
        
        profile.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(profile)
        return profile

class ConsultationService:
    """Service for medical consultations"""
    
    @staticmethod
    def create_consultation(db: Session, consultation_data: dict) -> MedicalHistory:
        """Create new consultation"""
        if 'id' not in consultation_data or not consultation_data['id']:
            consultation_data['id'] = f"MH{str(uuid.uuid4())[:8].upper()}"
        
        # Convert date strings
        if isinstance(consultation_data.get('date'), str):
            consultation_data['date'] = datetime.fromisoformat(consultation_data['date'].replace('Z', '+00:00'))
        
        consultation = MedicalHistory(**consultation_data)
        db.add(consultation)
        
        # Update patient visit count
        patient = db.query(Patient).filter(Patient.id == consultation.patient_id).first()
        if patient:
            patient.total_visits += 1
        
        db.commit()
        db.refresh(consultation)
        return consultation
    
    @staticmethod
    def get_consultations(db: Session, patient_search: str = "", skip: int = 0, limit: int = 100, doctor_id: Optional[str] = None) -> List[Dict]:
        """Get consultations with patient names, filtered by doctor"""
        query = db.query(MedicalHistory, Patient).join(
            Patient, MedicalHistory.patient_id == Patient.id
        )
        
        # Filter by doctor if provided
        if doctor_id:
            query = query.filter(MedicalHistory.doctor_id == doctor_id)
        
        if patient_search:
            search_filter = or_(
                Patient.first_name.ilike(f"%{patient_search}%"),
                Patient.paternal_surname.ilike(f"%{patient_search}%"),
                Patient.maternal_surname.ilike(f"%{patient_search}%")
            )
            query = query.filter(search_filter)
        
        results = query.order_by(desc(MedicalHistory.date)).offset(skip).limit(limit).all()
        
        consultations = []
        for consultation, patient in results:
            consultation_dict = consultation.__dict__.copy()
            consultation_dict['patient_name'] = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip()
            consultations.append(consultation_dict)
        
        return consultations
    
    @staticmethod
    def get_consultations_by_date(db: Session, target_date) -> List[Dict]:
        """Get consultations for a specific date"""
        from datetime import datetime, date
        
        # Convert target_date to datetime range for the day
        if isinstance(target_date, date):
            start_datetime = datetime.combine(target_date, datetime.min.time())
            end_datetime = datetime.combine(target_date, datetime.max.time())
        else:
            start_datetime = target_date
            end_datetime = target_date
        
        # Query consultations within the date range
        results = db.query(MedicalHistory, Patient).join(
            Patient, MedicalHistory.patient_id == Patient.id
        ).filter(
            MedicalHistory.date >= start_datetime,
            MedicalHistory.date <= end_datetime
        ).order_by(MedicalHistory.date).all()
        
        consultations = []
        for consultation, patient in results:
            consultation_dict = consultation.__dict__.copy()
            consultation_dict['patient_name'] = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip()
            consultations.append(consultation_dict)
        
        return consultations
    
    @staticmethod
    def get_consultation(db: Session, consultation_id: str) -> Optional[MedicalHistory]:
        """Get consultation by ID"""
        return db.query(MedicalHistory).filter(MedicalHistory.id == consultation_id).first()
    
    @staticmethod
    def update_consultation(db: Session, consultation_id: str, consultation_data: dict) -> Optional[MedicalHistory]:
        """Update consultation"""
        consultation = db.query(MedicalHistory).filter(MedicalHistory.id == consultation_id).first()
        if not consultation:
            return None
        
        for key, value in consultation_data.items():
            if hasattr(consultation, key) and key not in ['id', 'created_at', 'patient_id']:
                if key == 'date' and isinstance(value, str):
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
                setattr(consultation, key, value)
        
        consultation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(consultation)
        return consultation
    
    @staticmethod
    def delete_consultation(db: Session, consultation_id: str) -> bool:
        """Delete consultation"""
        consultation = db.query(MedicalHistory).filter(MedicalHistory.id == consultation_id).first()
        if not consultation:
            return False
        
        db.delete(consultation)
        db.commit()
        return True

class ClinicalStudyService:
    """Service for clinical studies"""
    
    @staticmethod
    def create_study(db: Session, study_data: dict) -> ClinicalStudy:
        """Create clinical study"""
        if 'id' not in study_data or not study_data['id']:
            study_data['id'] = f"CS{str(uuid.uuid4())[:8].upper()}"
        
        # Convert date strings
        for date_field in ['ordered_date', 'performed_date', 'results_date']:
            if study_data.get(date_field) and isinstance(study_data[date_field], str):
                study_data[date_field] = datetime.fromisoformat(study_data[date_field].replace('Z', '+00:00'))
        
        study = ClinicalStudy(**study_data)
        db.add(study)
        db.commit()
        db.refresh(study)
        return study
    
    @staticmethod
    def get_studies_by_consultation(db: Session, consultation_id: str) -> List[ClinicalStudy]:
        """Get studies for a consultation"""
        return db.query(ClinicalStudy).filter(
            ClinicalStudy.consultation_id == consultation_id
        ).order_by(desc(ClinicalStudy.ordered_date)).all()
    
    @staticmethod
    def get_studies_by_patient(db: Session, patient_id: str) -> List[ClinicalStudy]:
        """Get all studies for a patient"""
        return db.query(ClinicalStudy).filter(
            ClinicalStudy.patient_id == patient_id
        ).order_by(desc(ClinicalStudy.ordered_date)).all()

class MedicalOrderService:
    """Service for medical orders"""
    
    @staticmethod
    def create_order(db: Session, order_data: dict) -> MedicalOrder:
        """Create medical order"""
        if 'id' not in order_data or not order_data['id']:
            order_data['id'] = f"MO{str(uuid.uuid4())[:8].upper()}"
        
        # Convert date strings
        for date_field in ['order_date', 'valid_until_date']:
            if order_data.get(date_field) and isinstance(order_data[date_field], str):
                order_data[date_field] = datetime.fromisoformat(order_data[date_field].replace('Z', '+00:00'))
        
        # Set order_date if not provided
        if 'order_date' not in order_data or not order_data['order_date']:
            order_data['order_date'] = datetime.utcnow()
        
        order = MedicalOrder(**order_data)
        db.add(order)
        db.commit()
        db.refresh(order)
        return order
    
    @staticmethod
    def get_orders_by_consultation(db: Session, consultation_id: str) -> List[MedicalOrder]:
        """Get orders for a consultation"""
        return db.query(MedicalOrder).filter(
            MedicalOrder.consultation_id == consultation_id
        ).order_by(desc(MedicalOrder.order_date)).all()
    
    @staticmethod
    def get_orders_by_patient(db: Session, patient_id: str) -> List[MedicalOrder]:
        """Get all orders for a patient"""
        return db.query(MedicalOrder).filter(
            MedicalOrder.patient_id == patient_id
        ).order_by(desc(MedicalOrder.order_date)).all()
    
    @staticmethod
    def update_order_status(db: Session, order_id: str, status: str) -> Optional[MedicalOrder]:
        """Update order status"""
        order = db.query(MedicalOrder).filter(MedicalOrder.id == order_id).first()
        if order:
            order.status = status
            order.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(order)
        return order

# Utility functions
def _get_monthly_consultations(db: Session) -> int:
    """Get consultations count for the current month"""
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    
    return db.query(MedicalHistory).filter(
        MedicalHistory.date >= start_of_month
    ).count()

def get_dashboard_data(db: Session, doctor_id: Optional[str] = None) -> Dict[str, Any]:
    """Get dashboard statistics, filtered by doctor"""
    # Filter patients by doctor
    patient_query = db.query(Patient).filter(Patient.is_active == True)
    if doctor_id:
        # Filter directly by doctor_id stored in created_by field
        patient_query = patient_query.filter(Patient.created_by == doctor_id)
    total_patients = patient_query.count()
    
    # Filter consultations by doctor
    consultation_query = db.query(MedicalHistory)
    if doctor_id:
        consultation_query = consultation_query.filter(MedicalHistory.doctor_id == doctor_id)
    total_consultations = consultation_query.count()
    
    # Recent consultations (filtered by doctor)
    recent_consultations_query = db.query(MedicalHistory, Patient).join(
        Patient, MedicalHistory.patient_id == Patient.id
    )
    if doctor_id:
        recent_consultations_query = recent_consultations_query.filter(MedicalHistory.doctor_id == doctor_id)
    
    recent_consultations = recent_consultations_query.order_by(desc(MedicalHistory.date)).limit(5).all()
    
    consultations_list = []
    for consultation, patient in recent_consultations:
        consultations_list.append({
            'id': consultation.id,
            'patient_name': f"{patient.first_name} {patient.paternal_surname}",
            'date': consultation.date.isoformat(),
            'chief_complaint': consultation.chief_complaint
        })
    
    return {
        'total_patients': total_patients,
        'total_consultations': total_consultations,
        'monthly_consultations': _get_monthly_consultations(db),
        'recent_consultations': consultations_list
    }

class AuthService:
    """Service for authentication operations"""
    
    @staticmethod
    def create_user(db: Session, email: str, password: str, doctor_id: str) -> User:
        """Create a new user account for a doctor"""
        from auth import get_password_hash
        
        # Check if user already exists
        existing_user = db.query(User).filter(
            or_(User.email == email, User.doctor_id == doctor_id)
        ).first()
        
        if existing_user:
            raise ValueError("Email or doctor already has an account")
        
        # Verify doctor exists
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
        if not doctor:
            raise ValueError("Doctor profile not found")
        
        # Create user (using email as username)
        user_data = {
            'username': email,  # Use email as username
            'email': email,
            'hashed_password': get_password_hash(password),
            'doctor_id': doctor_id
        }
        
        user = User(**user_data)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        from auth import verify_password
        
        user = db.query(User).filter(User.email == email, User.is_active == True).first()
        if not user:
            return None
        
        if not verify_password(password, user.hashed_password):
            return None
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.commit()
        
        return user
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username, User.is_active == True).first()
    
    @staticmethod
    def get_user_by_doctor_id(db: Session, doctor_id: str) -> Optional[User]:
        """Get user by doctor ID - now the user.id is the same as doctor.id"""
        return db.query(User).filter(User.id == doctor_id, User.is_active == True).first()


class ConsultationService:
    """Service for consultation operations"""
    
    @staticmethod
    def get_consultations(db: Session, patient_search: str = "", doctor_id: Optional[str] = None) -> List[dict]:
        """Get consultations with optional patient search and doctor filtering"""
        from sqlalchemy import or_
        
        query = db.query(MedicalHistory)
        
        # Filter by doctor if provided
        if doctor_id:
            query = query.filter(MedicalHistory.created_by == doctor_id)
        
        # Add patient search if provided
        if patient_search:
            # Join with patients table to search by patient name
            query = query.join(Patient, MedicalHistory.patient_id == Patient.id)
            query = query.filter(
                or_(
                    Patient.first_name.ilike(f"%{patient_search}%"),
                    Patient.paternal_surname.ilike(f"%{patient_search}%"),
                    Patient.maternal_surname.ilike(f"%{patient_search}%")
                )
            )
        
        consultations = query.order_by(MedicalHistory.created_at.desc()).all()
        
        # Convert to dict and add patient names
        result = []
        for consultation in consultations:
            try:
                # Safe date conversion helper
                def safe_date_format(date_obj):
                    if date_obj is None:
                        return None
                    if hasattr(date_obj, 'isoformat'):
                        return date_obj.isoformat()
                    return str(date_obj)
                
                consultation_dict = {
                    "id": consultation.id,
                    "patient_id": consultation.patient_id,
                    "date": safe_date_format(consultation.date),
                    "chief_complaint": consultation.chief_complaint,
                    "history_present_illness": consultation.history_present_illness,
                    "family_history": consultation.family_history,
                    "personal_pathological_history": consultation.personal_pathological_history,
                    "personal_non_pathological_history": consultation.personal_non_pathological_history,
                    "physical_examination": consultation.physical_examination,
                    "primary_diagnosis": consultation.primary_diagnosis,
                    "secondary_diagnoses": consultation.secondary_diagnoses,
                    "differential_diagnosis": consultation.differential_diagnosis,
                    "treatment_plan": consultation.treatment_plan,
                    "prescribed_medications": consultation.prescribed_medications,
                    "follow_up_instructions": consultation.follow_up_instructions,
                    "doctor_name": consultation.doctor_name,
                    "doctor_professional_license": consultation.doctor_professional_license,
                    "doctor_specialty": consultation.doctor_specialty,
                    "created_by": consultation.created_by,
                    "created_at": safe_date_format(consultation.created_at),
                    "updated_at": safe_date_format(consultation.updated_at)
                }
                
                # Get patient name
                patient = db.query(Patient).filter(Patient.id == consultation.patient_id).first()
                if patient:
                    patient_name = f"{patient.first_name} {patient.paternal_surname}"
                    if patient.maternal_surname:
                        patient_name += f" {patient.maternal_surname}"
                    consultation_dict["patient_name"] = patient_name.strip()
                else:
                    consultation_dict["patient_name"] = "Paciente no encontrado"
                
                result.append(consultation_dict)
            except Exception as e:
                print(f"Error processing consultation {consultation.id}: {e}")
                continue
        
        return result
    
    @staticmethod
    def create_consultation(db: Session, consultation_data: dict) -> MedicalHistory:
        """Create a new consultation"""
        # Generate ID if not provided
        if 'id' not in consultation_data or not consultation_data['id']:
            consultation_data['id'] = f"MH{str(uuid.uuid4())[:8].upper()}"
        
        # Ensure required fields have defaults
        consultation_data.setdefault('secondary_diagnoses', '')
        consultation_data.setdefault('differential_diagnosis', '')
        consultation_data.setdefault('prescribed_medications', '')
        
        consultation = MedicalHistory(**consultation_data)
        db.add(consultation)
        db.commit()
        db.refresh(consultation)
        return consultation
    
    @staticmethod
    def get_consultation(db: Session, consultation_id: str) -> Optional[MedicalHistory]:
        """Get consultation by ID"""
        return db.query(MedicalHistory).filter(MedicalHistory.id == consultation_id).first()


class AuthService:
    """Service for authentication operations with unified IDs"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password"""
        user = db.query(User).filter(User.email == email, User.is_active == True).first()
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def create_user(db: Session, email: str, password: str, doctor_id: str) -> User:
        """Create a new user with the same ID as the doctor"""
        # Check if user already exists
        if db.query(User).filter(User.email == email).first():
            raise ValueError("Email already registered")
        
        # Check if doctor exists
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
        if not doctor:
            raise ValueError("Doctor profile not found")
        
        # Check if user already exists for this doctor
        if db.query(User).filter(User.id == doctor_id).first():
            raise ValueError("User already exists for this doctor")
        
        hashed_password = AuthService.hash_password(password)
        
        # Create user with doctor's ID as the user ID
        user = User(
            id=doctor_id,  # Same ID as doctor
            username=email.split('@')[0],  # Use email prefix as username
            email=email,
            hashed_password=hashed_password,
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        return user


# Dashboard function
def get_dashboard_data(db: Session, doctor_id: Optional[str] = None) -> Dict[str, Any]:
    """Get dashboard statistics"""
    try:
        # Get basic counts
        total_patients = db.query(Patient).filter(
            Patient.created_by == doctor_id if doctor_id else True,
            Patient.is_active == True
        ).count()
        
        total_consultations = db.query(MedicalHistory).filter(
            MedicalHistory.created_by == doctor_id if doctor_id else True
        ).count()
        
        # Get appointments for today  
        from datetime import datetime, timedelta
        from zoneinfo import ZoneInfo
        today = datetime.now(ZoneInfo("America/Mexico_City")).date()
        today_appointments = db.query(Appointment).filter(
            Appointment.doctor_id == doctor_id if doctor_id else True,
            Appointment.appointment_date >= today,
            Appointment.appointment_date < today + timedelta(days=1)
        ).count()
        
        # Get recent consultations (last 7 days)
        week_ago = datetime.now(ZoneInfo("America/Mexico_City")) - timedelta(days=7)
        recent_consultations = db.query(MedicalHistory).filter(
            MedicalHistory.created_by == doctor_id if doctor_id else True,
            MedicalHistory.created_at >= week_ago
        ).count()
        
        return {
            "total_patients": total_patients,
            "total_consultations": total_consultations,
            "today_appointments": today_appointments,
            "recent_consultations": recent_consultations,
            "doctor_id": doctor_id,
            "timestamp": datetime.now(ZoneInfo("America/Mexico_City")).isoformat()
        }
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        return {
            "total_patients": 0,
            "total_consultations": 0,
            "today_appointments": 0,
            "recent_consultations": 0,
            "doctor_id": doctor_id,
            "error": str(e)
        }
