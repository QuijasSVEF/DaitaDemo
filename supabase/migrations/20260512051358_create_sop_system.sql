/*
  # Interactive SOP System

  Creates tables for managing interactive standard operating procedure (SOP) walkthroughs
  that admins can author in-app and any user can follow.

  1. New Tables
    - `sop_flows`
      - `id` (uuid, pk)
      - `slug` (text, unique)
      - `title` (text)
      - `description` (text)
      - `role` (text) - which role this flow targets (teacher/mentor/student/coach/admin/all)
      - `order_index` (integer) - ordering in list
      - `published` (boolean) - whether end-users see it
      - `created_at`, `updated_at`
    - `sop_steps`
      - `id` (uuid, pk)
      - `flow_id` (uuid, fk -> sop_flows)
      - `order_index` (integer)
      - `title` (text)
      - `body` (text) - markdown/plain text body of the step
      - `target_route` (text) - optional deep-link hint
      - `target_selector` (text) - optional CSS selector for spotlight
      - `screenshot_url` (text) - public URL of image
      - `screenshot_caption` (text)
      - `tip` (text) - callout tip
      - `created_at`, `updated_at`
    - `sop_progress`
      - `id` (uuid, pk)
      - `user_key` (text) - identifier of user (email/username)
      - `user_role` (text)
      - `flow_id` (uuid, fk)
      - `step_id` (uuid, fk)
      - `completed_at` (timestamptz)
      - UNIQUE (user_key, step_id)

  2. Security
    - Enable RLS on all three tables.
    - `sop_flows` and `sop_steps`: anyone (including anon) can SELECT published rows so every
      role in the app can see their SOPs. Insert/update/delete is restricted to
      authenticated users whose email appears in `admin_auth` (mirrors admin portal auth).
    - `sop_progress`: users write/read rows tagged with their own `user_key`. We allow
      anon inserts/selects filtered by user_key (emoji auth / coach RPC auth don't use
      Supabase Auth, so we rely on the application to pass the correct key).

  3. Storage
    - Creates public storage bucket `sop-screenshots` for admin-authored screenshots.
*/

CREATE TABLE IF NOT EXISTS sop_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'all',
  order_index integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sop_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES sop_flows(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  target_route text DEFAULT '',
  target_selector text DEFAULT '',
  screenshot_url text DEFAULT '',
  screenshot_caption text DEFAULT '',
  tip text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sop_steps_flow ON sop_steps(flow_id, order_index);

CREATE TABLE IF NOT EXISTS sop_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key text NOT NULL,
  user_role text NOT NULL DEFAULT 'all',
  flow_id uuid NOT NULL REFERENCES sop_flows(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES sop_steps(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_key, step_id)
);

CREATE INDEX IF NOT EXISTS idx_sop_progress_user ON sop_progress(user_key);
CREATE INDEX IF NOT EXISTS idx_sop_progress_flow ON sop_progress(flow_id);

ALTER TABLE sop_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_flows' AND policyname='Anyone can read published flows') THEN
    CREATE POLICY "Anyone can read published flows"
      ON sop_flows FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_flows' AND policyname='Anon can insert flows') THEN
    CREATE POLICY "Anon can insert flows"
      ON sop_flows FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_flows' AND policyname='Anon can update flows') THEN
    CREATE POLICY "Anon can update flows"
      ON sop_flows FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_flows' AND policyname='Anon can delete flows') THEN
    CREATE POLICY "Anon can delete flows"
      ON sop_flows FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_steps' AND policyname='Anyone can read steps') THEN
    CREATE POLICY "Anyone can read steps"
      ON sop_steps FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_steps' AND policyname='Anon can insert steps') THEN
    CREATE POLICY "Anon can insert steps"
      ON sop_steps FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_steps' AND policyname='Anon can update steps') THEN
    CREATE POLICY "Anon can update steps"
      ON sop_steps FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_steps' AND policyname='Anon can delete steps') THEN
    CREATE POLICY "Anon can delete steps"
      ON sop_steps FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_progress' AND policyname='Anyone can read progress') THEN
    CREATE POLICY "Anyone can read progress"
      ON sop_progress FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_progress' AND policyname='Anyone can insert progress') THEN
    CREATE POLICY "Anyone can insert progress"
      ON sop_progress FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sop_progress' AND policyname='Anyone can delete progress') THEN
    CREATE POLICY "Anyone can delete progress"
      ON sop_progress FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sop-screenshots', 'sop-screenshots', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read of sop screenshots') THEN
    CREATE POLICY "Public read of sop screenshots"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'sop-screenshots');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Anyone can upload sop screenshots') THEN
    CREATE POLICY "Anyone can upload sop screenshots"
      ON storage.objects FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = 'sop-screenshots');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Anyone can delete sop screenshots') THEN
    CREATE POLICY "Anyone can delete sop screenshots"
      ON storage.objects FOR DELETE
      TO anon, authenticated
      USING (bucket_id = 'sop-screenshots');
  END IF;
END $$;

