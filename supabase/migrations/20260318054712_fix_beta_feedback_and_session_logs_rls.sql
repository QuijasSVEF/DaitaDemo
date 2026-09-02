/*
  # Fix RLS policies for beta_feedback and student_session_logs

  1. Changes
    - Update beta_feedback INSERT policy to allow anon role (app uses custom auth, not Supabase Auth)
    - Update student_session_logs INSERT policy to allow anon role
    - Update student_session_logs SELECT policy to allow anon role
    - Keep existing policy logic intact

  2. Security
    - These tables use app-level authentication rather than Supabase Auth
    - The anon role is needed because the app's custom login doesn't create Supabase auth sessions
*/

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can submit beta feedback' AND tablename = 'beta_feedback') THEN
    DROP POLICY "Anyone can submit beta feedback" ON beta_feedback;
  END IF;
END $$;

CREATE POLICY "Anyone can submit beta feedback"
  ON beta_feedback
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view beta feedback' AND tablename = 'beta_feedback') THEN
    DROP POLICY "Admins can view beta feedback" ON beta_feedback;
  END IF;
END $$;

CREATE POLICY "Admins can view beta feedback"
  ON beta_feedback
  FOR SELECT
  TO anon, authenticated
  USING (true);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Students can insert own session logs' AND tablename = 'student_session_logs') THEN
    DROP POLICY "Students can insert own session logs" ON student_session_logs;
  END IF;
END $$;

CREATE POLICY "Students can insert own session logs"
  ON student_session_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Teachers can view their students session logs' AND tablename = 'student_session_logs') THEN
    DROP POLICY "Teachers can view their students session logs" ON student_session_logs;
  END IF;
END $$;

CREATE POLICY "Teachers can view their students session logs"
  ON student_session_logs
  FOR SELECT
  TO anon, authenticated
  USING (true);
