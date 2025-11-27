from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Date
from sqlalchemy.orm import relationship
from .base import Base, utc_now

# ============================================================================
# AUXILIARY CATALOGS
# ============================================================================

class Specialty(Base):
    __tablename__ = "medical_specialties"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    doctors = relationship("Person", back_populates="specialty")

class EmergencyRelationship(Base):
    __tablename__ = "emergency_relationships"
    
    code = Column(String(20), primary_key=True)
    name = Column(String(50), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    persons = relationship("Person", back_populates="emergency_relationship")

# ============================================================================
# AUDIT LOG
# ============================================================================

class AuditLog(Base):
    """
    Audit log for complete system traceability
    Compliance: NOM-241-SSA1-2021, LFPDPPP, ISO 27001
    """
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True)
    
    # User information
    user_id = Column(Integer, ForeignKey("persons.id", ondelete="SET NULL"))
    user_email = Column(String(100))
    user_name = Column(String(200))
    user_type = Column(String(20))  # 'doctor', 'patient', 'admin', 'system'
    
    # Action performed
    action = Column(String(50), nullable=False)  # 'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS_DENIED'
    table_name = Column(String(50))  # Affected table
    record_id = Column(Integer)  # Affected record ID
    
    # Change data
    old_values = Column(JSON)  # Values before change
    new_values = Column(JSON)  # Values after change
    changes_summary = Column(Text)  # Human-readable summary
    
    # Operation context
    operation_type = Column(String(50))  # 'consultation_create', 'patient_update', etc.
    affected_patient_id = Column(Integer, ForeignKey("persons.id", ondelete="SET NULL"))
    affected_patient_name = Column(String(200))
    
    # Session information
    ip_address = Column(String(45))
    user_agent = Column(Text)
    session_id = Column(String(100))
    request_path = Column(String(500))
    request_method = Column(String(10))  # GET, POST, PUT, DELETE
    
    # Security
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    security_level = Column(String(20), default='INFO')  # 'INFO', 'WARNING', 'CRITICAL'
    
    # Timestamp
    timestamp = Column(DateTime, default=utc_now)
    
    # Additional metadata
    metadata_json = Column("metadata", JSON)
    
    # Relationships
    user = relationship("Person", foreign_keys=[user_id])
    affected_patient = relationship("Person", foreign_keys=[affected_patient_id])

# ============================================================================
# PRIVACY AND CONSENT SYSTEM
# ============================================================================

class PrivacyNotice(Base):
    """
    Versiones del aviso de privacidad
    Compliance: LFPDPPP
    """
    __tablename__ = "privacy_notices"
    
    id = Column(Integer, primary_key=True)
    version = Column(String(20), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    short_summary = Column(Text)
    effective_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    consents = relationship("PrivacyConsent", back_populates="privacy_notice")

class PrivacyConsent(Base):
    """
    Registro de consentimientos de privacidad de pacientes
    Soporta múltiples métodos: WhatsApp, papel, tablet, portal web
    """
    __tablename__ = "privacy_consents"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"))
    notice_id = Column(Integer, ForeignKey("privacy_notices.id"))
    consent_given = Column(Boolean, nullable=False)
    consent_date = Column(DateTime, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    patient = relationship("Person", foreign_keys=[patient_id], backref="privacy_consents")
    privacy_notice = relationship("PrivacyNotice", foreign_keys=[notice_id], back_populates="consents")

class ARCORequest(Base):
    """
    Solicitudes de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)
    Compliance: LFPDPPP Art. 28-34
    """
    __tablename__ = "arco_requests"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"))
    request_type = Column(String(20), nullable=False)  # 'access', 'rectification', 'cancellation', 'opposition'
    
    # Detalles de la solicitud
    description = Column(Text)
    
    # Estado
    status = Column(String(20), default='pending')  # 'pending', 'in_progress', 'completed', 'rejected'
    processed_by = Column(Integer, ForeignKey("persons.id"))
    
    # Respuesta
    response = Column(Text)
    processed_at = Column(DateTime)
    
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    patient = relationship("Person", foreign_keys=[patient_id])
    processed_by_person = relationship("Person", foreign_keys=[processed_by])

# ============================================================================
# GOOGLE CALENDAR INTEGRATION
# ============================================================================

class GoogleCalendarToken(Base):
    """
    Almacena tokens OAuth de Google Calendar por doctor
    """
    __tablename__ = "google_calendar_tokens"
    
    id = Column(Integer, primary_key=True)
    doctor_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False, unique=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text)
    token_expires_at = Column(DateTime)
    calendar_id = Column(String(255), default='primary')
    sync_enabled = Column(Boolean, default=True)
    last_sync_at = Column(DateTime)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    doctor = relationship("Person", back_populates="google_calendar_token")

# ============================================================================
# LICENSE MANAGEMENT
# ============================================================================

class License(Base):
    __tablename__ = "licenses"
    
    id = Column(Integer, primary_key=True)
    doctor_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    license_type = Column(String(50), nullable=False)  # 'trial', 'basic', 'premium'
    start_date = Column(Date, nullable=False)
    expiration_date = Column(Date, nullable=False)
    payment_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default='active')  # 'active', 'inactive', 'expired', 'suspended'
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # Relationships
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="licenses")
    creator = relationship("Person", foreign_keys=[created_by])
