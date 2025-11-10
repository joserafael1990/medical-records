-- Migration: Clean unspecified suffixes from diagnosis catalog entries
-- Rollback: Manually restore names/descriptions if needed (no automatic rollback)

BEGIN;

-- Remove trailing 'no especificada', 'no especificado', 'sin especificar' variants from diagnosis names
UPDATE diagnosis_catalog
SET name = REGEXP_REPLACE(
        name,
        '(?i)\s+(no\s+especific(?:ad[oa]s?|a?s?)|sin\s+especificar)$',
        '',
        'g'
    )
WHERE name ~* '(?i)\s+(no\s+especific(?:ad[oa]s?|a?s?)|sin\s+especificar)$';

-- Apply the same cleanup to descriptions when the suffix appears at the end
UPDATE diagnosis_catalog
SET description = REGEXP_REPLACE(
        description,
        '(?i)\s+(no\s+especific(?:ad[oa]s?|a?s?)|sin\s+especificar)$',
        '',
        'g'
    )
WHERE description ~* '(?i)\s+(no\s+especific(?:ad[oa]s?|a?s?)|sin\s+especificar)$';

COMMIT;
