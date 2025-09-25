# ============================================================================
# SCHEDULE ROUTES - Endpoints para gestión de horarios
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db, Person
# Import SQLAlchemy models directly from the file to avoid Pydantic conflict
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Define SQLAlchemy model directly to avoid Pydantic conflicts
from sqlalchemy import Column, Integer, String, Boolean, Time, ForeignKey, DateTime, Text
from database import Base
# Import datetime BEFORE the class definition
from typing import List, Optional
from datetime import datetime, date, time, timedelta
import calendar

class ScheduleTemplateModel(Base):
    __tablename__ = "schedule_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0-6
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    consultation_duration = Column(Integer, default=30)
    break_duration = Column(Integer, default=0)
    lunch_start = Column(Time, nullable=True)
    lunch_end = Column(Time, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

router = APIRouter(prefix="/api/schedule", tags=["Horarios"])

# Authentication dependency will be injected

# ============================================================================
# SCHEDULE TEMPLATES - Plantillas de horarios
# ============================================================================

@router.post("/test-simple")
async def test_simple_schedule():
    """Test endpoint simple"""
    return {"message": "Schedule router working", "status": "ok"}

@router.post("/templates")
async def create_schedule_template(
    data: dict,
    db: Session = Depends(get_db)
):
    """Crear una nueva plantilla de horario"""
    print(f"🔧 Data received: {data}")
    
    # For now, use doctor_id = 42 (our test doctor)
    doctor_id = 42
    
    # Parse time strings to time objects
    try:
        start_time = time.fromisoformat(data.get('start_time'))
        end_time = time.fromisoformat(data.get('end_time'))
        
        # Create the template with defaults
        db_template = ScheduleTemplateModel(
            doctor_id=doctor_id,
            day_of_week=data.get('day_of_week'),
            start_time=start_time,
            end_time=end_time,
            consultation_duration=data.get('consultation_duration', 30),
            break_duration=data.get('break_duration', 0),
            lunch_start=None,  # Will implement later
            lunch_end=None,    # Will implement later
            is_active=data.get('is_active', True)
        )
        
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        
        return {
            "success": True,
            "message": "Schedule template created successfully",
            "id": db_template.id,
            "day_of_week": db_template.day_of_week,
            "start_time": str(db_template.start_time),
            "end_time": str(db_template.end_time)
        }
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating template: {e}")
        return {"success": False, "error": str(e)}

@router.get("/templates")
async def get_schedule_templates(
    db: Session = Depends(get_db)
):
    """Obtener todas las plantillas de horario del médico"""
    # Get templates for doctor_id = 42 (test doctor)
    templates = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == 42
    ).all()
    
    # Return as simple dictionaries
    return [
        {
            "id": t.id,
            "doctor_id": t.doctor_id,
            "day_of_week": t.day_of_week,
            "start_time": str(t.start_time),
            "end_time": str(t.end_time),
            "consultation_duration": t.consultation_duration,
            "break_duration": t.break_duration,
            "is_active": t.is_active
        }
        for t in templates
    ]

@router.get("/templates/weekly")
async def get_weekly_schedule(
    db: Session = Depends(get_db)
):
    """Obtener el horario semanal completo"""
    # Get all templates for doctor_id = 42 (test doctor)
    templates = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == 42
    ).all()
    
    # Initialize weekly schedule
    weekly_schedule = {
        "monday": None,
        "tuesday": None,
        "wednesday": None,
        "thursday": None,
        "friday": None,
        "saturday": None,
        "sunday": None
    }
    
    # Map day indices to day names
    day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    
    # Fill in the templates
    for template in templates:
        day_name = day_names[template.day_of_week]
        weekly_schedule[day_name] = {
            "id": template.id,
            "day_of_week": template.day_of_week,
            "start_time": str(template.start_time),
            "end_time": str(template.end_time),
            "consultation_duration": template.consultation_duration,
            "break_duration": template.break_duration,
            "lunch_start": str(template.lunch_start) if template.lunch_start else None,
            "lunch_end": str(template.lunch_end) if template.lunch_end else None,
            "is_active": template.is_active
        }
    
    return weekly_schedule

