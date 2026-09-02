/*
# Add mentor session attendance table and missing columns

Creates the mentor_session_attendance table for tracking student attendance
at mentor tutoring sessions, and adds missing columns to mentor_sessions.

1. Modified Tables
  - mentor_sessions: Add `timer_minutes` (integer, default 0)
  - mentor_sessions: Add `resource_used` (text, nullable)

2. New Tables
  - mentor_session_attendance: Records which students attended a session
    - id (uuid PK)
    - session_id (uuid FK to mentor_sessions, not null)
    - student_id (integer, not null)
    - present (boolean, default true)
    - created_at (timestamptz)

3. Security
  - RLS enabled on mentor_session_attendance
  - Open read/write for anon + authenticated (app uses custom auth)
*/

-- Add missing columns to mentor_sessions
ALTER TABLE mentor_sessions ADD COLUMN IF NOT EXISTS timer_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE mentor_sessions ADD COLUMN IF NOT EXISTS resource_used text;

-- Create mentor_session_attendance table
CREATE TABLE IF NOT EXISTS mentor_session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES mentor_sessions(id) ON DELETE CASCADE,
  student_id integer NOT NULL,
  present boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mentor_session_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msa_select" ON mentor_session_attendance;
CREATE POLICY "msa_select" ON mentor_session_attendance FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "msa_insert" ON mentor_session_attendance;
CREATE POLICY "msa_insert" ON mentor_session_attendance FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "msa_update" ON mentor_session_attendance;
CREATE POLICY "msa_update" ON mentor_session_attendance FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "msa_delete" ON mentor_session_attendance;
CREATE POLICY "msa_delete" ON mentor_session_attendance FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_msa_session ON mentor_session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_msa_student ON mentor_session_attendance(student_id);
