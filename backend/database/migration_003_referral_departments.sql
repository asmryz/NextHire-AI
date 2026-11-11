

-- ---------- 1. Referral details
ALTER TABLE referral ADD COLUMN IF NOT EXISTS employee_email VARCHAR(255);
ALTER TABLE referral ADD COLUMN IF NOT EXISTS employee_phone VARCHAR(20);
ALTER TABLE referral ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE referral ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ---------- 2. Departments (existing names are skipped)
INSERT INTO department (name, description) VALUES
  ('Information Technology',       'IT support, networks, systems and infrastructure'),
  ('Software Development',         'Web, mobile and backend development'),
  ('Quality Assurance',            'Software testing and quality control'),
  ('Data Science',                 'Machine learning, data engineering and BI'),
  ('UI/UX Design',                 'Product, user interface and user experience design'),
  ('Graphic Design',               'Branding, print and digital graphics'),
  ('Animation & Motion Graphics',  '2D/3D animation, motion graphics and VFX'),
  ('Video Production',             'Video shooting, editing and post-production'),
  ('Content & Communications',     'Copywriting, content and public relations'),
  ('Accounting',                   'Bookkeeping, taxation and financial reporting'),
  ('Audit & Compliance',           'Internal audit, risk and compliance'),
  ('Legal',                        'Contracts, legal affairs and corporate law'),
  ('Administration',               'Office administration and facilities'),
  ('Procurement & Supply Chain',   'Purchasing, vendors and logistics'),
  ('Business Development',         'Partnerships, growth and new markets'),
  ('Product Management',           'Product planning, roadmap and delivery'),
  ('Project Management',           'Project planning, PMO and delivery'),
  ('Research & Development',       'Research, innovation and prototyping')
ON CONFLICT (name) DO NOTHING;

-- ---------- 3. Certifications have no minimum level
UPDATE vacancy_requirement SET min_value = NULL WHERE req_type = 'CERTIFICATION' AND min_value IS NOT NULL;

-- Check
SELECT column_name FROM information_schema.columns WHERE table_name = 'referral' ORDER BY ordinal_position;
SELECT COUNT(*) AS departments FROM department;
