-- Migration: Fix audit trigger for appointments table after removing created_by column
-- Date: 2025-01-07
-- Reason: The audit trigger was using NEW.created_by which no longer exists in appointments table

-- Drop the existing trigger
DROP TRIGGER IF EXISTS audit_appointments ON appointments;

-- Recreate the trigger function for appointments to use doctor_id instead of created_by
CREATE OR REPLACE FUNCTION audit_appointments_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values,
            changes_summary, timestamp
        ) VALUES (
            OLD.doctor_id, NULL, NULL, 'system',
            'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD),
            'Record deleted', NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values, new_values,
            changes_summary, timestamp
        ) VALUES (
            NEW.doctor_id, NULL, NULL, 'system',
            'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW),
            'Record updated', NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, new_values,
            changes_summary, timestamp
        ) VALUES (
            NEW.doctor_id, NULL, NULL, 'system',
            'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW),
            'Record created', NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER audit_appointments
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION audit_appointments_function();

-- Verification query (run after migration):
-- SELECT tgname, tgrelid::regclass, tgfoid::regproc 
-- FROM pg_trigger 
-- WHERE tgrelid = 'appointments'::regclass AND tgname = 'audit_appointments';
-- Should return 1 row

-- Rollback (if needed):
-- DROP TRIGGER IF EXISTS audit_appointments ON appointments;
-- DROP FUNCTION IF EXISTS audit_appointments_function();
-- -- Then recreate with the original function using created_by

