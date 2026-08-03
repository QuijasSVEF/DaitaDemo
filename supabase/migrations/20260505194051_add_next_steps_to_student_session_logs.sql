/*
  # Add next_steps column to student_session_logs

  1. Changes
    - Adds `next_steps` text array column to `student_session_logs` to store the focus
      areas students select for their next session (e.g. "Practicing more problems").

  2. Notes
    - Defaults to an empty array so existing rows remain valid.
    - No RLS changes: existing policies on student_session_logs already cover this column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_session_logs' AND column_name = 'next_steps'
  ) THEN
    ALTER TABLE student_session_logs
      ADD COLUMN next_steps text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;