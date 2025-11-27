"""
Data Retention Service
======================

Manages data retention policies for LFPDPPP compliance.

Features:
- Calculate retention periods
- Schedule data for deletion
- Anonymize personal data
- Archive old records
- Enforce legal holds
- Audit retention actions

Author: CORTEX Medical Records System
Date: 2025-10-22
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, and_, or_, func
from logger import get_logger

logger = get_logger("cortex.data_retention")

# ============================================================================
# CONSTANTS
# ============================================================================

# Default retention periods (in years)
DEFAULT_MEDICAL_RECORD_RETENTION = 5  # NOM-004-SSA3-2012 requires 5 years minimum
DEFAULT_CONSENT_RETENTION = 5         # LFPDPPP recommended

# Anonymization strategies
ANONYMIZE_FULL = "full"           # Remove all PII
ANONYMIZE_PARTIAL = "partial"     # Keep aggregated data for statistics
ANONYMIZE_PSEUDONYMIZE = "pseudo" # Replace with pseudonyms

# ============================================================================
# RETENTION CALCULATION
# ============================================================================

def calculate_retention_end_date(
    base_date: datetime,
    retention_years: int = DEFAULT_MEDICAL_RECORD_RETENTION
) -> datetime:
    """
    Calculate the retention end date based on a base date
    
    Args:
        base_date: Starting date (consultation date, consent date, etc.)
        retention_years: Number of years to retain
        
    Returns:
        End date of retention period
    """
    return base_date + timedelta(days=365 * retention_years)


def get_days_until_expiration(retention_end_date: datetime) -> int:
    """
    Calculate days remaining until retention period expires
    
    Args:
        retention_end_date: End date of retention period
        
    Returns:
        Number of days until expiration (negative if already expired)
    """
    delta = retention_end_date - datetime.now()
    return delta.days


# ============================================================================
# RETENTION STATUS QUERIES
# ============================================================================

def get_retention_stats(db: Session, doctor_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Get statistics on data retention status
    
    Args:
        db: Database session
        doctor_id: Filter by doctor (None for all)
        
    Returns:
        Dictionary with retention statistics
    """
    try:
        # Base query
        query = """
        SELECT 
            COUNT(*) FILTER (WHERE retention_end_date IS NOT NULL AND is_anonymized = FALSE) as active_records,
            COUNT(*) FILTER (WHERE is_archived = TRUE) as archived_records,
            COUNT(*) FILTER (WHERE is_anonymized = TRUE) as anonymized_records,
            COUNT(*) FILTER (WHERE legal_hold = TRUE) as records_on_legal_hold,
            COUNT(*) FILTER (WHERE retention_end_date <= CURRENT_TIMESTAMP AND is_anonymized = FALSE AND legal_hold = FALSE) as ready_for_anonymization,
            COUNT(*) FILTER (WHERE retention_end_date <= CURRENT_TIMESTAMP + INTERVAL '30 days' AND is_anonymized = FALSE AND legal_hold = FALSE) as expiring_30_days,
            COUNT(*) FILTER (WHERE retention_end_date <= CURRENT_TIMESTAMP + INTERVAL '90 days' AND is_anonymized = FALSE AND legal_hold = FALSE) as expiring_90_days
        FROM medical_records
        """
        
        params = {}
        if doctor_id:
            query += " WHERE doctor_id = :doctor_id"
            params["doctor_id"] = doctor_id
        
        result = db.execute(text(query), params).fetchone()
        
        return {
            "active_records": result[0] or 0,
            "archived_records": result[1] or 0,
            "anonymized_records": result[2] or 0,
            "records_on_legal_hold": result[3] or 0,
            "ready_for_anonymization": result[4] or 0,
            "expiring_30_days": result[5] or 0,
            "expiring_90_days": result[6] or 0
        }
    except Exception as e:
        logger.error(f"Error getting retention stats: {str(e)}")
        return {
            "active_records": 0,
            "archived_records": 0,
            "anonymized_records": 0,
            "records_on_legal_hold": 0,
            "ready_for_anonymization": 0,
            "expiring_30_days": 0,
            "expiring_90_days": 0
        }


