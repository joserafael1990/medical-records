from sqlalchemy.orm import Session
from backend.models import Person, Appointment, MedicalRecord

# ============================================================================
# STATISTICS AND REPORTS
# ============================================================================

def get_dashboard_stats(db: Session) -> dict:
    """Get dashboard statistics"""
    total_patients = db.query(Person).filter(Person.person_type == 'patient').count()
    total_doctors = db.query(Person).filter(Person.person_type == 'doctor').count()
    total_appointments = db.query(Appointment).count()
    total_records = db.query(MedicalRecord).count()
    
    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_appointments": total_appointments,
        "total_medical_records": total_records
    }
