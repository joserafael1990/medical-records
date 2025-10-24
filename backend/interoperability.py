"""
Módulo de Interoperabilidad - HL7 FHIR y NOM-024
Sistema de intercambio de datos médicos estándar
"""
from datetime import datetime, date
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
import json
import uuid

# ============================================================================
# FHIR RESOURCE MODELS
# ============================================================================

class FHIRIdentifier(BaseModel):
    """FHIR Identifier - Compatible con CURP, RFC, etc."""
    use: str = "official"  # official, secondary, temp
    type: Dict[str, Any]
    system: str  # URI del sistema de identificación
    value: str

class FHIRName(BaseModel):
    """FHIR HumanName"""
    use: str = "official"
    family: str  # Apellidos
    given: List[str]  # Nombres
    prefix: Optional[List[str]] = None  # Dr., Dra.
    text: Optional[str] = None  # Nombre completo

class FHIRAddress(BaseModel):
    """FHIR Address"""
    use: str = "work"  # home, work, temp
    type: str = "physical"  # postal, physical, both
    text: Optional[str] = None
    line: List[str]  # Dirección líneas
    city: str
    state: str
    postalCode: Optional[str] = None
    country: str = "MX"

class FHIRContactPoint(BaseModel):
    """FHIR ContactPoint - Teléfonos, emails"""
    system: str  # phone, email, fax, pager, url, sms, other
    value: str
    use: str = "work"  # home, work, temp, old, mobile

class FHIRPractitioner(BaseModel):
    """FHIR Practitioner Resource - Médico"""
    resourceType: str = "Practitioner"
    id: str
    identifier: List[FHIRIdentifier]
    active: bool = True
    name: List[FHIRName]
    telecom: List[FHIRContactPoint]
    address: List[FHIRAddress]
    gender: str  # male, female, other, unknown
    birthDate: str  # YYYY-MM-DD
    qualification: List[Dict[str, Any]]  # Cédulas y especialidades

class FHIRPatient(BaseModel):
    """FHIR Patient Resource - Paciente"""
    resourceType: str = "Patient"
    id: str
    identifier: List[FHIRIdentifier]
    active: bool = True
    name: List[FHIRName]
    telecom: Optional[List[FHIRContactPoint]] = None
    gender: str
    birthDate: str
    address: Optional[List[FHIRAddress]] = None

class FHIREncounter(BaseModel):
    """FHIR Encounter Resource - Consulta"""
    resourceType: str = "Encounter"
    id: str
    status: str  # planned, arrived, triaged, in-progress, onleave, finished, cancelled
    class_: Dict[str, str]  # ambulatory, emergency, inpatient
    subject: Dict[str, str]  # Reference to Patient
    participant: List[Dict[str, Any]]  # Médicos participantes
    period: Dict[str, str]  # start, end datetime
    reasonCode: Optional[List[Dict[str, Any]]] = None  # Motivos de consulta

# ============================================================================
# INTEROPERABILITY SERVICE
# ============================================================================