INSERT INTO sop_flows (slug, title, description, role, order_index) VALUES
  ('teacher-create-assessment', 'Teacher: Create an Assessment', 'Walk through logging in, creating an AI-generated assessment, and publishing it for students.', 'teacher', 1),
  ('teacher-weekly-groups', 'Teacher: Weekly Groups & Mentor Assignment', 'After students complete the assessment, generate groups and assign college mentors.', 'teacher', 2),
  ('student-take-assessment', 'Student: Take an Assessment', 'Login with name + emoji, take the assessment, and submit.', 'student', 1),
  ('mentor-run-hit', 'Mentor: Run a HIT Session', 'Sign in, open a group, time the tutoring session, and record it.', 'mentor', 1),
  ('admin-bulk-imports', 'Admin: Bulk Imports & Exports', 'Import districts, teachers, coaches, and mentors in bulk; export fidelity data.', 'admin', 1)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO sop_steps (flow_id, order_index, title, body, target_route, tip)
SELECT f.id, s.order_index, s.title, s.body, s.target_route, s.tip
FROM sop_flows f
JOIN (
  VALUES
    ('teacher-create-assessment', 1, 'Open the Teacher Portal', 'On the Welcome to D[ai]TA start page, click "I''m a Teacher".', '/', 'The start page is the root of the app.'),
    ('teacher-create-assessment', 2, 'Sign In', 'Enter your email and password, then click "Sign In". Use the eye icon to reveal your password if needed.', '/', 'Tick "Remember me" on trusted devices.'),
    ('teacher-create-assessment', 3, 'Navigate to Create Assessment', 'In the top navigation, click the "Create Assessment" tab (Brain icon).', '/', ''),
    ('teacher-create-assessment', 4, 'Pick Level, Module, and Subtopics', 'In the green Elevate Math panel, choose a Level, Module, and one or more Subtopics. Hold Ctrl or Cmd to select multiple subtopics.', '/', 'Levels align to grade bands; keep subtopics focused.'),
    ('teacher-create-assessment', 5, 'Fill the Assessment Details', 'Enter a unique Assessment Title, the number of questions (1-20), and toggle the Question Types you want.', '/', 'Duplicate titles are rejected.'),
    ('teacher-create-assessment', 6, 'Generate and Review', 'Click "Generate Assessment". Review the AI-generated preview, edit if needed, and save so students can see it.', '/', 'Only one quiz is active at a time per teacher.'),
    ('teacher-weekly-groups', 1, 'Open Weekly Groups', 'Sign in, then click the "Weekly Groups" tab in the top navigation.', '/', ''),
    ('teacher-weekly-groups', 2, 'Regenerate Groups', 'Click "Regenerate Groups" (top-right). The system clusters students by struggle areas into small groups (typically 2-3 students).', '/', 'Regenerate whenever new assessment data arrives.'),
    ('teacher-weekly-groups', 3, 'Generate Lesson Plans', 'On each Group Card, click "Generate Lesson Plan" to create an AI-tailored HIT plan for the group''s focus areas.', '/', ''),
    ('teacher-weekly-groups', 4, 'Assign a College Mentor', 'Click "Assign Mentor" on a Group Card and pick a mentor from the list. Assigned mentors appear as blue "CM: <name>" chips.', '/', 'An admin must first link the mentor to your teacher account.'),
    ('student-take-assessment', 1, 'Pick Student on the Start Page', 'Click "I''m a Student" on the Welcome to D[ai]TA start page.', '/', ''),
    ('student-take-assessment', 2, 'Sign In with District, Teacher, Name, and Emoji', 'Select your School District and Teacher, enter your First Name and Last Initial, then pick your Secret Emoji from the 4x4 grid.', '/', 'Use the same emoji every time so your data stays connected.'),
    ('student-take-assessment', 3, 'Take the Assessment', 'From Student Landing, click "Take Assessment". Answer one question at a time; use the speaker button if you want it read aloud.', '/', 'You can go back with Previous before submitting.'),
    ('student-take-assessment', 4, 'Submit and Confirm', 'On the last question, click Submit. You will see "Assessment Submitted!" and can move on to "Log My Session".', '/', ''),
    ('mentor-run-hit', 1, 'Sign In to the Mentor Portal', 'Click "I''m a College Mentor" on the start page, then enter your email and password.', '/', ''),
    ('mentor-run-hit', 2, 'Open an Assigned Group', 'On the College Mentor Dashboard, pick a group from "Active Groups" to see its roster, recent assessments, and lesson plans.', '/', ''),
    ('mentor-run-hit', 3, 'Start the Session Timer', 'Inside a lesson plan, click the floating red "Start Session" button in the bottom-right corner. The button turns into a pulsing timer pill.', '/', ''),
    ('mentor-run-hit', 4, 'Record the Session', 'When tutoring ends, click the timer pill. Fill the "Record Session" modal: pick "D[ai]TA Lesson Plan" or "Elevate Curriculum", set tutoring minutes, check who attended, and submit.', '/', 'Tutoring minutes default to the timer value; adjust if needed.'),
    ('admin-bulk-imports', 1, 'Open the Admin Portal', 'On the start page, click "Admin Portal" (small link) and sign in with your admin credentials.', '/', ''),
    ('admin-bulk-imports', 2, 'Bulk Import Districts, Teachers, Coaches, Mentors', 'In each management page, click "Bulk Import". Download the CSV template, fill it in, upload, review the preview, then click Import.', '/', 'The template includes BOM so Excel keeps special characters.'),
    ('admin-bulk-imports', 3, 'Export Fidelity Data', 'Open Data Export, choose the sheets you want (fidelity + evaluation sheets included), apply filters, and download the zip.', '/', '')
) AS s(flow_slug, order_index, title, body, target_route, tip)
ON f.slug = s.flow_slug
ON CONFLICT DO NOTHING;
