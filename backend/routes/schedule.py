# ============================================================================
# SCHEDULE ROUTES - Endpoints para gestión de horarios
# ============================================================================

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.schedule import (
    ScheduleTemplate as ScheduleTemplateModel,
    ScheduleException as ScheduleExceptionModel,
    ScheduleSlot as ScheduleSlotModel
)
from models.schedule import (
    ScheduleTemplateCreate,
    ScheduleTemplateUpdate,
    ScheduleTemplate,
    ScheduleExceptionCreate,
    ScheduleException,
    WeeklySchedule,
    AvailableSlot,
    DaySchedule
)
from typing import List, Optional
from datetime import datetime, date, time, timedelta
import calendar

router = APIRouter(prefix="/api/schedule", tags=["Horarios"])

# ============================================================================
# SCHEDULE TEMPLATES - Plantillas de horarios
# ============================================================================

@router.post("/templates", response_model=ScheduleTemplate)
async def create_schedule_template(
    template: ScheduleTemplateCreate,
    db: Session = Depends(get_db)
):
    """Crear una nueva plantilla de horario"""
    # TODO: Obtener doctor_id del token de autenticación
    doctor_id = 1  # Placeholder
    
    # Verificar si ya existe un horario para este día
    existing = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == doctor_id,
        ScheduleTemplateModel.day_of_week == template.day_of_week
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un horario configurado para este día de la semana"
        )
    
    db_template = ScheduleTemplateModel(
        doctor_id=doctor_id,
        **template.dict()
    )
    
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    
    return db_template

@router.get("/templates", response_model=List[ScheduleTemplate])
async def get_schedule_templates(
    db: Session = Depends(get_db)
):
    """Obtener todas las plantillas de horario del médico"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    templates = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == doctor_id
    ).order_by(ScheduleTemplateModel.day_of_week).all()
    
    return templates

@router.get("/templates/weekly", response_model=WeeklySchedule)
async def get_weekly_schedule(
    db: Session = Depends(get_db)
):
    """Obtener el horario semanal completo"""
    # TODO: Obtener doctor_id del token
    doctor_id = 1
    
    templates = db.query(ScheduleTemplateModel).filter(
        ScheduleTemplateModel.doctor_id == doctor_id
    ).all()
    
    # Organizar por día de la semana
    weekly = {
        0: None,  # Lunes
        1: None,  # Martes
        2: None,  # Miércoles
        3: None,  # Jueves
        4: None,  # Viernes
        5: None,  # Sábado
        6: None   # Domingo
    }
    
    for template in templates:
        weekly[template.day_of_week] = template
    
    return WeeklySchedule(
        monday=weekly[0],
        tuesday=weekly[1],
        wednesday=weekly[2],
        thursday=weekly[3],
        friday=weekly[4],
        saturday=weekly[5],
        sunday=weekly[6]
    )

@router.put("/templates/{template_id}", response_model=ScheduleTemplate)
async def update_schedule_template(
    template_id: int,
    template_update: ScheduleTemplateUpdate,
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
    update_data = template_update.dict(exclude_unset=True)
    for field, value in update_data.items():
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

@router.post("/exceptions", response_model=ScheduleException)
async def create_schedule_exception(
    exception: ScheduleExceptionCreate,
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

@router.get("/exceptions", response_model=List[ScheduleException])
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

@router.get("/available-slots", response_model=List[AvailableSlot])
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
        
        slots.append(AvailableSlot(
            date=target_date,
            start_time=current_time.time(),
            end_time=slot_end.time(),
            duration_minutes=duration_minutes,
            slot_type="consultation"
        ))
        
        current_time += timedelta(minutes=template.consultation_duration + template.break_duration)
    
    return slots

@router.get("/day-schedule/{target_date}", response_model=DaySchedule)
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
    
    return DaySchedule(
        date=target_date,
        is_working_day=is_working_day,
        available_slots=available_slots,
        exceptions=exceptions
    )

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
