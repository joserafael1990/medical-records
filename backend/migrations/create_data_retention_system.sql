-- ============================================================================
-- MIGRATION: Data Retention and Anonymization System
-- Description: Implements data retention policies for LFPDPPP compliance
-- Author: CORTEX Medical Records System
-- Date: 2025-10-22
-- ============================================================================

-- ============================================================================
-- 1. EXTEND PRIVACY CONSENTS TABLE
-- ============================================================================

-- Add data retention fields to privacy_consents
ALTER TABLE privacy_consents 
ADD COLUMN IF NOT EXISTS data_retention_years INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS deletion_scheduled_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anonymization_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS anonymization_reason TEXT;

COMMENT ON COLUMN privacy_consents.data_retention_years IS 'Years to retain personal data (default: 5 years per NOM-004)';
COMMENT ON COLUMN privacy_consents.deletion_scheduled_date IS 'Scheduled date for data deletion after retention period';
COMMENT ON COLUMN privacy_consents.is_anonymized IS 'Whether the consent data has been anonymized';
COMMENT ON COLUMN privacy_consents.anonymization_date IS 'Date when data was anonymized';
COMMENT ON COLUMN privacy_consents.anonymization_reason IS 'Reason for anonymization (retention_expired, patient_request, etc)';

-- ============================================================================
-- 2. EXTEND MEDICAL RECORDS TABLE
-- ============================================================================

-- Add retention fields to medical_records
ALTER TABLE medical_records 
ADD COLUMN IF NOT EXISTS retention_end_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS anonymization_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS legal_hold_reason TEXT;

COMMENT ON COLUMN medical_records.retention_end_date IS 'Date when record retention period ends (5 years from last consultation)';
COMMENT ON COLUMN medical_records.is_archived IS 'Whether the record has been moved to archive storage';
COMMENT ON COLUMN medical_records.archived_date IS 'Date when record was archived';
COMMENT ON COLUMN medical_records.is_anonymized IS 'Whether the record has been anonymized';
COMMENT ON COLUMN medical_records.anonymization_date IS 'Date when record was anonymized';
COMMENT ON COLUMN medical_records.legal_hold IS 'Prevents deletion if under legal investigation';
COMMENT ON COLUMN medical_records.legal_hold_reason IS 'Reason for legal hold';