@router.put("/templates/{template_id}")
async def update_schedule_template(
    template_id: int,
    template_update: dict,
    db: Session = Depends(get_db)
):
    """Actualizar una plantilla de horario"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    db_template = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.id == template_id,
        ScheduleTemplateModel.doctor_id == doctor_id
    ).first()
    
    if not db_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plantilla de horario no encontrada"
        )
    
    # Actualizar campos
    for field, value in template_update.items():
        if hasattr(db_template, field):
            setattr(db_template, field, value)
    
    db_template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_template)
    
    return db_template

@router.delete("/templates/{template_id}")
async def delete_schedule_template(
    template_id: int,
    db: Session = Depends(get_db)
):
    """Eliminar una plantilla de horario"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    db_template = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.id == template_id,
        ScheduleTemplateModel.doctor_id == doctor_id
    ).first()
    
    if not db_template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plantilla de horario no encontrada"
        )
    
    db.delete(db_template)
    db.commit()
    
    return {"message": "Plantilla de horario eliminada exitosamente"}

# ============================================================================
# SCHEDULE EXCEPTIONS - Excepciones de horario
# ============================================================================

@router.post("/exceptions")
async def create_schedule_exception(
    exception: dict,
    db: Session = Depends(get_db)
):
    """Crear una excepción de horario (día libre, horario especial, etc.)"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    db_exception = ScheduleExceptionModel(
        doctor_id=doctor_id,
        **exception.dict()
    )
    
    db.add(db_exception)
    db.commit()
    db.refresh(db_exception)
    
    return db_exception

@router.get("/exceptions")
async def get_schedule_exceptions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Obtener excepciones de horario en un rango de fechas"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    query = db.query(ScheduleExceptionModel).filter(
        ScheduleExceptionModel.doctor_id == doctor_id
    )
    
    if start_date:
        query = query.filter(ScheduleExceptionModel.exception_date >= start_date)
    if end_date:
        query = query.filter(ScheduleExceptionModel.exception_date <= end_date)
    
    return query.order_by(ScheduleExceptionModel.exception_date).all()

@router.delete("/exceptions/{exception_id}")
async def delete_schedule_exception(
    exception_id: int,
    db: Session = Depends(get_db)
):
    """Eliminar una excepción de horario"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    db_exception = db.query(ScheduleExceptionModel).filter(
        ScheduleExceptionModel.id == exception_id,
        ScheduleExceptionModel.doctor_id == doctor_id
    ).first()
    
    if not db_exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Excepción de horario no encontrada"
        )
    
    db.delete(db_exception)
    db.commit()
    
    return {"message": "Excepción de horario eliminada exitosamente"}

# ============================================================================
# AVAILABLE SLOTS - Slots disponibles
# ============================================================================

