
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
