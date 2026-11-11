
UPDATE form_field
   SET is_required = TRUE,
       options     = '["Male", "Female", "Other"]'::jsonb,
       help_text   = NULL
 WHERE field_key = 'gender';

-- Check
SELECT vacancy_id, label, is_required, options, help_text FROM form_field WHERE field_key = 'gender' ORDER BY vacancy_id;
