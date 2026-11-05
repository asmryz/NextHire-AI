-- backend/database/migration_004_gender_required.sql
-- Owner: Shivani
-- Gender is now required (Male / Female / Other) in every application form, and the
-- "Optional. Never used for scoring." line is removed. Gender is still never sent to the AI.
-- Safe to run more than once. Run ONCE in Neon > SQL Editor (new empty editor).
UPDATE form_field
   SET is_required = TRUE,
       options     = '["Male", "Female", "Other"]'::jsonb,
       help_text   = NULL
 WHERE field_key = 'gender';

-- Check
SELECT vacancy_id, label, is_required, options, help_text FROM form_field WHERE field_key = 'gender' ORDER BY vacancy_id;
