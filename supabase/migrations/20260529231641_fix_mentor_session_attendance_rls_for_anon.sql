/*
  # Fix mentor session attendance RLS for anonymous mentor access

  1. Problem
    - Mentors authenticate via RPC (not Supabase Auth), so they use the anon/public role
    - `mentor_sessions` has a public access policy, but `mentor_session_attendance` only allows authenticated users
    - This causes the attendance insert to silently fail when recording sessions

  2. Changes
    - Add public INSERT policy on `mentor_session_attendance` so anon users (mentors) can record attendance
    - Add public SELECT policy so mentors can read attendance data
    - Keep existing authenticated policies for backwards compatibility

  3. Security
    - The insert is still constrained by the FK to mentor_sessions (session_id must exist)
    - The FK to students (student_id must exist) provides additional validation
*/

CREATE POLICY "Public insert for mentor session attendance"
  ON mentor_session_attendance
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mentor_sessions ms
      WHERE ms.id = mentor_session_attendance.session_id
    )
  );

CREATE POLICY "Public select for mentor session attendance"
  ON mentor_session_attendance
  FOR SELECT
  TO public
  USING (true);
