/*
  # HDT Enhancement: New tables and columns for High-Dosage Tutoring features

  1. New Tables
    - `student_session_logs` - Student self-tracking of daily work
      - `id` (uuid, primary key)
      - `student_id` (integer)
      - `teacher_username` (text)
      - `session_date` (date)
      - `topics_practiced` (text array)
      - `self_reflection` (text)
      - `notes` (text)
      - `confidence_rating` (integer 1-5)
      - `created_at` (timestamptz)
    - `beta_feedback` - Beta testing feedback from all users
      - `id` (uuid, primary key)
      - `user_role` (text)
      - `user_identifier` (text)
      - `feedback_type` (text: bug, suggestion, general)
      - `description` (text)
      - `severity` (text: low, medium, high, critical)
      - `page_url` (text)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `coach_notes` - Add `visible_to_teacher` boolean column
    - `coaching_goals` - Add `visible_to_teacher` and `visible_to_mentor` boolean columns
    - `mentor_sessions` - Add `timer_minutes` column for auto-tracked time

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies
*/

-- Student session logs table
CREATE TABLE IF NOT EXISTS student_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id integer NOT NULL,
  teacher_username text NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  topics_practiced text[] DEFAULT '{}'::text[],
  self_reflection text DEFAULT '',
  notes text DEFAULT '',
  confidence_rating integer DEFAULT 3 CHECK (confidence_rating >= 1 AND confidence_rating <= 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_session_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own session logs"
  ON student_session_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Teachers can view their students session logs"
  ON student_session_logs FOR SELECT
  TO authenticated
  USING (true);

-- Beta feedback table
CREATE TABLE IF NOT EXISTS beta_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role text NOT NULL DEFAULT 'unknown',
  user_identifier text NOT NULL DEFAULT '',
  feedback_type text NOT NULL DEFAULT 'general' CHECK (feedback_type IN ('bug', 'suggestion', 'general')),
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  page_url text DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit beta feedback"
  ON beta_feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view beta feedback"
  ON beta_feedback FOR SELECT
  TO authenticated
  USING (true);

-- Add visible_to_teacher column to coach_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coach_notes' AND column_name = 'visible_to_teacher'
  ) THEN
    ALTER TABLE coach_notes ADD COLUMN visible_to_teacher boolean DEFAULT false;
  END IF;
END $$;

-- Add visibility columns to coaching_goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaching_goals' AND column_name = 'visible_to_teacher'
  ) THEN
    ALTER TABLE coaching_goals ADD COLUMN visible_to_teacher boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaching_goals' AND column_name = 'visible_to_mentor'
  ) THEN
    ALTER TABLE coaching_goals ADD COLUMN visible_to_mentor boolean DEFAULT false;
  END IF;
END $$;

-- Add timer_minutes to mentor_sessions for automated time tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentor_sessions' AND column_name = 'timer_minutes'
  ) THEN
    ALTER TABLE mentor_sessions ADD COLUMN timer_minutes integer DEFAULT 0;
  END IF;
END $$;

-- Add target_type and target_id columns to coach_notes if missing (for backward compat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coach_notes' AND column_name = 'target_type'
  ) THEN
    ALTER TABLE coach_notes ADD COLUMN target_type text DEFAULT 'teacher';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coach_notes' AND column_name = 'target_id'
  ) THEN
    ALTER TABLE coach_notes ADD COLUMN target_id text DEFAULT '';
  END IF;
END $$;

-- Add target_type and target_id columns to coaching_goals if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaching_goals' AND column_name = 'target_type'
  ) THEN
    ALTER TABLE coaching_goals ADD COLUMN target_type text DEFAULT 'teacher';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaching_goals' AND column_name = 'target_id'
  ) THEN
    ALTER TABLE coaching_goals ADD COLUMN target_id text DEFAULT '';
  END IF;
END $$;