def get_expiring_records(
    db: Session,
    doctor_id: Optional[int] = None,
    days_threshold: int = 90,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Get records expiring within specified days
    
    Args:
        db: Database session
        doctor_id: Filter by doctor (None for all)
        days_threshold: Days threshold for expiration
        limit: Maximum records to return
        
    Returns:
        List of expiring records
    """
    try:
        query = """
        SELECT 
            id,
            patient_id,
            doctor_id,
            consultation_date,
            retention_end_date,
            is_archived,
            is_anonymized,
            legal_hold,
            EXTRACT(DAYS FROM (retention_end_date - CURRENT_TIMESTAMP)) as days_until_expiration
        FROM medical_records
        WHERE 
            retention_end_date IS NOT NULL 
            AND is_anonymized = FALSE 
            AND legal_hold = FALSE
            AND retention_end_date <= CURRENT_TIMESTAMP + INTERVAL ':days days'
        """
        
        params = {"days": days_threshold, "limit": limit}
        if doctor_id:
            query += " AND doctor_id = :doctor_id"
            params["doctor_id"] = doctor_id
        
        query += " ORDER BY retention_end_date ASC LIMIT :limit"
        
        result = db.execute(
            text(query),
            params
        ).fetchall()
        
        return [
            {
                "id": row[0],
                "patient_id": row[1],
                "doctor_id": row[2],
                "consultation_date": row[3],
                "retention_end_date": row[4],
                "is_archived": row[5],
                "is_anonymized": row[6],
                "legal_hold": row[7],
                "days_until_expiration": int(row[8]) if row[8] else 0
            }
            for row in result
        ]
    except Exception as e:
        logger.error(f"Error getting expiring records: {str(e)}")
        return []


# ============================================================================
# ANONYMIZATION
# ============================================================================

def anonymize_medical_record(
    db: Session,
    record_id: int,
    performed_by: int,
    reason: str = "retention_expired",
    strategy: str = ANONYMIZE_FULL
) -> bool:
    """
    Anonymize a medical record
    
    Args:
        db: Database session
        record_id: Medical record ID
        performed_by: User ID performing the action
        reason: Reason for anonymization
        strategy: Anonymization strategy
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Get current record data for snapshot
        record_query = text("""
            SELECT 
                id, patient_id, doctor_id, consultation_date,
                chief_complaint, primary_diagnosis
            FROM medical_records 
            WHERE id = :record_id AND is_anonymized = FALSE
        """)
        
        record = db.execute(record_query, {"record_id": record_id}).fetchone()
        
        if not record:
            logger.warning(f"Record {record_id} not found or already anonymized")
            return False
        
        # Check for legal hold
        legal_hold_check = text("""
            SELECT legal_hold FROM medical_records WHERE id = :record_id
        """)
        has_legal_hold = db.execute(
            legal_hold_check,
            {"record_id": record_id}
        ).fetchone()[0]
        
        if has_legal_hold:
            logger.warning(f"Cannot anonymize record {record_id}: legal hold active")
            return False
        
        # Create snapshot for audit trail (anonymized version)
        snapshot = {
            "record_id": record[0],
            "consultation_date": str(record[3]),
            "had_chief_complaint": bool(record[4]),
            "had_diagnosis": bool(record[5])
        }
        
        # Anonymize based on strategy
        if strategy == ANONYMIZE_FULL:
            # Full anonymization: replace with generic text
            anonymize_query = text("""
                UPDATE medical_records SET
                    chief_complaint = '[ANONYMIZED]',
                    history_present_illness = '[ANONYMIZED]',
                    family_history = '[ANONYMIZED]',
                    personal_pathological_history = '[ANONYMIZED]',
                    personal_non_pathological_history = '[ANONYMIZED]',
                    physical_examination = '[ANONYMIZED]',
                    primary_diagnosis = '[ANONYMIZED]',
                    secondary_diagnoses = '[ANONYMIZED]',
                    treatment_plan = '[ANONYMIZED]',
                    prognosis = '[ANONYMIZED]',
                    laboratory_results = '[ANONYMIZED]',
                    notes = '[ANONYMIZED]',
                    is_anonymized = TRUE,
                    anonymization_date = CURRENT_TIMESTAMP
                WHERE id = :record_id
            """)
        elif strategy == ANONYMIZE_PARTIAL:
            # Partial: keep diagnosis codes but remove narratives
            anonymize_query = text("""
                UPDATE medical_records SET
                    chief_complaint = NULL,
                    history_present_illness = NULL,
                    family_history = NULL,
                    personal_pathological_history = NULL,
                    personal_non_pathological_history = NULL,
                    physical_examination = NULL,
                    treatment_plan = NULL,
                    prognosis = NULL,
                    laboratory_results = NULL,
                    notes = NULL,
                    is_anonymized = TRUE,
                    anonymization_date = CURRENT_TIMESTAMP
                WHERE id = :record_id
            """)
        else:
            logger.error(f"Unknown anonymization strategy: {strategy}")
            return False
        
        db.execute(anonymize_query, {"record_id": record_id})
        
        # Log the action
        log_query = text("""
            INSERT INTO data_retention_logs (
                action_type, entity_type, entity_id, performed_by,
                reason, compliance_basis, is_automatic, data_snapshot
            ) VALUES (
                'anonymize', 'medical_record', :record_id, :performed_by,
                :reason, 'LFPDPPP', FALSE, :snapshot::jsonb
            )
        """)
        
        import json
        db.execute(log_query, {
            "record_id": record_id,
            "performed_by": performed_by,
            "reason": reason,
            "snapshot": json.dumps(snapshot)
        })
        
        db.commit()
        
        logger.info(
            f"✅ Anonymized medical record {record_id}",
            extra={
                "record_id": record_id,
                "performed_by": performed_by,
                "strategy": strategy,
                "reason": reason
            }
        )
        
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error anonymizing record {record_id}: {str(e)}")
        return False


def anonymize_expired_records(
    db: Session,
    performed_by: int,
    batch_size: int = 100
) -> Dict[str, Any]:
    """
    Anonymize all records past their retention period
    
    Args:
        db: Database session
        performed_by: User ID performing the action
        batch_size: Maximum records to process in one batch
        
    Returns:
        Dictionary with results
    """
    try:
        # Get expired records
        expired_query = text("""
            SELECT id FROM medical_records
            WHERE 
                retention_end_date <= CURRENT_TIMESTAMP
                AND is_anonymized = FALSE
                AND legal_hold = FALSE
            LIMIT :batch_size
        """)
        
        expired_records = db.execute(
            expired_query,
            {"batch_size": batch_size}
        ).fetchall()
        
        total = len(expired_records)
        success_count = 0
        failed_count = 0
        
        for record in expired_records:
            if anonymize_medical_record(
                db, record[0], performed_by,
                reason="retention_expired",
                strategy=ANONYMIZE_FULL
            ):
                success_count += 1
            else:
                failed_count += 1
        
        logger.info(
            f"📦 Batch anonymization complete: {success_count}/{total} successful",
            extra={
                "total": total,
                "success": success_count,
                "failed": failed_count,
                "performed_by": performed_by
            }
        )
        
        return {
            "total_processed": total,
            "success_count": success_count,
            "failed_count": failed_count
        }
        
    except Exception as e:
        logger.error(f"❌ Error in batch anonymization: {str(e)}")
        return {
            "total_processed": 0,
            "success_count": 0,
            "failed_count": 0,
            "error": str(e)
        }


# ============================================================================
# ARCHIVAL
# ============================================================================

def archive_medical_record(
    db: Session,
    record_id: int,
    performed_by: int
) -> bool:
    """
    Mark a medical record as archived (moved to cold storage)
    
    Args:
        db: Database session
        record_id: Medical record ID
        performed_by: User ID performing the action
        
    Returns:
        True if successful, False otherwise
    """
    try:
        archive_query = text("""
            UPDATE medical_records SET
                is_archived = TRUE,
                archived_date = CURRENT_TIMESTAMP
            WHERE id = :record_id AND is_archived = FALSE
        """)
        
        result = db.execute(archive_query, {"record_id": record_id})
        
        if result.rowcount == 0:
            logger.warning(f"Record {record_id} not found or already archived")
            return False
        
        # Log the action
        log_query = text("""
            INSERT INTO data_retention_logs (
                action_type, entity_type, entity_id, performed_by,
                reason, compliance_basis, is_automatic
            ) VALUES (
                'archive', 'medical_record', :record_id, :performed_by,
                'Moved to archive storage', 'NOM-004', FALSE
            )
        """)
        
        db.execute(log_query, {
            "record_id": record_id,
            "performed_by": performed_by
        })
        
        db.commit()
        
        logger.info(f"📦 Archived medical record {record_id}")
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error archiving record {record_id}: {str(e)}")
        return False


# ============================================================================
# LEGAL HOLD
# ============================================================================

def set_legal_hold(
    db: Session,
    record_id: int,
    performed_by: int,
    reason: str,
    enable: bool = True
) -> bool:
    """
    Set or remove legal hold on a medical record
    
    Args:
        db: Database session
        record_id: Medical record ID
        performed_by: User ID performing the action
        reason: Reason for legal hold
        enable: True to enable, False to remove
        
    Returns:
        True if successful, False otherwise
    """
    try:
        hold_query = text("""
            UPDATE medical_records SET
                legal_hold = :enable,
                legal_hold_reason = :reason
            WHERE id = :record_id
        """)
        
        db.execute(hold_query, {
            "record_id": record_id,
            "enable": enable,
            "reason": reason if enable else None
        })
        
        # Log the action
        log_query = text("""
            INSERT INTO data_retention_logs (
                action_type, entity_type, entity_id, performed_by,
                reason, compliance_basis, is_automatic
            ) VALUES (
                'legal_hold', 'medical_record', :record_id, :performed_by,
                :reason, 'Legal requirement', FALSE
            )
        """)
        
        db.execute(log_query, {
            "record_id": record_id,
            "performed_by": performed_by,
            "reason": f"{'Enabled' if enable else 'Removed'} legal hold: {reason}"
        })
        
        db.commit()
        
        action = "enabled" if enable else "removed"
        logger.info(f"⚖️ Legal hold {action} for record {record_id}: {reason}")
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error setting legal hold on record {record_id}: {str(e)}")
        return False


# ============================================================================
# RETENTION EXTENSION
# ============================================================================

def extend_retention(
    db: Session,
    record_id: int,
    performed_by: int,
    additional_years: int,
    reason: str
) -> bool:
    """
    Extend retention period for a medical record
    
    Args:
        db: Database session
        record_id: Medical record ID
        performed_by: User ID performing the action
        additional_years: Years to add to retention period
        reason: Reason for extension
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Get current retention date
        current_query = text("""
            SELECT retention_end_date FROM medical_records WHERE id = :record_id
        """)
        current_date = db.execute(current_query, {"record_id": record_id}).fetchone()
        
        if not current_date or not current_date[0]:
            logger.error(f"Record {record_id} has no retention date")
            return False
        
        previous_date = current_date[0]
        new_date = previous_date + timedelta(days=365 * additional_years)
        
        # Update retention date
        update_query = text("""
            UPDATE medical_records SET
                retention_end_date = :new_date
            WHERE id = :record_id
        """)
        
        db.execute(update_query, {
            "record_id": record_id,
            "new_date": new_date
        })
        
        # Log the action
        log_query = text("""
            INSERT INTO data_retention_logs (
                action_type, entity_type, entity_id, performed_by,
                previous_retention_date, new_retention_date, retention_years,
                reason, compliance_basis, is_automatic
            ) VALUES (
                'retention_extended', 'medical_record', :record_id, :performed_by,
                :previous_date, :new_date, :additional_years,
                :reason, 'NOM-004', FALSE
            )
        """)
        
        db.execute(log_query, {
            "record_id": record_id,
            "performed_by": performed_by,
            "previous_date": previous_date,
            "new_date": new_date,
            "additional_years": additional_years,
            "reason": reason
        })
        
        db.commit()
        
        logger.info(
            f"📅 Extended retention for record {record_id} by {additional_years} years",
            extra={
                "record_id": record_id,
                "previous_date": str(previous_date),
                "new_date": str(new_date),
                "reason": reason
            }
        )
        return True
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Error extending retention for record {record_id}: {str(e)}")
        return False


# ============================================================================
# RETENTION LOGS
# ============================================================================

def get_retention_logs(
    db: Session,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    action_type: Optional[str] = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Get retention action logs
    
    Args:
        db: Database session
        entity_type: Filter by entity type
        entity_id: Filter by entity ID
        action_type: Filter by action type
        limit: Maximum logs to return
        
    Returns:
        List of log entries
    """
    try:
        query = "SELECT * FROM data_retention_logs WHERE 1=1"
        params = {}
        
        if entity_type:
            query += " AND entity_type = :entity_type"
            params["entity_type"] = entity_type
        
        if entity_id:
            query += " AND entity_id = :entity_id"
            params["entity_id"] = entity_id
        
        if action_type:
            query += " AND action_type = :action_type"
            params["action_type"] = action_type
        
        query += " ORDER BY performed_at DESC LIMIT :limit"
        params["limit"] = limit
        
        result = db.execute(text(query), params).fetchall()
        
        return [
            {
                "id": row[0],
                "action_type": row[1],
                "entity_type": row[2],
                "entity_id": row[3],
                "performed_by": row[4],
                "performed_at": row[5],
                "reason": row[8],
                "is_automatic": row[10],
                "compliance_basis": row[11]
            }
            for row in result
        ]
        
    except Exception as e:
        logger.error(f"Error getting retention logs: {str(e)}")
        return []

