-- ============================================================================
-- AUDIT LOG TABLE - Complete Traceability System
-- Compliance: NOM-241-SSA1-2021, LFPDPPP, ISO 27001
-- ============================================================================

-- Main audit log table
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    
    -- User information
    user_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    user_email VARCHAR(100),
    user_name VARCHAR(200),
    user_type VARCHAR(20), -- 'doctor', 'patient', 'admin', 'system'
    
    -- Action performed
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS_DENIED'
    table_name VARCHAR(50), -- Affected table
    record_id INTEGER, -- Affected record ID
    
    -- Change data
    old_values JSONB, -- Values before change
    new_values JSONB, -- Values after change
    changes_summary TEXT, -- Human-readable summary of changes
    
    -- Operation context
    operation_type VARCHAR(50), -- 'consultation_create', 'patient_update', 'prescription_delete', etc.
    affected_patient_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
    affected_patient_name VARCHAR(200),
    
    -- Session information
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    request_path VARCHAR(500),
    request_method VARCHAR(10), -- GET, POST, PUT, DELETE
    
    -- Security
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    security_level VARCHAR(20) DEFAULT 'INFO', -- 'INFO', 'WARNING', 'CRITICAL'
    
    -- Timestamps
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional metadata
    metadata JSONB
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_patient ON audit_log(affected_patient_id);
CREATE INDEX idx_audit_session ON audit_log(session_id);
CREATE INDEX idx_audit_security ON audit_log(security_level);
CREATE INDEX idx_audit_operation ON audit_log(operation_type);
CREATE INDEX idx_audit_success ON audit_log(success) WHERE NOT success;

-- View for critical audit events
CREATE VIEW critical_audit_events AS
SELECT 
    id,
    user_email,
    user_name,
    action,
    table_name,
    operation_type,
    affected_patient_name,
    timestamp,
    ip_address,
    security_level,
    error_message
FROM audit_log
WHERE security_level IN ('WARNING', 'CRITICAL')
ORDER BY timestamp DESC;

-- View for failed operations
CREATE VIEW failed_operations AS
SELECT 
    id,
    user_email,
    user_name,
    action,
    operation_type,
    error_message,
    timestamp,
    ip_address,
    security_level
FROM audit_log
WHERE NOT success
ORDER BY timestamp DESC;

-- View for patient data access
CREATE VIEW patient_data_access AS
SELECT 
    id,
    user_email,
    user_name,
    affected_patient_name,
    action,
    operation_type,
    timestamp,
    ip_address
FROM audit_log
WHERE affected_patient_id IS NOT NULL
ORDER BY timestamp DESC;

-- Permissions
GRANT SELECT, INSERT ON audit_log TO historias_user;
GRANT SELECT ON critical_audit_events TO historias_user;
GRANT SELECT ON failed_operations TO historias_user;
GRANT SELECT ON patient_data_access TO historias_user;

-- Comments
COMMENT ON TABLE audit_log IS 'Complete audit trail for all system operations';
COMMENT ON COLUMN audit_log.security_level IS 'INFO: Normal operation, WARNING: Suspicious activity, CRITICAL: Security breach or data violation';
COMMENT ON COLUMN audit_log.operation_type IS 'Specific business operation type for better categorization';
COMMENT ON COLUMN audit_log.changes_summary IS 'Human-readable summary of what changed, useful for reports';

-- Sample audit entries for testing
-- These will be inserted by the application, not in migration
-- Example:
-- INSERT INTO audit_log (user_email, user_name, user_type, action, operation_type, success, security_level, timestamp)
-- VALUES ('system@cortex.com', 'SYSTEM', 'system', 'MIGRATION', 'create_audit_table', TRUE, 'INFO', CURRENT_TIMESTAMP);

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- To rollback this migration:
-- DROP VIEW IF EXISTS patient_data_access CASCADE;
-- DROP VIEW IF EXISTS failed_operations CASCADE;
-- DROP VIEW IF EXISTS critical_audit_events CASCADE;
-- DROP TABLE IF EXISTS audit_log CASCADE;

