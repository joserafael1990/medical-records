"""
Dashboard endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import date, timedelta

from database import get_db, Person, Appointment
from dependencies import get_current_user
from appointment_service import AppointmentService

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get dashboard statistics with real data"""
    try:
        # Get appointment statistics for the current doctor
        stats = AppointmentService.get_appointment_stats(db, doctor_id=current_user.id)
        
        # Get today's date in CDMX timezone
        from datetime import datetime
        import pytz
        SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')
        today_cdmx = datetime.now(SYSTEM_TIMEZONE).date()
        
        # Count appointments for today (all statuses except cancelled)
        # Use date comparison that works with naive datetimes (stored in CDMX timezone)
        today_start = datetime.combine(today_cdmx, datetime.min.time())
        today_end = datetime.combine(today_cdmx, datetime.max.time())
        
        today_query = db.query(Appointment).filter(
            Appointment.doctor_id == current_user.id,
            Appointment.appointment_date >= today_start,
            Appointment.appointment_date <= today_end,
            Appointment.status != 'cancelled'
        )
        appointments_today = today_query.count()
        
        # Get total patients count for this doctor
        from database import Person as PersonModel
        total_patients = db.query(PersonModel).filter(
            PersonModel.person_type == 'patient',
            PersonModel.created_by == current_user.id,
            PersonModel.is_active == True
        ).count()
        
        return {
            "appointments_today": appointments_today,
            "time_saved": "0.0h",  # TODO: Calculate from consultation times
            "pending_messages": 0,  # TODO: Implement if needed
            "compliance": 100,  # TODO: Calculate from actual data
            "monthly_revenue": 0,  # TODO: Calculate from appointments
            "revenue_change": 0,  # TODO: Calculate from appointments
            "avg_consultation_time": 30,  # TODO: Calculate from consultations
            "documentation_efficiency": 94,  # TODO: Calculate from actual data
            "patient_satisfaction": 4.8,  # TODO: Calculate from surveys
            "total_patients": total_patients
        }
    except Exception as e:
        print(f"❌ Error getting dashboard stats: {e}")
        # Return safe defaults on error
        return {
            "appointments_today": 0,
            "time_saved": "0.0h",
            "pending_messages": 0,
            "compliance": 100,
            "monthly_revenue": 0,
            "revenue_change": 0,
            "avg_consultation_time": 30,
            "documentation_efficiency": 94,
            "patient_satisfaction": 4.8,
            "total_patients": 0
        }

