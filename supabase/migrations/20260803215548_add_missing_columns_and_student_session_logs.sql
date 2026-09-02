/*
# Add missing columns and tables for coach/mentor/student flow

Adds missing columns that the app code references but don't yet exist in the database,
plus creates the student_session_logs table.

1. Modified Tables
  - coaching_goals: Add `visible_to_teacher` (boolean, default false)
  - coaching_goals: Add `visible_to_mentor` (boolean, default false)
  - quiz_templates: Add `em_level_code` (text, nullable)
  - quiz_templates: Add `em_module_id` (text, nullable)
  - quiz_templates: Add `em_subtopic_ids` (text[], nullable)

2. New Tables
  - student_session_logs: Records of student tutoring/session activities
    - id (uuid PK)
    - student_id (integer, not null)
    - teacher_username (text, not null)
    - session_date (date, default today)
    - session_type (text) - e.g. tutoring, assessment, practice
    - duration_minutes (integer)
    - notes (text)
    - focus_areas (text[])
    - mentor_id (uuid, nullable FK to college_mentors)
    - group_id (uuid, nullable FK to mentor_groups)
    - created_at (timestamptz)

3. Security
  - RLS enabled on student_session_logs
  - Open read/write for anon + authenticated (app uses custom auth, not Supabase auth)
*/

-- Add missing columns to coaching_goals
ALTER TABLE coaching_goals ADD COLUMN IF NOT EXISTS visible_to_teacher boolean NOT NULL DEFAULT false;
ALTER TABLE coaching_goals ADD COLUMN IF NOT EXISTS visible_to_mentor boolean NOT NULL DEFAULT false;

-- Add missing columns to quiz_templates
ALTER TABLE quiz_templates ADD COLUMN IF NOT EXISTS em_level_code text;
ALTER TABLE quiz_templates ADD COLUMN IF NOT EXISTS em_module_id text;
ALTER TABLE quiz_templates ADD COLUMN IF NOT EXISTS em_subtopic_ids text[];

-- Create student_session_logs table
CREATE TABLE IF NOT EXISTS student_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id integer NOT NULL,
  teacher_username text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  session_type text DEFAULT 'tutoring',
  duration_minutes integer,
  notes text,
  focus_areas text[],
  mentor_id uuid REFERENCES college_mentors(id),
  group_id uuid REFERENCES mentor_groups(id),
  next_steps text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE student_session_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ssl_select" ON student_session_logs;
CREATE POLICY "ssl_select" ON student_session_logs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ssl_insert" ON student_session_logs;
CREATE POLICY "ssl_insert" ON student_session_logs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ssl_update" ON student_session_logs;
CREATE POLICY "ssl_update" ON student_session_logs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ssl_delete" ON student_session_logs;
CREATE POLICY "ssl_delete" ON student_session_logs FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_ssl_student_teacher ON student_session_logs(student_id, teacher_username);
CREATE INDEX IF NOT EXISTS idx_ssl_session_date ON student_session_logs(session_date DESC);