@router.get("/available-slots")
async def get_available_slots(
    target_date: date,
    db: Session = Depends(get_db)
):
    """Obtener slots disponibles para una fecha específica"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1

    # Get doctor's appointment_duration from persons table
    doctor = db.query(Person).filter(Person.id == doctor_id).first()
    duration_minutes = doctor.appointment_duration if doctor and doctor.appointment_duration else 30
    
    # Obtener día de la semana (0=Lunes, 6=Domingo)
    day_of_week = target_date.weekday()
    
    # Buscar plantilla para este día
    template = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == doctor_id,
        ScheduleTemplateModel.day_of_week == day_of_week,
        ScheduleTemplateModel.is_active == True
    ).first()
    
    if not template:
        return []  # No hay horario configurado para este día
    
    # Verificar excepciones para esta fecha
    exception = db.query(ScheduleExceptionModel).filter(
        ScheduleExceptionModel.doctor_id == doctor_id,
        ScheduleExceptionModel.exception_date == target_date
    ).first()
    
    if exception and exception.is_day_off:
        return []  # Es día libre
    
    # Generar slots disponibles
    slots = []
    current_time = datetime.combine(target_date, template.start_time)
    end_time = datetime.combine(target_date, template.end_time)
    
    # Considerar horario de almuerzo
    lunch_start = None
    lunch_end = None
    if template.lunch_start and template.lunch_end:
        lunch_start = datetime.combine(target_date, template.lunch_start)
        lunch_end = datetime.combine(target_date, template.lunch_end)
    
    while current_time + timedelta(minutes=duration_minutes) <= end_time:
        slot_end = current_time + timedelta(minutes=duration_minutes)
        
        # Verificar si el slot no interfiere con el almuerzo
        if lunch_start and lunch_end:
            if not (current_time >= lunch_end or slot_end <= lunch_start):
                current_time += timedelta(minutes=template.consultation_duration + template.break_duration)
                continue
        
        # TODO: Verificar que no haya citas existentes en este slot
        
        slots.append({
            "date": target_date.isoformat(),
            "start_time": current_time.time().isoformat(),
            "end_time": slot_end.time().isoformat(),
            "duration_minutes": duration_minutes,
            "slot_type": "consultation"
        })
        
        current_time += timedelta(minutes=template.consultation_duration + template.break_duration)
    
    return slots

@router.get("/day-schedule/{target_date}")
async def get_day_schedule(
    target_date: date,
    db: Session = Depends(get_db)
):
    """Obtener el horario completo de un día específico"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    # Obtener slots disponibles
    available_slots = await get_available_slots(target_date, 30, db)
    
    # Obtener excepciones para este día
    exceptions = db.query(ScheduleExceptionModel).filter(
        ScheduleExceptionModel.doctor_id == doctor_id,
        ScheduleExceptionModel.exception_date == target_date
    ).all()
    
    is_working_day = len(available_slots) > 0
    
    return {
        "date": target_date.isoformat(),
        "is_working_day": is_working_day,
        "available_slots": available_slots,
        "exceptions": exceptions
    }

# ============================================================================
# UTILITY ENDPOINTS
# ============================================================================

@router.post("/generate-weekly-template")
async def generate_default_weekly_template(
    db: Session = Depends(get_db)
):
    """Generar plantilla semanal por defecto (Lunes a Viernes 9:00-18:00)"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    # Verificar si ya existen plantillas
    existing_count = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == doctor_id
    ).count()
    
    if existing_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existen plantillas de horario configuradas"
        )
    
    # Crear plantillas para Lunes a Viernes
    for day in range(5):  # 0-4 (Lunes a Viernes)
        template = ScheduleTemplateModel(
            doctor_id=doctor_id,
            day_of_week=day,
            start_time=time(9, 0),  # 9:00 AM
            end_time=time(18, 0),   # 6:00 PM
            consultation_duration=30,
            break_duration=0,
            lunch_start=time(13, 0),  # 1:00 PM
            lunch_end=time(14, 0),    # 2:00 PM
            is_active=True
        )
        db.add(template)
    
    db.commit()
    
    return {"message": "Plantilla semanal por defecto creada exitosamente"}

@router.get("/working-days")
async def get_working_days(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    """Obtener días laborables en un rango de fechas"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    working_days = []
    current_date = start_date
    
    while current_date <= end_date:
        day_of_week = current_date.weekday()
        
        # Verificar si hay plantilla para este día
        template = db.query(ScheduleTemplateModel).filter(
            ScheduleTemplateModel.doctor_id == doctor_id,
            ScheduleTemplateModel.day_of_week == day_of_week,
            ScheduleTemplateModel.is_active == True
        ).first()
        
        if template:
            # Verificar excepciones
            exception = db.query(ScheduleExceptionModel).filter(
                ScheduleExceptionModel.doctor_id == doctor_id,
                ScheduleExceptionModel.exception_date == current_date
            ).first()
            
            if not (exception and exception.is_day_off):
                working_days.append(current_date)
        
        current_date += timedelta(days=1)
    
    return {"working_days": working_days}
