-- ============================================================================
-- MIGRATION: Unify Name Fields
-- Description: Consolidate first_name, paternal_surname, maternal_surname 
--              into a single 'name' field for all persons (doctors and patients)
-- Date: 2025-11-10
-- ============================================================================

-- ============================================================================
-- PHASE 1: Add new 'name' column with temporary default
-- ============================================================================

ALTER TABLE persons 
ADD COLUMN name VARCHAR(300) DEFAULT '';

-- ============================================================================
-- PHASE 2: Migrate existing data
-- ============================================================================

-- Concatenate existing name fields into the new 'name' column
-- Format: first_name + paternal_surname + maternal_surname (if exists)
UPDATE persons 
SET name = TRIM(
  CONCAT_WS(' ', 
    TRIM(first_name), 
    TRIM(paternal_surname), 
    CASE 
      WHEN maternal_surname IS NOT NULL AND TRIM(maternal_surname) != '' 
      THEN TRIM(maternal_surname) 
      ELSE NULL 
    END
  )
)
WHERE first_name IS NOT NULL;

-- Verify no empty names exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM persons WHERE name = '' OR name IS NULL) THEN
    RAISE EXCEPTION 'Migration failed: Some persons have empty names after migration';
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: Make 'name' column NOT NULL and remove default
-- ============================================================================

ALTER TABLE persons 
ALTER COLUMN name SET NOT NULL;

ALTER TABLE persons 
ALTER COLUMN name DROP DEFAULT;

-- ============================================================================
-- PHASE 4: Drop old columns
-- ============================================================================

ALTER TABLE persons 
DROP COLUMN first_name,
DROP COLUMN paternal_surname,
DROP COLUMN maternal_surname;

-- Note: title column is kept separate for doctors (Dr., Dra., etc.)

-- ============================================================================
-- PHASE 5: Update audit_log table to reflect new schema
-- ============================================================================

-- The audit_log stores JSON with changed fields
-- Historical records will keep the old field names, but new changes will use 'name'
-- No structural changes needed to audit_log table itself

COMMENT ON COLUMN persons.name IS 'Full name of the person (replaces first_name, paternal_surname, maternal_surname)';
COMMENT ON COLUMN persons.title IS 'Professional title for doctors (Dr., Dra., etc.) - kept separate';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all persons have names
SELECT COUNT(*) as total_persons FROM persons;
SELECT COUNT(*) as persons_with_names FROM persons WHERE name IS NOT NULL AND name != '';

-- Sample of migrated data
SELECT id, person_type, title, name, email 
FROM persons 
LIMIT 10;

-- ============================================================================
-- ROLLBACK SCRIPT (use if migration needs to be reverted)
-- ============================================================================

/*
-- ROLLBACK INSTRUCTIONS:
-- This will attempt to restore the original three-field structure
-- Note: This is a best-effort restoration and may not perfectly recreate
-- the original data if names don't follow the expected pattern

-- Step 1: Add back the old columns
ALTER TABLE persons ADD COLUMN first_name VARCHAR(100);
ALTER TABLE persons ADD COLUMN paternal_surname VARCHAR(100);
ALTER TABLE persons ADD COLUMN maternal_surname VARCHAR(100);

-- Step 2: Attempt to split names back into components
-- This assumes names follow the pattern: "FirstName PaternalSurname MaternalSurname"
UPDATE persons SET 
  first_name = CASE 
    WHEN array_length(string_to_array(name, ' '), 1) >= 1 
    THEN string_to_array(name, ' ')[1] 
    ELSE name 
  END,
  paternal_surname = CASE 
    WHEN array_length(string_to_array(name, ' '), 1) >= 2 
    THEN string_to_array(name, ' ')[2] 
    ELSE '' 
  END,
  maternal_surname = CASE 
    WHEN array_length(string_to_array(name, ' '), 1) >= 3 
    THEN array_to_string(string_to_array(name, ' ')[3:], ' ')
    ELSE NULL 
  END;

-- Step 3: Make first_name and paternal_surname NOT NULL
ALTER TABLE persons ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE persons ALTER COLUMN paternal_surname SET NOT NULL;

-- Step 4: Drop the 'name' column
ALTER TABLE persons DROP COLUMN name;

-- Step 5: Remove comments
COMMENT ON COLUMN persons.first_name IS NULL;
COMMENT ON COLUMN persons.paternal_surname IS NULL;
COMMENT ON COLUMN persons.maternal_surname IS NULL;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

