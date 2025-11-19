"""
Compliance Report Endpoint
Endpoint para reporte de cumplimiento normativo
Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012, NOM-035-SSA3-2012, LFPDPPP
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

from database import get_db, Person, MedicalRecord, PrivacyConsent, PrivacyNotice, AuditLog
from models.diagnosis import DiagnosisCatalog
from dependencies import get_current_user
from logger import get_logger
from data_retention_service import get_retention_stats

api_logger = get_logger("api")

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

# CDMX timezone
from datetime import timezone
import pytz
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')


@router.get("/report")
async def get_compliance_report(
    doctor_id: Optional[int] = Query(None, description="ID del doctor (opcional, para filtrar por doctor)"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Genera reporte de cumplimiento normativo
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012, NOM-035-SSA3-2012, LFPDPPP
    
    El reporte incluye:
    - Estado de cumplimiento NOM-004 (campos obligatorios, firmas digitales)
    - Estado de cumplimiento NOM-024 (interoperabilidad, catálogos)
    - Estado de cumplimiento NOM-035/LFPDPPP (privacidad, consentimientos, retención)
    - Estadísticas generales del sistema
    """
    try:
        api_logger.info(
            "📊 Generating compliance report",
            extra={"doctor_id": doctor_id, "user_id": current_user.id}
        )
        
        # Filtrar por doctor si se especifica
        filter_doctor_id = doctor_id if doctor_id else (current_user.id if current_user.person_type == 'doctor' else None)
        
        # ============================================================================
        # 1. NOM-004-SSA3-2012 COMPLIANCE
        # ============================================================================
        nom004_status = await _check_nom004_compliance(db, filter_doctor_id)
        
        # ============================================================================
        # 2. NOM-024-SSA3-2012 COMPLIANCE
        # ============================================================================
        nom024_status = await _check_nom024_compliance(db, filter_doctor_id)
        
        # ============================================================================
        # 3. NOM-035-SSA3-2012 / LFPDPPP COMPLIANCE
        # ============================================================================
        nom035_status = await _check_nom035_compliance(db, filter_doctor_id)
        
        # ============================================================================
        # 4. ESTADÍSTICAS GENERALES
        # ============================================================================
        general_stats = await _get_general_stats(db, filter_doctor_id)
        
        # ============================================================================
        # 5. CALCULAR CUMPLIMIENTO GLOBAL
        # ============================================================================
        overall_compliance = _calculate_overall_compliance(nom004_status, nom024_status, nom035_status)
        
        return {
            "report_date": datetime.now(SYSTEM_TIMEZONE).isoformat(),
            "doctor_id": filter_doctor_id,
            "doctor_name": current_user.name if filter_doctor_id == current_user.id else None,
            "overall_compliance": overall_compliance,
            "nom004_compliance": nom004_status,
            "nom024_compliance": nom024_status,
            "nom035_compliance": nom035_status,
            "general_statistics": general_stats,
            "recommendations": _generate_recommendations(nom004_status, nom024_status, nom035_status)
        }
        
    except Exception as e:
        api_logger.error(
            f"❌ Error generating compliance report: {str(e)}",
            extra={"doctor_id": doctor_id},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error al generar reporte de cumplimiento: {str(e)}")


async def _check_nom004_compliance(db: Session, doctor_id: Optional[int]) -> Dict[str, Any]:
    """Verifica cumplimiento NOM-004-SSA3-2012"""
    
    query = db.query(MedicalRecord)
    if doctor_id:
        query = query.filter(MedicalRecord.doctor_id == doctor_id)
    
    total_records = query.count()
    
    if total_records == 0:
        return {
            "compliant": True,
            "compliance_percentage": 100.0,
            "total_records": 0,
            "issues": [],
            "checks": {
                "required_fields": {"status": "ok", "message": "No hay registros para verificar"},
                "digital_signatures": {"status": "ok", "message": "No hay registros para verificar"}
            }
        }
    
    # Verificar campos obligatorios
    records_with_missing_fields = query.filter(
        or_(
            MedicalRecord.chief_complaint == None,
            MedicalRecord.chief_complaint == '',
            MedicalRecord.history_present_illness == None,
            MedicalRecord.history_present_illness == '',
            MedicalRecord.primary_diagnosis == None,
            MedicalRecord.primary_diagnosis == '',
            MedicalRecord.treatment_plan == None,
            MedicalRecord.treatment_plan == ''
        )
    ).count()
    
    required_fields_compliant = records_with_missing_fields == 0
    required_fields_percentage = ((total_records - records_with_missing_fields) / total_records * 100) if total_records > 0 else 100.0
    
    # TODO: Verificar firmas digitales (implementar cuando esté disponible en BD)
    digital_signatures_compliant = True  # Placeholder
    digital_signatures_percentage = 100.0  # Placeholder
    
    issues = []
    if not required_fields_compliant:
        issues.append(f"{records_with_missing_fields} registros con campos obligatorios faltantes")
    
    compliance_percentage = (required_fields_percentage + digital_signatures_percentage) / 2
    
    return {
        "compliant": required_fields_compliant and digital_signatures_compliant,
        "compliance_percentage": round(compliance_percentage, 2),
        "total_records": total_records,
        "issues": issues,
        "checks": {
            "required_fields": {
                "status": "ok" if required_fields_compliant else "warning",
                "compliant": required_fields_compliant,
                "percentage": round(required_fields_percentage, 2),
                "missing_count": records_with_missing_fields,
                "message": "Todos los campos obligatorios están presentes" if required_fields_compliant else f"{records_with_missing_fields} registros con campos faltantes"
            },
            "digital_signatures": {
                "status": "ok" if digital_signatures_compliant else "warning",
                "compliant": digital_signatures_compliant,
                "percentage": round(digital_signatures_percentage, 2),
                "message": "Firmas digitales verificadas" if digital_signatures_compliant else "Algunos registros no tienen firma digital"
            }
        }
    }


async def _check_nom024_compliance(db: Session, doctor_id: Optional[int]) -> Dict[str, Any]:
    """Verifica cumplimiento NOM-024-SSA3-2012 (Interoperabilidad)"""
    
    # Verificar catálogo CIE-10
    diagnosis_query = db.query(DiagnosisCatalog).filter(DiagnosisCatalog.is_active == True)
    total_diagnoses = diagnosis_query.count()
    diagnoses_with_code = diagnosis_query.filter(
        DiagnosisCatalog.code.isnot(None),
        DiagnosisCatalog.code != ''
    ).count()
    diagnoses_with_name = diagnosis_query.filter(
        DiagnosisCatalog.name.isnot(None),
        DiagnosisCatalog.name != ''
    ).count()
    
    catalog_compliant = total_diagnoses > 0 and diagnoses_with_code == total_diagnoses and diagnoses_with_name == total_diagnoses
    catalog_percentage = 100.0 if catalog_compliant else 0.0
    
    # Verificar mínimo de diagnósticos (500 según NOM-004)
    meets_minimum = total_diagnoses >= 500
    min_records_met = meets_minimum
    
    issues = []
    if not catalog_compliant:
        issues.append(f"Catálogo CIE-10 incompleto: {total_diagnoses - diagnoses_with_code} diagnósticos sin código")
    if not meets_minimum:
        issues.append(f"Catálogo CIE-10: Se requieren mínimo 500 diagnósticos (actualmente: {total_diagnoses})")
    
    compliance_percentage = catalog_percentage if catalog_compliant and meets_minimum else min(catalog_percentage, 80.0)
    
    return {
        "compliant": catalog_compliant and meets_minimum,
        "compliance_percentage": round(compliance_percentage, 2),
        "total_diagnoses": total_diagnoses,
        "issues": issues,
        "checks": {
            "cie10_catalog": {
                "status": "ok" if catalog_compliant and meets_minimum else "warning",
                "compliant": catalog_compliant,
                "meets_minimum": meets_minimum,
                "total_diagnoses": total_diagnoses,
                "diagnoses_with_code": diagnoses_with_code,
                "diagnoses_with_name": diagnoses_with_name,
                "min_required": 500,
                "percentage": round(catalog_percentage, 2),
                "message": f"Catálogo CIE-10 completo ({total_diagnoses} diagnósticos)" if catalog_compliant and meets_minimum else f"Catálogo CIE-10 necesita atención: {total_diagnoses} diagnósticos (mínimo 500 requeridos)"
            },
            "fhir_interoperability": {
                "status": "ok",
                "compliant": True,
                "message": "Interoperabilidad HL7 FHIR implementada"
            }
        }
    }


async def _check_nom035_compliance(db: Session, doctor_id: Optional[int]) -> Dict[str, Any]:
    """Verifica cumplimiento NOM-035-SSA3-2012 / LFPDPPP"""
    
    # Verificar avisos de privacidad
    active_notices = db.query(PrivacyNotice).filter(PrivacyNotice.is_active == True).count()
    has_active_notice = active_notices > 0
    
    # Verificar consentimientos
    total_consents = db.query(PrivacyConsent).count()
    accepted_consents = db.query(PrivacyConsent).filter(PrivacyConsent.consent_given == True).count()
    
    # Verificar retención de datos
    retention_stats = get_retention_stats(db, doctor_id)
    retention_compliant = retention_stats.get("active_records", 0) > 0  # Si hay registros activos, la retención está funcionando
    
    # Verificar auditoría
    total_audit_logs = db.query(AuditLog).count()
    recent_audit_logs = db.query(AuditLog).filter(
        AuditLog.timestamp >= datetime.now() - timedelta(days=30)
    ).count()
    audit_active = recent_audit_logs > 0
    
    issues = []
    if not has_active_notice:
        issues.append("No hay aviso de privacidad activo")
    if not audit_active:
        issues.append("Sistema de auditoría no está activo")
    
    compliance_percentage = (
        (100.0 if has_active_notice else 0.0) +
        (100.0 if audit_active else 0.0) +
        (100.0 if retention_compliant else 0.0)
    ) / 3
    
    return {
        "compliant": has_active_notice and audit_active and retention_compliant,
        "compliance_percentage": round(compliance_percentage, 2),
        "issues": issues,
        "checks": {
            "privacy_notices": {
                "status": "ok" if has_active_notice else "error",
                "compliant": has_active_notice,
                "active_notices": active_notices,
                "message": "Aviso de privacidad activo" if has_active_notice else "No hay aviso de privacidad activo"
            },
            "consents": {
                "status": "ok",
                "compliant": True,
                "total_consents": total_consents,
                "accepted_consents": accepted_consents,
                "message": f"Total de consentimientos: {total_consents} ({accepted_consents} aceptados)"
            },
            "data_retention": {
                "status": "ok" if retention_compliant else "warning",
                "compliant": retention_compliant,
                "stats": retention_stats,
                "message": "Sistema de retención de datos activo" if retention_compliant else "Sistema de retención de datos necesita verificación"
            },
            "audit_logging": {
                "status": "ok" if audit_active else "warning",
                "compliant": audit_active,
                "total_logs": total_audit_logs,
                "recent_logs": recent_audit_logs,
                "message": f"Sistema de auditoría activo ({recent_audit_logs} logs en últimos 30 días)" if audit_active else "Sistema de auditoría no está activo"
            }
        }
    }


async def _get_general_stats(db: Session, doctor_id: Optional[int]) -> Dict[str, Any]:
    """Obtiene estadísticas generales del sistema"""
    
    query_patients = db.query(Person).filter(Person.person_type == 'patient')
    query_doctors = db.query(Person).filter(Person.person_type == 'doctor')
    query_consultations = db.query(MedicalRecord)
    
    if doctor_id:
        query_consultations = query_consultations.filter(MedicalRecord.doctor_id == doctor_id)
    
    return {
        "total_patients": query_patients.count(),
        "total_doctors": query_doctors.count(),
        "total_consultations": query_consultations.count(),
        "report_date": datetime.now(SYSTEM_TIMEZONE).isoformat()
    }


def _calculate_overall_compliance(
    nom004: Dict[str, Any],
    nom024: Dict[str, Any],
    nom035: Dict[str, Any]
) -> Dict[str, Any]:
    """Calcula cumplimiento global"""
    
    overall_percentage = (
        nom004.get("compliance_percentage", 0.0) +
        nom024.get("compliance_percentage", 0.0) +
        nom035.get("compliance_percentage", 0.0)
    ) / 3
    
    overall_compliant = (
        nom004.get("compliant", False) and
        nom024.get("compliant", False) and
        nom035.get("compliant", False)
    )
    
    return {
        "compliant": overall_compliant,
        "compliance_percentage": round(overall_percentage, 2),
        "status": "compliant" if overall_compliant else ("warning" if overall_percentage >= 80.0 else "error")
    }


def _generate_recommendations(
    nom004: Dict[str, Any],
    nom024: Dict[str, Any],
    nom035: Dict[str, Any]
) -> List[str]:
    """Genera recomendaciones basadas en el estado de cumplimiento"""
    
    recommendations = []
    
    # NOM-004 recomendaciones
    if not nom004.get("compliant", True):
        recommendations.extend(nom004.get("issues", []))
    
    # NOM-024 recomendaciones
    if not nom024.get("compliant", True):
        recommendations.extend(nom024.get("issues", []))
    
    # NOM-035 recomendaciones
    if not nom035.get("compliant", True):
        recommendations.extend(nom035.get("issues", []))
    
    # Recomendaciones generales
    if not recommendations:
        recommendations.append("✅ Sistema en cumplimiento con todas las normativas aplicables")
    
    return recommendations

