

-- 1. New answer types (each line on its own; IF NOT EXISTS makes re-runs safe)
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'TEXTAREA';
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'EMAIL';
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'PHONE';
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'RADIO';
ALTER TYPE form_field_type ADD VALUE IF NOT EXISTS 'SELECT';

-- 2. Extra details on each question
ALTER TABLE form_field ADD COLUMN IF NOT EXISTS options     JSONB;               -- ["Male","Female",...] for RADIO / SELECT
ALTER TABLE form_field ADD COLUMN IF NOT EXISTS field_key   VARCHAR(40);         -- e.g. 'full_name', 'gender' (standard fields)
ALTER TABLE form_field ADD COLUMN IF NOT EXISTS is_standard BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE form_field ADD COLUMN IF NOT EXISTS section     VARCHAR(40) NOT NULL DEFAULT 'ROLE';
ALTER TABLE form_field ADD COLUMN IF NOT EXISTS help_text   VARCHAR(255);

-- 3. Check
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_name = 'form_field'
   AND column_name IN ('options', 'field_key', 'is_standard', 'section', 'help_text')
 ORDER BY column_name;
