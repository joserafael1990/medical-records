"""
Appointment Service - Gestión de citas médicas
Provides comprehensive appointment management functionality
"""
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from datetime import datetime, date, time, timedelta
from typing import List, Optional, Dict
import uuid

from database import Appointment, Patient, DoctorProfile


class AppointmentService:
    """Service for managing medical appointments"""
    
    @staticmethod
    def create_appointment(db: Session, appointment_data: dict) -> Appointment:
        """Create a new appointment"""
        # Generate ID if not provided
        if 'id' not in appointment_data or not appointment_data['id']:
            appointment_data['id'] = f"APT{str(uuid.uuid4())[:8].upper()}"
        
        # Calculate end_time based on appointment_date and duration
        start_time = appointment_data['appointment_date']
        if isinstance(start_time, str):
            start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        
        duration_minutes = appointment_data.get('duration_minutes', 30)
        end_time = start_time + timedelta(minutes=duration_minutes)
        appointment_data['end_time'] = end_time
        
        # Set created_at
        appointment_data['created_at'] = datetime.utcnow()
        
        # Get patient name for easier querying
        patient = db.query(Patient).filter(Patient.id == appointment_data['patient_id']).first()
        if patient:
            appointment_data['doctor_name'] = f"{patient.first_name} {patient.paternal_surname}"
        
        appointment = Appointment(**appointment_data)
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        return appointment
    
    @staticmethod
    def get_appointments(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        status: Optional[str] = None,
        patient_id: Optional[str] = None,
        doctor_id: Optional[str] = None
    ) -> List[Appointment]:
        """Get appointments with filters"""
        query = db.query(Appointment)
        
        # Date range filter
        if start_date:
            query = query.filter(func.date(Appointment.appointment_date) >= start_date)
        if end_date:
            query = query.filter(func.date(Appointment.appointment_date) <= end_date)
        
        # Status filter
        if status:
            query = query.filter(Appointment.status == status)
        
        # Patient filter
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        
        # Doctor filter
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        
        # Order by appointment date
        return query.order_by(asc(Appointment.appointment_date)).offset(skip).limit(limit).all()
    
    @staticmethod
    def get_appointment_by_id(db: Session, appointment_id: str) -> Optional[Appointment]:
        """Get a specific appointment by ID"""
        return db.query(Appointment).filter(Appointment.id == appointment_id).first()
    
    @staticmethod
    def update_appointment(db: Session, appointment_id: str, appointment_data: dict) -> Optional[Appointment]:
        """Update an existing appointment"""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            return None
        
        # Handle datetime conversion for appointment_date
        if 'appointment_date' in appointment_data and isinstance(appointment_data['appointment_date'], str):
            appointment_data['appointment_date'] = datetime.fromisoformat(
                appointment_data['appointment_date'].replace('Z', '+00:00')
            )
        
        # Recalculate end_time if appointment_date or duration changed
        if 'appointment_date' in appointment_data or 'duration_minutes' in appointment_data:
            start_time = appointment_data.get('appointment_date', appointment.appointment_date)
            duration = appointment_data.get('duration_minutes', appointment.duration_minutes)
            appointment_data['end_time'] = start_time + timedelta(minutes=duration)
        
        # Handle cancellation
        if appointment_data.get('status') == 'cancelled' and 'cancelled_reason' in appointment_data:
            appointment_data['cancelled_at'] = datetime.utcnow()
        
        # Handle confirmation
        if appointment_data.get('status') == 'confirmed':
            appointment_data['confirmed_at'] = datetime.utcnow()
        
        # Update fields
        for key, value in appointment_data.items():
            if hasattr(appointment, key):
                setattr(appointment, key, value)
        
        appointment.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(appointment)
        return appointment
    
    @staticmethod
    def delete_appointment(db: Session, appointment_id: str) -> bool:
        """Delete (cancel) an appointment"""
        appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
        if not appointment:
            return False
        
        # Soft delete by setting status to cancelled
        appointment.status = "cancelled"
        appointment.cancelled_at = datetime.utcnow()
        appointment.updated_at = datetime.utcnow()
        db.commit()
        return True
    
    @staticmethod
    def get_appointments_by_date(db: Session, target_date: date) -> List[Appointment]:
        """Get all appointments for a specific date"""
        return db.query(Appointment).filter(
            func.date(Appointment.appointment_date) == target_date
        ).order_by(asc(Appointment.appointment_date)).all()
    
    @staticmethod
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
                "patient_name": None,
                "reason": None
            })
            current_time += timedelta(minutes=slot_duration)
        
        # Get existing appointments for the date
        existing_appointments = AppointmentService.get_appointments_by_date(db, target_date)
        
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
                        slot["reason"] = appointment.reason
                else:
                    # If no end time, assume default duration
                    apt_end_calculated = (datetime.combine(target_date, apt_start) + 
                                        timedelta(minutes=appointment.duration_minutes)).time()
                    if apt_start <= slot_time < apt_end_calculated:
                        slot["available"] = False
                        slot["appointment_id"] = appointment.id
                        slot["patient_name"] = appointment.patient.full_name if appointment.patient else "Unknown"
                        slot["reason"] = appointment.reason
        
        return slots
    
    @staticmethod
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
            schedule[date_str] = AppointmentService.get_available_time_slots(
                db, current_date, doctor_id
            )
            current_date += timedelta(days=1)
        
        return schedule
    
    @staticmethod
    def get_appointment_stats(db: Session, doctor_id: Optional[str] = None) -> Dict:
        """Get appointment statistics"""
        query = db.query(Appointment)
        
        if doctor_id:
            query = query.filter(Appointment.doctor_id == doctor_id)
        
        total = query.count()
        scheduled = query.filter(Appointment.status == "scheduled").count()
        confirmed = query.filter(Appointment.status == "confirmed").count()
        completed = query.filter(Appointment.status == "completed").count()
        cancelled = query.filter(Appointment.status == "cancelled").count()
        no_show = query.filter(Appointment.status == "no_show").count()
        
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
            "scheduled": scheduled,
            "confirmed": confirmed,
            "completed": completed,
            "cancelled": cancelled,
            "no_show": no_show,
            "today": today_appointments,
            "this_week": week_appointments
        }







