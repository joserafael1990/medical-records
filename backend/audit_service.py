"""
Audit Service - Complete Traceability System
Compliance: NOM-241-SSA1-2021, LFPDPPP, ISO 27001

Provides centralized audit logging for all system operations.
"""

from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from database import AuditLog, Person
from datetime import datetime
from fastapi import Request
from logger import get_logger

# Create logger for audit service
audit_logger = get_logger("cortex.audit")

# ============================================================================
# AUDIT SERVICE
# ============================================================================

class AuditService:
    """Servicio centralizado de auditoría para trazabilidad completa"""
    
    @staticmethod
    def log_action(
        db: Session,
        action: str,
        user: Optional[Person],
        request: Request,
        table_name: Optional[str] = None,
        record_id: Optional[int] = None,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None,
        operation_type: Optional[str] = None,
        affected_patient_id: Optional[int] = None,
        affected_patient_name: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        security_level: str = 'INFO',
        metadata: Optional[Dict] = None
    ):
        """
        Registra una acción en el log de auditoría
        
        Args:
            db: Sesión de base de datos
            action: Acción realizada (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)
            user: Usuario que realiza la acción (puede ser None para operaciones de sistema)
            request: Request de FastAPI para obtener IP, user-agent, etc.
            table_name: Nombre de la tabla afectada
            record_id: ID del registro afectado
            old_values: Valores antes del cambio
            new_values: Valores después del cambio
            operation_type: Tipo de operación (consultation_create, patient_update, etc.)
            affected_patient_id: ID del paciente afectado
            affected_patient_name: Nombre del paciente afectado
            success: Si la operación fue exitosa
            error_message: Mensaje de error si falló
            security_level: Nivel de seguridad (INFO, WARNING, CRITICAL)
            metadata: Metadatos adicionales
        """
        try:
            # Extraer información del request
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent", "")[:500]  # Limit length
            
            # Generar resumen de cambios
            changes_summary = AuditService._generate_changes_summary(old_values, new_values)
            
            # Crear registro de auditoría
            audit_entry = AuditLog(
                user_id=user.id if user else None,
                user_email=user.email if user else "SYSTEM",
                user_name=f"{user.first_name} {user.paternal_surname}" if user else "SYSTEM",
                user_type=user.person_type if user else "system",
                
                action=action,
                table_name=table_name,
                record_id=record_id,
                
                old_values=old_values,
                new_values=new_values,
                changes_summary=changes_summary,
                
                operation_type=operation_type,
                affected_patient_id=affected_patient_id,
                affected_patient_name=affected_patient_name,
                
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=request.headers.get("session-id"),
                request_path=str(request.url.path)[:500],  # Limit length
                request_method=request.method,
                
                success=success,
                error_message=error_message[:1000] if error_message else None,  # Limit length
                security_level=security_level,
                
                timestamp=datetime.utcnow(),
                metadata_json=metadata
            )
            
            db.add(audit_entry)
            db.commit()
            
            # Log crítico también en consola
            if security_level in ['WARNING', 'CRITICAL']:
                emoji = '⚠️' if security_level == 'WARNING' else '🚨'
                audit_logger.warning(
                    f"{emoji} [{security_level}] {action} by {user.email if user else 'SYSTEM'}: {changes_summary}",
                    user_id=user.id if user else None,
                    operation=operation_type,
                    ip=ip_address
                )
            
        except Exception as e:
            # Si falla la auditoría, no queremos romper la operación principal
            # Pero sí lo logueamos
            print(f"❌ Error al registrar auditoría: {str(e)}")
            audit_logger.error(f"Failed to create audit log: {str(e)}")
    
    @staticmethod
    def _generate_changes_summary(old_values: Optional[Dict], new_values: Optional[Dict]) -> str:
        """
        Genera un resumen legible de los cambios
        Máximo 500 caracteres para evitar registros muy largos
        """
        if not old_values and not new_values:
            return "Sin cambios"
        
        if not old_values:
            field_count = len(new_values) if new_values else 0
            return f"Creación de nuevo registro con {field_count} campos"
        
        if not new_values:
            return "Eliminación de registro"
        
        # Comparar valores
        changes = []
        for key in new_values:
            if key in old_values and old_values[key] != new_values[key]:
                old_val = str(old_values[key])[:50]  # Limit length
                new_val = str(new_values[key])[:50]
                changes.append(f"{key}: '{old_val}' → '{new_val}'")
        
        summary = "; ".join(changes) if changes else "Sin cambios detectados"
        return summary[:500]  # Limit total length
    
    # ========================================================================
    # MÉTODOS DE CONVENIENCIA PARA OPERACIONES COMUNES
    # ========================================================================
    
    @staticmethod
    def log_login(
        db: Session, 
        user: Optional[Person], 
        request: Request, 
        success: bool = True, 
        error: Optional[str] = None
    ):
        """Log de inicio de sesión"""
        AuditService.log_action(
            db=db,
            action="LOGIN",
            user=user if success else None,
            request=request,
            operation_type="authentication",
            success=success,
            error_message=error,
            security_level='WARNING' if not success else 'INFO',
            metadata={"login_attempt": True}
        )
    
    @staticmethod
    def log_logout(db: Session, user: Person, request: Request):
        """Log de cierre de sesión"""
        AuditService.log_action(
            db=db,
            action="LOGOUT",
            user=user,
            request=request,
            operation_type="authentication",
            success=True,
            security_level='INFO'
        )
    
    @staticmethod
    def log_access_denied(
        db: Session, 
        user: Optional[Person], 
        request: Request,
        resource: str,
        reason: str
    ):
        """Log de acceso denegado"""
        AuditService.log_action(
            db=db,
            action="ACCESS_DENIED",
            user=user,
            request=request,
            operation_type="authorization_failure",
            success=False,
            error_message=f"Access denied to {resource}: {reason}",
            security_level='WARNING',
            metadata={"resource": resource, "denial_reason": reason}
        )
    
    @staticmethod
    def log_consultation_create(
        db: Session,
        user: Person,
        consultation_id: int,
        patient_id: int,
        patient_name: str,
        request: Request,
        consultation_data: Dict
    ):
        """Log de creación de consulta"""
        # Sanitizar datos sensibles
        safe_data = {
            "patient_id": patient_id,
            "consultation_date": consultation_data.get("consultation_date", ""),
            "consultation_type": consultation_data.get("consultation_type", ""),
            "primary_diagnosis": consultation_data.get("primary_diagnosis", "")[:100]
        }
        
        AuditService.log_action(
            db=db,
            action="CREATE",
            user=user,
            request=request,
            table_name="medical_records",
            record_id=consultation_id,
            new_values=safe_data,
            operation_type="consultation_create",
            affected_patient_id=patient_id,
            affected_patient_name=patient_name,
            security_level='INFO'
        )
    
    @staticmethod
    def log_consultation_update(
        db: Session,
        user: Person,
        consultation_id: int,
        patient_id: int,
        patient_name: str,
        old_data: Dict,
        new_data: Dict,
        request: Request
    ):
        """Log de actualización de consulta"""
        AuditService.log_action(
            db=db,
            action="UPDATE",
            user=user,
            request=request,
            table_name="medical_records",
            record_id=consultation_id,
            old_values=old_data,
            new_values=new_data,
            operation_type="consultation_update",
            affected_patient_id=patient_id,
            affected_patient_name=patient_name,
            security_level='INFO'
        )
    
    @staticmethod
    def log_consultation_access(
        db: Session,
        user: Person,
        consultation_id: int,
        patient_name: str,
        request: Request
    ):
        """Log de acceso a consulta (lectura)"""
        AuditService.log_action(
            db=db,
            action="READ",
            user=user,
            request=request,
            table_name="medical_records",
            record_id=consultation_id,
            operation_type="consultation_access",
            affected_patient_name=patient_name,
            security_level='INFO'
        )
    
    @staticmethod
    def log_patient_create(
        db: Session,
        user: Person,
        patient_id: int,
        patient_data: Dict,
        request: Request
    ):
        """Log de creación de paciente"""
        # Datos seguros (sin información médica sensible)
        safe_data = {
            "first_name": patient_data.get("first_name", ""),
            "paternal_surname": patient_data.get("paternal_surname", ""),
            "email": patient_data.get("email", ""),
            "gender": patient_data.get("gender", "")
        }
        
        AuditService.log_action(
            db=db,
            action="CREATE",
            user=user,
            request=request,
            table_name="persons",
            record_id=patient_id,
            new_values=safe_data,
            operation_type="patient_create",
            affected_patient_id=patient_id,
            security_level='INFO'
        )
    
    @staticmethod
    def log_patient_update(
        db: Session,
        user: Person,
        patient_id: int,
        old_data: Dict,
        new_data: Dict,
        request: Request
    ):
        """Log de actualización de paciente"""
        AuditService.log_action(
            db=db,
            action="UPDATE",
            user=user,
            request=request,
            table_name="persons",
            record_id=patient_id,
            old_values=old_data,
            new_values=new_data,
            operation_type="patient_update",
            affected_patient_id=patient_id,
            security_level='INFO'
        )
    
    @staticmethod
    def log_prescription_create(
        db: Session,
        user: Person,
        prescription_id: int,
        consultation_id: int,
        medication_name: str,
        request: Request
    ):
        """Log de creación de prescripción"""
        AuditService.log_action(
            db=db,
            action="CREATE",
            user=user,
            request=request,
            table_name="consultation_prescriptions",
            record_id=prescription_id,
            new_values={"medication": medication_name, "consultation_id": consultation_id},
            operation_type="prescription_create",
            security_level='INFO'
        )
    
    @staticmethod
    def log_prescription_delete(
        db: Session,
        user: Person,
        prescription_id: int,
        medication_name: str,
        request: Request
    ):
        """Log de eliminación de prescripción"""
        AuditService.log_action(
            db=db,
            action="DELETE",
            user=user,
            request=request,
            table_name="consultation_prescriptions",
            record_id=prescription_id,
            old_values={"medication": medication_name},
            operation_type="prescription_delete",
            security_level='INFO'
        )
    
    @staticmethod
    def log_error(
        db: Session,
        user: Optional[Person],
        request: Request,
        error_message: str,
        operation_type: str,
        is_critical: bool = False
    ):
        """Log de error en operación"""
        AuditService.log_action(
            db=db,
            action="ERROR",
            user=user,
            request=request,
            operation_type=operation_type,
            success=False,
            error_message=error_message,
            security_level='CRITICAL' if is_critical else 'WARNING'
        )

# ============================================================================
# INSTANCIA GLOBAL
# ============================================================================

audit_service = AuditService()

def get_audit_service() -> AuditService:
    """Obtiene la instancia global del servicio de auditoría"""
    return audit_service

