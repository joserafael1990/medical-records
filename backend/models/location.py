from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import Base, utc_now

# ============================================================================
# GEOGRAPHIC CATALOGS
# ============================================================================

class Country(Base):
    __tablename__ = "countries"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    phone_code = Column(String(5))  # International dialing code (e.g., +52, +58)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    states = relationship("State", back_populates="country")

class State(Base):
    __tablename__ = "states"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    country = relationship("Country", back_populates="states")
    persons_birth = relationship("Person", foreign_keys="Person.birth_state_id")
    persons_address = relationship("Person", foreign_keys="Person.address_state_id")

# ============================================================================
# OFFICE MANAGEMENT
# ============================================================================

class Office(Base):
    __tablename__ = "offices"
    
    id = Column(Integer, primary_key=True)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    name = Column(String(200), nullable=False)
    
    # Dirección
    address = Column(Text)
    city = Column(String(100))
    state_id = Column(Integer, ForeignKey("states.id"))
    country_id = Column(Integer, ForeignKey("countries.id"))
    postal_code = Column(String(10))
    
    # Contacto
    phone = Column(String(20))
    
    # Configuración
    timezone = Column(String(50), default='America/Mexico_City')
    maps_url = Column(Text)  # URL de Google Maps
    
    # Sistema
    is_active = Column(Boolean, default=True)
    is_virtual = Column(Boolean, default=False)  # Indica si es consultorio virtual
    virtual_url = Column(String(500))  # URL para consultas virtuales (Zoom, Teams, etc.)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relaciones
    doctor = relationship("Person", back_populates="offices")
    state = relationship("State")
    country = relationship("Country")
    appointments = relationship("Appointment", back_populates="office")
