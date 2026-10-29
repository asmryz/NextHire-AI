-- backend/database/seed_departments.sql
-- Owner: Shivani
-- Starting departments. Safe to run again: existing names are skipped.
-- Run once in Neon > SQL Editor (new empty editor).
INSERT INTO department (name, description) VALUES
  ('Engineering',      'Software development, QA and DevOps'),
  ('Human Resources',  'Recruitment, people and culture'),
  ('Finance',          'Accounts, payroll and budgeting'),
  ('Marketing',        'Brand, content and digital marketing'),
  ('Sales',            'Business development and client accounts'),
  ('Operations',       'Administration and day-to-day operations'),
  ('Analytics',        'Data analysis and reporting'),
  ('Customer Support', 'Customer service and helpdesk')
ON CONFLICT (name) DO NOTHING;

SELECT department_id, name FROM department ORDER BY name;
