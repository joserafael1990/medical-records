# ============================================================================
# SCHEDULE MODELS - Modelos para horarios de consulta
# ============================================================================

from sqlalchemy import Column, Integer, String, Boolean, Time, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, time
from typing import Optional, List, Dict, Any

class ScheduleTemplate(Base):
    """
    Plantilla de horarios para el médico
    Define los horarios base de trabajo por día de la semana
    """
    __tablename__ = "schedule_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=True)  # Keep for compatibility
    office_id = Column(Integer, ForeignKey("offices.id"), nullable=False)
    
    # Día de la semana (0=Lunes, 1=Martes, ..., 6=Domingo)
    day_of_week = Column(Integer, nullable=False)  # 0-6
    
    # Horarios de trabajo
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    
    # Duración por consulta (en minutos)
    consultation_duration = Column(Integer, default=30)
    
    # Tiempo de descanso entre consultas (en minutos)
    break_duration = Column(Integer, default=0)
    
    # Horario de almuerzo
    lunch_start = Column(Time, nullable=True)
    lunch_end = Column(Time, nullable=True)
    
    # Estado del día
    is_active = Column(Boolean, default=True)
    
    # Metadatos
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    # office = relationship("Office", back_populates="schedule_templates")
    # schedule_exceptions relationship removed - table deleted

# ScheduleException model removed - table deleted

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

from pydantic import BaseModel, Field, validator
from datetime import time, date
from typing import Optional, List

class ScheduleTemplateBase(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6, description="Día de la semana (0=Lunes, 6=Domingo)")
    start_time: time = Field(..., description="Hora de inicio")
    end_time: time = Field(..., description="Hora de fin")
    consultation_duration: int = Field(30, ge=15, le=120, description="Duración de consulta en minutos")
    break_duration: int = Field(0, ge=0, le=30, description="Tiempo de descanso en minutos")
    lunch_start: Optional[time] = Field(None, description="Inicio de almuerzo")
    lunch_end: Optional[time] = Field(None, description="Fin de almuerzo")
    is_active: bool = Field(True, description="Estado del horario")
    
    @validator('end_time')
    def end_time_after_start_time(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('La hora de fin debe ser posterior a la hora de inicio')
        return v
    
    @validator('lunch_end')
    def lunch_end_after_lunch_start(cls, v, values):
        if v and 'lunch_start' in values and values['lunch_start'] and v <= values['lunch_start']:
            raise ValueError('La hora de fin de almuerzo debe ser posterior al inicio')
        return v

class ScheduleTemplateCreate(ScheduleTemplateBase):
    pass

class ScheduleTemplateUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    consultation_duration: Optional[int] = Field(None, ge=15, le=120)
    break_duration: Optional[int] = Field(None, ge=0, le=30)
    lunch_start: Optional[time] = None
    lunch_end: Optional[time] = None
    is_active: Optional[bool] = None

class ScheduleTemplate(ScheduleTemplateBase):
    id: int
    doctor_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# ScheduleException Pydantic models removed - table deleted

class WeeklySchedule(BaseModel):
    """Representación del horario semanal completo"""
    monday: Optional[ScheduleTemplate] = None
    tuesday: Optional[ScheduleTemplate] = None
    wednesday: Optional[ScheduleTemplate] = None
    thursday: Optional[ScheduleTemplate] = None
    friday: Optional[ScheduleTemplate] = None
    saturday: Optional[ScheduleTemplate] = None
    sunday: Optional[ScheduleTemplate] = None
    
    class Config:
        from_attributes = True

class AvailableSlot(BaseModel):
    """Slot disponible para citas"""
    date: date
    start_time: time
    end_time: time
    slot_type: str = "consultation"

class DaySchedule(BaseModel):
    """Horario de un día específico"""
    date: date
    is_working_day: bool
    available_slots: List[AvailableSlot]
    # exceptions field removed - ScheduleException table deleted
    
    class Config:
        from_attributes = True
