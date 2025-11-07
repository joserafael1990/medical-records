-- Migration: Make audit_trigger_function handle tables without created_by column
-- Date: 2025-01-07
-- Reason: appointments table no longer has created_by, but other tables still do

-- Update the general audit trigger function to handle tables with or without created_by
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    user_id_value INTEGER;
BEGIN
    -- Try to get created_by, fallback to doctor_id for appointments or NULL
    BEGIN
        IF TG_OP = 'DELETE' THEN
            user_id_value := OLD.created_by;
        ELSE
            user_id_value := NEW.created_by;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- If created_by doesn't exist, try doctor_id (for appointments)
        BEGIN
            IF TG_OP = 'DELETE' THEN
                user_id_value := OLD.doctor_id;
            ELSE
                user_id_value := NEW.doctor_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- If neither exists, use NULL
            user_id_value := NULL;
        END;
    END;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values,
            changes_summary, timestamp
        ) VALUES (
            user_id_value, NULL, NULL, 'system',
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
            user_id_value, NULL, NULL, 'system',
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
            user_id_value, NULL, NULL, 'system',
            'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW),
            'Record created', NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: This approach with exception handling might not work in PostgreSQL
-- because exceptions are caught at a different level. A better approach is
-- to check if the column exists first using information_schema.

-- Alternative: Use a safer approach that checks column existence
DROP FUNCTION IF EXISTS audit_trigger_function();

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    user_id_value INTEGER;
    has_created_by BOOLEAN;
    has_doctor_id BOOLEAN;
BEGIN
    -- Check if created_by column exists in the table
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND column_name = 'created_by'
        AND table_schema = TG_TABLE_SCHEMA
    ) INTO has_created_by;
    
    -- Check if doctor_id column exists (for appointments)
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = TG_TABLE_NAME 
        AND column_name = 'doctor_id'
        AND table_schema = TG_TABLE_SCHEMA
    ) INTO has_doctor_id;
    
    -- Determine user_id based on available columns
    IF TG_OP = 'DELETE' THEN
        IF has_created_by THEN
            user_id_value := (OLD).created_by;
        ELSIF has_doctor_id THEN
            user_id_value := (OLD).doctor_id;
        ELSE
            user_id_value := NULL;
        END IF;
    ELSE
        IF has_created_by THEN
            user_id_value := (NEW).created_by;
        ELSIF has_doctor_id THEN
            user_id_value := (NEW).doctor_id;
        ELSE
            user_id_value := NULL;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            user_id, user_email, user_name, user_type,
            action, table_name, record_id, old_values,
            changes_summary, timestamp
        ) VALUES (
            user_id_value, NULL, NULL, 'system',
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
            user_id_value, NULL, NULL, 'system',
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
            user_id_value, NULL, NULL, 'system',
            'INSERT', TG_TABLE_NAME, NEW.id, row_to_json(NEW),
            'Record created', NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Verification: The trigger should now work for both tables with created_by and tables without it
-- Test by inserting into appointments table

