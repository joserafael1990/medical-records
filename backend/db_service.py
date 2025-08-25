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
    ClinicalStudy, Appointment, get_db
)

class PatientService:
    """Service for patient operations"""
    
    @staticmethod
    def create_patient(db: Session, patient_data: dict) -> Patient:
        """Create a new patient"""
        # Generate ID if not provided
        if 'id' not in patient_data or not patient_data['id']:
            patient_data['id'] = f"PAT{str(uuid.uuid4())[:8].upper()}"
        
        # Convert date strings to datetime objects
        if isinstance(patient_data.get('birth_date'), str):
            patient_data['birth_date'] = datetime.fromisoformat(patient_data['birth_date'].replace('Z', '+00:00'))
        
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
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
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
            profile_data['birth_date'] = datetime.fromisoformat(profile_data['birth_date'].replace('Z', '+00:00'))
        
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
                    value = datetime.fromisoformat(value.replace('Z', '+00:00'))
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
        'monthly_consultations': total_consultations,  # TODO: Calculate monthly
        'recent_consultations': consultations_list
    }