class InteroperabilityService:
    """Servicio de interoperabilidad HL7 FHIR"""
    
    @staticmethod
    def doctor_to_fhir_practitioner(doctor_profile) -> FHIRPractitioner:
        """Convierte perfil de doctor a FHIR Practitioner"""
        
        # Identificadores
        identifiers = []
        
        # CURP
        if doctor_profile.curp:
            identifiers.append(FHIRIdentifier(
                type={
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "code": "SB",
                        "display": "Social Beneficiary Identifier"
                    }],
                    "text": "CURP"
                },
                system="urn:oid:2.16.840.1.113883.4.629",  # CURP system
                value=doctor_profile.curp
            ))
        
        # RFC
        if doctor_profile.rfc:
            identifiers.append(FHIRIdentifier(
                type={
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "code": "TAX",
                        "display": "Tax ID number"
                    }],
                    "text": "RFC"
                },
                system="urn:oid:2.16.840.1.113883.4.628",  # RFC system
                value=doctor_profile.rfc
            ))
        
        # Cédula Profesional
        identifiers.append(FHIRIdentifier(
            type={
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                    "code": "PRN",
                    "display": "Provider number"
                }],
                "text": "Cédula Profesional"
            },
            system="urn:oid:2.16.840.1.113883.4.630",  # Cédula system
            value=doctor_profile.professional_license
        ))
        
        # Nombres
        names = [FHIRName(
            family=f"{doctor_profile.paternal_surname} {doctor_profile.maternal_surname or ''}".strip(),
            given=[doctor_profile.first_name],
            prefix=[doctor_profile.title] if doctor_profile.title else None,
            text=doctor_profile.full_name
        )]
        
        # Contactos
        telecom = []
        if doctor_profile.email:
            telecom.append(FHIRContactPoint(
                system="email",
                value=doctor_profile.email,
                use="work"
            ))
        
        if doctor_profile.phone:
            telecom.append(FHIRContactPoint(
                system="phone",
                value=doctor_profile.phone,
                use="work"
            ))
        
        # Office phone moved to offices table - skip for now
        # if doctor_profile.office_phone:
        #     telecom.append(FHIRContactPoint(
        #         system="phone",
        #         value=doctor_profile.office_phone,
        #         use="work"
        #     ))
        
        # Dirección
        addresses = [FHIRAddress(
            use="work",
            type="physical",
            text=doctor_profile.office_address,
            line=[doctor_profile.office_address],
            city=doctor_profile.office_city,
            state=doctor_profile.office_state,
            postalCode=doctor_profile.office_postal_code,
            country="MX"
        )]
        
        # Calificaciones
        qualifications = [
            {
                "identifier": [{
                    "value": doctor_profile.professional_license
                }],
                "code": {
                    "coding": [{
                        "system": "http://snomed.info/sct",
                        "code": "309343006",
                        "display": "Physician"
                    }],
                    "text": "Médico"
                },
                "issuer": {
                    "display": "SEP - Secretaría de Educación Pública"
                }
            }
        ]
        
        # Especialidad
        if doctor_profile.specialty:
            qualifications.append({
                "code": {
                    "coding": [{
                        "system": "http://snomed.info/sct",
                        "display": doctor_profile.specialty
                    }],
                    "text": doctor_profile.specialty
                },
                "issuer": {
                    "display": "Consejo de Especialidad"
                }
            })
        
        return FHIRPractitioner(
            id=doctor_profile.id,
            identifier=identifiers,
            active=doctor_profile.is_active,
            name=names,
            telecom=telecom,
            address=addresses,
            gender="unknown",  # No capturamos género del médico
            birthDate=doctor_profile.birth_date.isoformat() if doctor_profile.birth_date else "",
            qualification=qualifications
        )
    
    @staticmethod
    def patient_to_fhir_patient(patient) -> FHIRPatient:
        """Convierte paciente a FHIR Patient"""
        
        # Identificadores
        identifiers = []
        
        # CURP del paciente
        if hasattr(patient, 'curp') and patient.curp:
            identifiers.append(FHIRIdentifier(
                type={
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                        "code": "SB",
                        "display": "Social Beneficiary Identifier"
                    }],
                    "text": "CURP"
                },
                system="urn:oid:2.16.840.1.113883.4.629",
                value=patient.curp
            ))
        
        # ID interno
        identifiers.append(FHIRIdentifier(
            type={
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                    "code": "MR",
                    "display": "Medical record number"
                }],
                "text": "Hospital ID"
            },
            system="urn:oid:2.16.840.1.113883.4.631",
            value=patient.id
        ))
        
        # Nombres
        names = [FHIRName(
            family=f"{patient.paternal_surname} {patient.maternal_surname or ''}".strip(),
            given=[patient.first_name],
            text=f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip()
        )]
        
        # Contactos
        telecom = []
        if hasattr(patient, 'phone') and patient.phone:
            telecom.append(FHIRContactPoint(
                system="phone",
                value=patient.phone,
                use="home"
            ))
        
        if hasattr(patient, 'email') and patient.email:
            telecom.append(FHIRContactPoint(
                system="email",
                value=patient.email,
                use="home"
            ))
        
        # Dirección
        addresses = None
        if hasattr(patient, 'address') and patient.address:
            addresses = [FHIRAddress(
                use="home",
                type="physical",
                text=patient.address,
                line=[patient.address],
                city=getattr(patient, 'city', ''),
                state=getattr(patient, 'state', ''),
                postalCode=getattr(patient, 'postal_code', ''),
                country="MX"
            )]
        
        # Mapeo de género
        gender_map = {
            'masculino': 'male',
            'femenino': 'female',
            'otro': 'other'
        }
        
        return FHIRPatient(
            id=patient.id,
            identifier=identifiers,
            active=True,
            name=names,
            telecom=telecom if telecom else None,
            gender=gender_map.get(patient.gender.lower(), 'unknown'),
            birthDate=patient.birth_date.isoformat() if patient.birth_date else "",
            address=addresses
        )
    
    @staticmethod
    def consultation_to_fhir_encounter(consultation, patient_id: str, doctor_id: str) -> FHIREncounter:
        """Convierte consulta a FHIR Encounter"""
        
        return FHIREncounter(
            id=consultation.id,
            status="finished",
            class_={
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": "AMB",
                "display": "ambulatory"
            },
            subject={
                "reference": f"Patient/{patient_id}"
            },
            participant=[{
                "individual": {
                    "reference": f"Practitioner/{doctor_id}"
                },
                "type": [{
                    "coding": [{
                        "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                        "code": "PPRF",
                        "display": "primary performer"
                    }]
                }]
            }],
            period={
                "start": consultation.date.isoformat() if consultation.date else "",
                "end": consultation.date.isoformat() if consultation.date else ""
            },
            reasonCode=[{
                "text": consultation.chief_complaint
            }] if hasattr(consultation, 'chief_complaint') else None
        )

