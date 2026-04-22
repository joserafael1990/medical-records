"""CFDI 4.0 invoicing models (Facturama multi-emisor).

cfdi_issuers  — perfil fiscal por médico (1:1 con persons), guarda CSDs cifrados
                con AES-256-GCM usando MEDICAL_ENCRYPTION_KEY (ver encryption.py).
cfdi_invoices — facturas emitidas/canceladas. UUID SAT es único cuando existe.
"""
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Numeric,
    CheckConstraint,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .base import Base, utc_now


class CfdiIssuer(Base):
    __tablename__ = "cfdi_issuers"

    id = Column(Integer, primary_key=True)
    doctor_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Datos fiscales del emisor
    rfc = Column(String(13), nullable=False, index=True)
    legal_name = Column(String(300), nullable=False)
    tax_regime = Column(String(3), nullable=False)
    postal_code = Column(String(5), nullable=False)

    # CSDs cifrados (base64-encoded ciphertext)
    csd_cer_encrypted = Column(Text)
    csd_key_encrypted = Column(Text)
    csd_password_encrypted = Column(Text)
    csd_expires_at = Column(DateTime(timezone=True))

    # Facturama
    facturama_customer_id = Column(String(100))

    # Folios
    invoice_series = Column(String(25), default="CORTEX")
    invoice_folio_counter = Column(Integer, nullable=False, default=0)

    is_active = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    doctor = relationship("Person", foreign_keys=[doctor_id])
    invoices = relationship(
        "CfdiInvoice", back_populates="issuer", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("doctor_id", name="uq_cfdi_issuers_doctor"),)


class CfdiInvoice(Base):
    __tablename__ = "cfdi_invoices"

    id = Column(Integer, primary_key=True)
    issuer_id = Column(
        Integer, ForeignKey("cfdi_issuers.id", ondelete="RESTRICT"), nullable=False
    )
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=True, index=True)
    consultation_id = Column(
        Integer,
        ForeignKey("medical_records.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Identificación SAT / Facturama
    facturama_id = Column(String(100))
    uuid_sat = Column(String(36))
    serie = Column(String(25))
    folio = Column(String(40))

    # Receptor (snapshot)
    receptor_rfc = Column(String(13), nullable=False)
    receptor_name = Column(String(300), nullable=False)
    receptor_postal_code = Column(String(5), nullable=False)
    receptor_tax_regime = Column(String(3), nullable=False)
    cfdi_use = Column(String(3), nullable=False)

    # Importes
    subtotal = Column(Numeric(12, 2), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="MXN")
    payment_form = Column(String(3), nullable=False)
    payment_method = Column(String(3), nullable=False, default="PUE")

    # Concepto
    service_description = Column(Text, nullable=False)
    sat_product_code = Column(String(10), nullable=False)
    sat_unit_code = Column(String(10), nullable=False, default="E48")

    # Archivos
    pdf_url = Column(Text)
    xml_url = Column(Text)

    # Estado
    status = Column(String(20), nullable=False, default="issued")
    cancellation_reason = Column(String(2))
    cancellation_substitute_uuid = Column(String(36))
    cancelled_at = Column(DateTime(timezone=True))
    error_message = Column(Text)

    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    issuer = relationship("CfdiIssuer", back_populates="invoices")
    doctor = relationship("Person", foreign_keys=[doctor_id])
    patient = relationship("Person", foreign_keys=[patient_id])

    __table_args__ = (
        CheckConstraint(
            "status IN ('issued', 'cancelled', 'error')",
            name="ck_cfdi_invoices_status",
        ),
    )
