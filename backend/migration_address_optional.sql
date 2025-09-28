-- Migration: Make address fields optional
-- Description: Remove NOT NULL constraints from address fields in persons table

-- Make address fields optional (remove NOT NULL constraints if they exist)
-- Use IF EXISTS to avoid errors if constraints don't exist

DO $$
BEGIN
    -- address_street
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persons' 
        AND column_name = 'address_street' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE persons ALTER COLUMN address_street DROP NOT NULL;
    END IF;

    -- address_ext_number
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persons' 
        AND column_name = 'address_ext_number' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE persons ALTER COLUMN address_ext_number DROP NOT NULL;
    END IF;

    -- address_int_number
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persons' 
        AND column_name = 'address_int_number' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE persons ALTER COLUMN address_int_number DROP NOT NULL;
    END IF;

    -- address_neighborhood
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persons' 
        AND column_name = 'address_neighborhood' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE persons ALTER COLUMN address_neighborhood DROP NOT NULL;
    END IF;

    -- address_city
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persons' 
        AND column_name = 'address_city' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE persons ALTER COLUMN address_city DROP NOT NULL;
    END IF;

    -- address_state_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persons' 
        AND column_name = 'address_state_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE persons ALTER COLUMN address_state_id DROP NOT NULL;
    END IF;

    -- address_postal_code
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'persons' 
        AND column_name = 'address_postal_code' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE persons ALTER COLUMN address_postal_code DROP NOT NULL;
    END IF;
END $$;
