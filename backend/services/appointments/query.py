from sqlalchemy.orm import Session, joinedload
from sqlalchemy import asc, func
from datetime import date, datetime, time, timedelta
from typing import List, Optional, Dict
from database import Appointment, Person

def get_appointments(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    patient_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    available_for_consultation: bool = False
) -> List[Appointment]:
    """Get appointments with filters"""
    query = db.query(Appointment).options(
        joinedload(Appointment.patient),
        joinedload(Appointment.doctor)
    )
    
    # Date range filter
    if start_date:
        query = query.filter(func.date(Appointment.appointment_date) >= start_date)
    if end_date:
        query = query.filter(func.date(Appointment.appointment_date) <= end_date)
    
    # Status filter for available appointments (for consultation dropdown)
    if available_for_consultation:
        query = query.filter(Appointment.status.in_(['confirmada']))
    elif status == 'active':
        # Exclude cancelled appointments
        query = query.filter(Appointment.status != 'cancelled')
    elif status:
        normalized_status = status
        if status == 'confirmed':
            normalized_status = 'confirmada'
        elif status in ('scheduled', 'pending'):
            normalized_status = 'por_confirmar'
        query = query.filter(Appointment.status == normalized_status)
    
    # Patient filter
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
    
    # Doctor filter
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    
    # Order by appointment date
    return query.order_by(asc(Appointment.appointment_date)).offset(skip).limit(limit).all()

def get_appointment_by_id(db: Session, appointment_id: str) -> Optional[Appointment]:
    """Get a specific appointment by ID"""
    return db.query(Appointment).filter(Appointment.id == appointment_id).first()

def get_appointments_by_date(db: Session, target_date: date) -> List[Appointment]:
    """Get all appointments for a specific date"""
    return db.query(Appointment).filter(
        func.date(Appointment.appointment_date) == target_date
    ).order_by(asc(Appointment.appointment_date)).all()

def get_available_time_slots(
    db: Session, 
    target_date: date, 
    doctor_id: Optional[str] = None,
    slot_duration: int = 30
) -> List[Dict]:
    """Get available time slots for a specific date"""
    # Default working hours: 8:00 AM to 6:00 PM
    start_hour = 8
    end_hour = 18
    
    # Generate all possible time slots
    slots = []
    current_time = datetime.combine(target_date, time(start_hour, 0))
    end_time = datetime.combine(target_date, time(end_hour, 0))
    
    while current_time < end_time:
        slots.append({
            "time": current_time.strftime("%H:%M"),
            "datetime": current_time,
            "available": True,
            "appointment_id": None,
            "patient_name": None
        })
        current_time += timedelta(minutes=slot_duration)
    
    # Get existing appointments for the date
    existing_appointments = get_appointments_by_date(db, target_date)
    
    # Mark occupied slots
    for appointment in existing_appointments:
        if appointment.status in ['cancelled']:
            continue
            
        apt_start = appointment.appointment_date.time()
        apt_end = appointment.end_time.time() if appointment.end_time else None
        
        for slot in slots:
            slot_time = datetime.strptime(slot["time"], "%H:%M").time()
            
            # Check if slot overlaps with appointment
            if apt_end:
                if apt_start <= slot_time < apt_end:
                    slot["available"] = False
                    slot["appointment_id"] = appointment.id
                    slot["patient_name"] = appointment.patient.full_name if appointment.patient else "Unknown"
            else:
                # If no end time, assume default duration
                apt_end_calculated = (datetime.combine(target_date, apt_start) + 
                                    timedelta(minutes=appointment.duration_minutes)).time()
                if apt_start <= slot_time < apt_end_calculated:
                    slot["available"] = False
                    slot["appointment_id"] = appointment.id
                    slot["patient_name"] = appointment.patient.full_name if appointment.patient else "Unknown"
    
    return slots

def get_doctor_schedule(
    db: Session, 
    doctor_id: str, 
    start_date: date, 
    end_date: date
) -> Dict[str, List[Dict]]:
    """Get doctor's schedule for a date range"""
    schedule = {}
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.isoformat()
        schedule[date_str] = get_available_time_slots(
            db, current_date, doctor_id
        )
        current_date += timedelta(days=1)
    
    return schedule

def get_appointment_stats(db: Session, doctor_id: Optional[str] = None) -> Dict:
    """Get appointment statistics"""
    from sqlalchemy import and_
    
    query = db.query(Appointment)
    
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    
    total = query.count()
    confirmed = query.filter(Appointment.status == "confirmada").count()
    completed = query.filter(Appointment.status == "completed").count()
    cancelled = query.filter(Appointment.status == "cancelled").count()
    pending = query.filter(Appointment.status == "por_confirmar").count()
    
    # Today's appointments
    today = date.today()
    today_appointments = query.filter(
        func.date(Appointment.appointment_date) == today
    ).count()
    
    # This week's appointments
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    week_appointments = query.filter(
        and_(
            func.date(Appointment.appointment_date) >= week_start,
            func.date(Appointment.appointment_date) <= week_end
        )
    ).count()
    
    return {
        "total": total,
        "confirmed": confirmed,
        "completed": completed,
        "cancelled": cancelled,
        "pending": pending,
        "today": today_appointments,
        "this_week": week_appointments
    }