# ============================================================================
# EXPORT/IMPORT UTILITIES
# ============================================================================

class FHIRExporter:
    """Exportador de datos a formato FHIR"""
    
    @staticmethod
    def export_bundle(resources: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Crea un FHIR Bundle con múltiples recursos"""
        return {
            "resourceType": "Bundle",
            "id": str(uuid.uuid4()),
            "type": "collection",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "total": len(resources),
            "entry": [
                {
                    "resource": resource
                } for resource in resources
            ]
        }
    
    @staticmethod
    def export_patient_summary(patient, consultations, doctor_profile) -> Dict[str, Any]:
        """Exporta resumen completo del paciente en formato FHIR"""
        
        interop_service = InteroperabilityService()
        
        resources = []
        
        # Paciente
        fhir_patient = interop_service.patient_to_fhir_patient(patient)
        resources.append(fhir_patient.dict())
        
        # Médico
        fhir_practitioner = interop_service.doctor_to_fhir_practitioner(doctor_profile)
        resources.append(fhir_practitioner.dict())
        
        # Consultas
        for consultation in consultations:
            fhir_encounter = interop_service.consultation_to_fhir_encounter(
                consultation, patient.id, doctor_profile.id
            )
            resources.append(fhir_encounter.dict())
        
        return FHIRExporter.export_bundle(resources)

# ============================================================================
# CATALOGOS NOM-035
# ============================================================================

class NOMCatalogs:
    """Catálogos estandarizados según NOM-035"""
    
    GENDER_CODES = {
        "masculino": {
            "code": "M",
            "display": "Masculino",
            "system": "urn:oid:2.16.840.1.113883.5.1"
        },
        "femenino": {
            "code": "F", 
            "display": "Femenino",
            "system": "urn:oid:2.16.840.1.113883.5.1"
        },
        "otro": {
            "code": "O",
            "display": "Otro",
            "system": "urn:oid:2.16.840.1.113883.5.1"
        }
    }
    
    MEDICAL_SPECIALTIES = {
        # Lista de especialidades médicas con códigos SNOMED CT
        "medicina_general": {
            "code": "419192003",
            "display": "Medicina General",
            "system": "http://snomed.info/sct"
        },
        "cardiologia": {
            "code": "394579002",
            "display": "Cardiología", 
            "system": "http://snomed.info/sct"
        },
        "pediatria": {
            "code": "394537008",
            "display": "Pediatría",
            "system": "http://snomed.info/sct"
        },
        "ginecologia": {
            "code": "394586005",
            "display": "Ginecología y Obstetricia",
            "system": "http://snomed.info/sct"
        }
        # Agregar más especialidades según necesidades
    }
    
    ENCOUNTER_TYPES = {
        "consulta_general": {
            "code": "AMB",
            "display": "Consulta Ambulatoria",
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode"
        },
        "urgencias": {
            "code": "EMER",
            "display": "Urgencias",
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode"
        },
        "hospitalizacion": {
            "code": "IMP",
            "display": "Hospitalización",
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode"
        }
    }