-- ============================================================================
-- 3. CREATE DATA RETENTION LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_retention_logs (
    id SERIAL PRIMARY KEY,
    
    -- Action tracking
    action_type VARCHAR(50) NOT NULL,  -- 'archive', 'anonymize', 'delete', 'legal_hold', 'retention_extended'
    entity_type VARCHAR(50) NOT NULL,  -- 'medical_record', 'patient', 'consent'
    entity_id INTEGER NOT NULL,
    
    -- Who performed the action
    performed_by INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Retention details
    previous_retention_date TIMESTAMP,
    new_retention_date TIMESTAMP,
    retention_years INTEGER,
    
    -- Action details
    reason TEXT,
    notes TEXT,
    
    -- Compliance
    is_automatic BOOLEAN DEFAULT FALSE,  -- Was this triggered automatically or manually
    compliance_basis VARCHAR(100),       -- 'LFPDPPP', 'NOM-004', 'patient_request', etc.
    
    -- Audit
    affected_records_count INTEGER DEFAULT 1,
    data_snapshot JSONB,  -- Snapshot of anonymized data before deletion
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE data_retention_logs IS 'Audit log for all data retention and anonymization actions';
COMMENT ON COLUMN data_retention_logs.action_type IS 'Type of retention action performed';
COMMENT ON COLUMN data_retention_logs.is_automatic IS 'Whether action was triggered by scheduled job';
COMMENT ON COLUMN data_retention_logs.compliance_basis IS 'Legal/regulatory basis for the action';
COMMENT ON COLUMN data_retention_logs.data_snapshot IS 'Anonymized snapshot of data before deletion (for audit trail)';

-- ============================================================================
-- 4. CREATE INDEXES
-- ============================================================================

-- Privacy consents indexes
CREATE INDEX IF NOT EXISTS idx_privacy_consents_deletion_scheduled 
ON privacy_consents(deletion_scheduled_date) 
WHERE deletion_scheduled_date IS NOT NULL AND is_anonymized = FALSE;

CREATE INDEX IF NOT EXISTS idx_privacy_consents_anonymized 
ON privacy_consents(is_anonymized, anonymization_date);

-- Medical records indexes
CREATE INDEX IF NOT EXISTS idx_medical_records_retention_end 
ON medical_records(retention_end_date) 
WHERE retention_end_date IS NOT NULL AND is_anonymized = FALSE;

CREATE INDEX IF NOT EXISTS idx_medical_records_archived 
ON medical_records(is_archived, archived_date);

CREATE INDEX IF NOT EXISTS idx_medical_records_anonymized 
ON medical_records(is_anonymized, anonymization_date);

CREATE INDEX IF NOT EXISTS idx_medical_records_legal_hold 
ON medical_records(legal_hold) 
WHERE legal_hold = TRUE;

-- Retention logs indexes
CREATE INDEX IF NOT EXISTS idx_retention_logs_action_type 
ON data_retention_logs(action_type, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_retention_logs_entity 
ON data_retention_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_retention_logs_performed_by 
ON data_retention_logs(performed_by, performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_retention_logs_automatic 
ON data_retention_logs(is_automatic, performed_at DESC);

-- ============================================================================
-- 5. CREATE VIEW FOR EXPIRING DATA
-- ============================================================================

CREATE OR REPLACE VIEW v_data_retention_expiring AS
SELECT 
    'medical_record' as entity_type,
    mr.id as entity_id,
    mr.patient_id,
    mr.doctor_id,
    mr.retention_end_date,
    mr.consultation_date,
    mr.is_archived,
    mr.is_anonymized,
    mr.legal_hold,
    EXTRACT(DAYS FROM (mr.retention_end_date - CURRENT_TIMESTAMP)) as days_until_expiration
FROM medical_records mr
WHERE 
    mr.retention_end_date IS NOT NULL 
    AND mr.is_anonymized = FALSE 
    AND mr.legal_hold = FALSE
    AND mr.retention_end_date <= CURRENT_TIMESTAMP + INTERVAL '90 days'
ORDER BY mr.retention_end_date ASC;

COMMENT ON VIEW v_data_retention_expiring IS 'Medical records expiring within 90 days';

-- ============================================================================
-- 6. CREATE VIEW FOR RETENTION STATISTICS
-- ============================================================================

CREATE OR REPLACE VIEW v_data_retention_stats AS
SELECT 
    COUNT(*) FILTER (WHERE retention_end_date IS NOT NULL AND is_anonymized = FALSE) as active_records,
    COUNT(*) FILTER (WHERE is_archived = TRUE) as archived_records,
    COUNT(*) FILTER (WHERE is_anonymized = TRUE) as anonymized_records,
    COUNT(*) FILTER (WHERE legal_hold = TRUE) as records_on_legal_hold,
    COUNT(*) FILTER (WHERE retention_end_date <= CURRENT_TIMESTAMP AND is_anonymized = FALSE AND legal_hold = FALSE) as records_ready_for_anonymization,
    COUNT(*) FILTER (WHERE retention_end_date <= CURRENT_TIMESTAMP + INTERVAL '30 days' AND is_anonymized = FALSE AND legal_hold = FALSE) as records_expiring_30_days,
    COUNT(*) FILTER (WHERE retention_end_date <= CURRENT_TIMESTAMP + INTERVAL '90 days' AND is_anonymized = FALSE AND legal_hold = FALSE) as records_expiring_90_days
FROM medical_records;

COMMENT ON VIEW v_data_retention_stats IS 'Statistics on data retention status';

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON data_retention_logs TO historias_user;
GRANT USAGE, SELECT ON SEQUENCE data_retention_logs_id_seq TO historias_user;
GRANT SELECT ON v_data_retention_expiring TO historias_user;
GRANT SELECT ON v_data_retention_stats TO historias_user;

-- ============================================================================
-- 8. INITIAL DATA SETUP
-- ============================================================================

-- Calculate retention dates for existing medical records (5 years from consultation date)
UPDATE medical_records 
SET retention_end_date = consultation_date + INTERVAL '5 years'
WHERE retention_end_date IS NULL;

-- Calculate deletion scheduled dates for existing consents (consent_date + retention_years)
UPDATE privacy_consents 
SET deletion_scheduled_date = consent_date + (data_retention_years || ' years')::INTERVAL
WHERE consent_date IS NOT NULL AND deletion_scheduled_date IS NULL;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- Show tables
\dt data_retention_logs

-- Show views
\dv v_data_retention_expiring
\dv v_data_retention_stats

-- Show retention stats
SELECT * FROM v_data_retention_stats;

-- Show expiring records (next 90 days)
SELECT * FROM v_data_retention_expiring LIMIT 10;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
-- To rollback this migration:

DROP VIEW IF EXISTS v_data_retention_stats;
DROP VIEW IF EXISTS v_data_retention_expiring;
DROP TABLE IF EXISTS data_retention_logs CASCADE;

ALTER TABLE privacy_consents 
DROP COLUMN IF EXISTS data_retention_years,
DROP COLUMN IF EXISTS deletion_scheduled_date,
DROP COLUMN IF EXISTS is_anonymized,
DROP COLUMN IF EXISTS anonymization_date,
DROP COLUMN IF EXISTS anonymization_reason;

ALTER TABLE medical_records 
DROP COLUMN IF EXISTS retention_end_date,
DROP COLUMN IF EXISTS is_archived,
DROP COLUMN IF EXISTS archived_date,
DROP COLUMN IF EXISTS is_anonymized,
DROP COLUMN IF EXISTS anonymization_date,
DROP COLUMN IF EXISTS legal_hold,
DROP COLUMN IF EXISTS legal_hold_reason;
*/

