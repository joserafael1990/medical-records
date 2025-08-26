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
    ClinicalStudy, Appointment, User, get_db
)

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
    def get_patients(db: Session, search: str = "", skip: int = 0, limit: int = 100) -> List[Patient]:
        """Get patients with optional search"""
        query = db.query(Patient).filter(Patient.is_active == True)
        
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
    def get_consultations(db: Session, patient_search: str = "", skip: int = 0, limit: int = 100) -> List[Dict]:
        """Get consultations with patient names"""
        query = db.query(MedicalHistory, Patient).join(
            Patient, MedicalHistory.patient_id == Patient.id
        )
        
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

# Utility functions
def _get_monthly_consultations(db: Session) -> int:
    """Get consultations count for the current month"""
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)
    
    return db.query(MedicalHistory).filter(
        MedicalHistory.date >= start_of_month
    ).count()

def get_dashboard_data(db: Session) -> Dict[str, Any]:
    """Get dashboard statistics"""
    total_patients = db.query(Patient).filter(Patient.is_active == True).count()
    total_consultations = db.query(MedicalHistory).count()
    
    # Recent consultations
    recent_consultations = db.query(MedicalHistory, Patient).join(
        Patient, MedicalHistory.patient_id == Patient.id
    ).order_by(desc(MedicalHistory.date)).limit(5).all()
    
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
    def create_user(db: Session, username: str, email: str, password: str, doctor_id: str) -> User:
        """Create a new user account for a doctor"""
        from auth import get_password_hash
        
        # Check if user already exists
        existing_user = db.query(User).filter(
            or_(User.username == username, User.email == email, User.doctor_id == doctor_id)
        ).first()
        
        if existing_user:
            raise ValueError("Username, email, or doctor already has an account")
        
        # Verify doctor exists
        doctor = db.query(DoctorProfile).filter(DoctorProfile.id == doctor_id).first()
        if not doctor:
            raise ValueError("Doctor profile not found")
        
        # Create user
        user_data = {
            'username': username,
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
    def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate user with username and password"""
        from auth import verify_password
        
        user = db.query(User).filter(User.username == username, User.is_active == True).first()
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
        """Get user by doctor ID"""
        return db.query(User).filter(User.doctor_id == doctor_id, User.is_active == True).first()
