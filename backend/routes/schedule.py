from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db, Person
import auth
from sqlalchemy import Column, Integer, String, Boolean, Time, ForeignKey, DateTime, Text
from database import Base
from typing import List, Optional
from datetime import datetime, date, time, timedelta
import calendar

class ScheduleTemplateModel(Base):
    __tablename__ = "schedule_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0-6
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class TimeBlockModel(Base):
    __tablename__ = "schedule_time_blocks"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_template_id = Column(Integer, ForeignKey("schedule_templates.id"), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

router = APIRouter(prefix="/api/schedule", tags=["Horarios"])

# Security
security = HTTPBearer()

# Authentication dependency
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        user = auth.get_user_from_token(db, token)
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/templates")
async def create_schedule_template(
    data: dict,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear template de horario para un día específico"""
    
    # Use current authenticated user as the doctor
    doctor_id = current_user.id
    day_of_week = data.get('day_of_week')
    print(f"🔧 Creating template for doctor: {doctor_id}, day: {day_of_week}")
    
    try:
        # Check if template already exists for this doctor+day
        existing_template = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == doctor_id,
            ScheduleTemplateModel.day_of_week == day_of_week
    ).first()
    
        if existing_template:
            print(f"🔧 Found existing template {existing_template.id} for day {day_of_week}, deleting...")
            # Delete existing time blocks
            db.query(TimeBlockModel).filter(
                TimeBlockModel.schedule_template_id == existing_template.id
            ).delete()
            # Delete existing template
            db.delete(existing_template)
            db.flush()
        
        # Create the new template
        db_template = ScheduleTemplateModel(
            doctor_id=doctor_id,
            day_of_week=day_of_week,
            is_active=data.get('is_active', True)
        )
        
        db.add(db_template)
        db.flush()  # To get the ID before commit
        
        # Create time blocks
        time_blocks = data.get('time_blocks', [])
        if not time_blocks:
            # If no time blocks provided, create a default one
            time_blocks = [{"start_time": "09:00", "end_time": "17:00"}]
        
        db_time_blocks = []
        for block in time_blocks:
            # Handle both %H:%M and %H:%M:%S formats
            start_time_str = block['start_time']
            end_time_str = block['end_time']
            
            # Try %H:%M:%S format first, then %H:%M
            try:
                start_time = datetime.strptime(start_time_str, '%H:%M:%S').time()
            except ValueError:
                start_time = datetime.strptime(start_time_str, '%H:%M').time()
                
            try:
                end_time = datetime.strptime(end_time_str, '%H:%M:%S').time()
            except ValueError:
                end_time = datetime.strptime(end_time_str, '%H:%M').time()
            
            db_time_block = TimeBlockModel(
                schedule_template_id=db_template.id,
                start_time=start_time,
                end_time=end_time
            )
            db.add(db_time_block)
            db_time_blocks.append(db_time_block)
        
        db.commit()
        db.refresh(db_template)
        
        # Return the created template with time blocks
        return {
            "id": db_template.id,
            "day_of_week": db_template.day_of_week,
            "is_active": db_template.is_active,
            "time_blocks": [
                {
                    "id": block.id,
                    "start_time": str(block.start_time),
                    "end_time": str(block.end_time)
                }
                for block in db_time_blocks
            ]
        }
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating template: {e}")
        return {"success": False, "error": str(e)}

@router.get("/templates/weekly")
async def get_weekly_schedule(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener configuración de horarios semanal"""
    
    doctor_id = current_user.id
    print(f"🔧 Getting weekly schedule for doctor: {doctor_id}")
    
    # Get all schedule templates for the doctor
    templates = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == doctor_id
    ).all()
    
    # Mapping from day_of_week number to frontend key
    day_mapping = {
        0: 'monday',
        1: 'tuesday', 
        2: 'wednesday',
        3: 'thursday',
        4: 'friday',
        5: 'saturday',
        6: 'sunday'
    }
    
    # Get time blocks for each template
    result = {}
    for template in templates:
        time_blocks = db.query(TimeBlockModel).filter(
            TimeBlockModel.schedule_template_id == template.id
        ).order_by(TimeBlockModel.start_time).all()
        
        day_key = day_mapping.get(template.day_of_week)
        if day_key:
            result[day_key] = {
                "id": template.id,
                "day_of_week": template.day_of_week,
                "is_active": template.is_active,
                "time_blocks": [
                    {
                        "id": block.id,
                        "start_time": str(block.start_time),
                        "end_time": str(block.end_time)
                    }
                    for block in time_blocks
                ]
            }
    
    return result

@router.get("/available-times")
async def get_available_times_for_booking(
    date: str,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Endpoint simplificado para el frontend - solo horarios disponibles para agendar"""
    try:
        from database import Appointment
        from sqlalchemy import and_, or_
        
        target_date = datetime.fromisoformat(date).date()
        
        # Use current authenticated user as the doctor
        doctor_id = current_user.id
        appointment_duration = current_user.appointment_duration or 30  # Default 30 minutes
        
        print(f"🔧 Doctor ID from auth: {doctor_id}, Duration: {appointment_duration} minutes")
        
        # Get day of week (0=Monday, 6=Sunday) 
        day_of_week = target_date.weekday()
        
        # Get doctor's schedule template for this day
        schedule_template = db.query(ScheduleTemplateModel).filter(
            ScheduleTemplateModel.doctor_id == doctor_id,
            ScheduleTemplateModel.day_of_week == day_of_week,
            ScheduleTemplateModel.is_active == True
        ).first()
        
        if not schedule_template:
            return {"available_times": [], "message": "No hay horarios configurados para este día"}
        
        # Get time blocks for this schedule template
        time_blocks = db.query(TimeBlockModel).filter(
            TimeBlockModel.schedule_template_id == schedule_template.id
        ).order_by(TimeBlockModel.start_time).all()
        
        if not time_blocks:
            return {"available_times": [], "message": "No hay bloques de tiempo configurados para este día"}
        
        # Get existing appointments for this date and doctor (excluding cancelled ones)
        existing_appointments = db.query(Appointment).filter(
            and_(
                Appointment.doctor_id == doctor_id,
                Appointment.appointment_date >= datetime.combine(target_date, time.min),
                Appointment.appointment_date < datetime.combine(target_date, time.max) + timedelta(days=1),
                or_(
                    Appointment.status != 'cancelled',
                    Appointment.status.is_(None)  # Handle NULL status as active
                )
            )
        ).all()
        
        # Generate available slots
        available_times = []
        
        for time_block in time_blocks:
            # Generate slots within this time block
            current_time = datetime.combine(target_date, time_block.start_time)
            end_time = datetime.combine(target_date, time_block.end_time)
            
            while current_time + timedelta(minutes=appointment_duration) <= end_time:
                slot_end_time = current_time + timedelta(minutes=appointment_duration)
                
                # Check if this slot conflicts with existing appointments
                is_available = True
                
                for appointment in existing_appointments:
                    app_start = appointment.appointment_date
                    app_end = appointment.end_time or (app_start + timedelta(minutes=appointment_duration))
                    
                    # Check for overlap: two appointments overlap if one starts before the other ends
                    if (current_time < app_end and slot_end_time > app_start):
                        is_available = False
                        break
                
                if is_available:
                    available_times.append({
                        "time": current_time.strftime("%H:%M"),
                        "display": f"{current_time.strftime('%H:%M')} - {slot_end_time.strftime('%H:%M')}",
                        "duration_minutes": appointment_duration
                    })
                
                # Move to next slot (slots are consecutive with no break)
                current_time += timedelta(minutes=appointment_duration)
        
        return {
            "date": date,
            "doctor_id": doctor_id,
            "available_times": available_times,
            "total_available": len(available_times),
            "appointment_duration": appointment_duration
        }
        
    except Exception as e:
        print(f"❌ Error getting available times: {e}")
        return {"available_times": [], "error": str(e)}

@router.put("/templates/{template_id}")
async def update_schedule_template(
    template_id: int,
    template_update: dict,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar template de horario"""
    
    doctor_id = current_user.id
    
    # Buscar el template
    db_template = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.id == template_id,
        ScheduleTemplateModel.doctor_id == doctor_id
    ).first()
    
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Actualizar campos
    for field, value in template_update.items():
        if hasattr(db_template, field):
            setattr(db_template, field, value)
    
    db_template.updated_at = datetime.utcnow()
    
    # Update time blocks if provided
    if 'time_blocks' in template_update:
        # Delete existing time blocks
        db.query(TimeBlockModel).filter(
            TimeBlockModel.schedule_template_id == template_id
        ).delete()
        
        # Create new time blocks
        time_blocks = template_update['time_blocks']
        for block in time_blocks:
            # Handle both %H:%M and %H:%M:%S formats
            start_time_str = block['start_time']
            end_time_str = block['end_time']
            
            # Try %H:%M:%S format first, then %H:%M
            try:
                start_time = datetime.strptime(start_time_str, '%H:%M:%S').time()
            except ValueError:
                start_time = datetime.strptime(start_time_str, '%H:%M').time()
                
            try:
                end_time = datetime.strptime(end_time_str, '%H:%M:%S').time()
            except ValueError:
                end_time = datetime.strptime(end_time_str, '%H:%M').time()
            
            db_time_block = TimeBlockModel(
                schedule_template_id=template_id,
                start_time=start_time,
                end_time=end_time
            )
            db.add(db_time_block)
    
    db.commit()
    db.refresh(db_template)
    
    # Get updated time blocks
    time_blocks = db.query(TimeBlockModel).filter(
        TimeBlockModel.schedule_template_id == template_id
    ).order_by(TimeBlockModel.start_time).all()
    
    return {
        "id": db_template.id,
        "day_of_week": db_template.day_of_week,
        "is_active": db_template.is_active,
        "time_blocks": [
            {
                "id": block.id,
                "start_time": str(block.start_time),
                "end_time": str(block.end_time)
            }
            for block in time_blocks
        ]
    }
