/*
  # Add generation_status table for teacher-facing lesson plan / groups status

  1. New Tables
    - `generation_status`
      - `teacher_username` (text, primary key)
      - `phase` (text) — one of: idle, lesson_plans_generating, groups_cooling_down, ready, error
      - `students_pending` (int) — number of students whose lesson plans are still being generated
      - `lesson_plan_started_at` (timestamptz, nullable)
      - `lesson_plan_completed_at` (timestamptz, nullable) — used to compute groups cooldown
      - `groups_ready_at` (timestamptz, nullable) — when phase transitioned to ready
      - `last_message` (text, default '')
      - `updated_at` (timestamptz, default now())
  2. Security
    - Enable RLS on `generation_status`
    - Permissive read/write for authenticated and anon (the existing teacher-portal session model
      uses anon key + teacher_username scoping; matches existing tables like quiz_attempts)
*/

CREATE TABLE IF NOT EXISTS generation_status (
  teacher_username text PRIMARY KEY,
  phase text NOT NULL DEFAULT 'idle',
  students_pending integer NOT NULL DEFAULT 0,
  lesson_plan_started_at timestamptz,
  lesson_plan_completed_at timestamptz,
  groups_ready_at timestamptz,
  last_message text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE generation_status ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generation_status' AND policyname = 'gs_select'
  ) THEN
    CREATE POLICY "gs_select" ON generation_status FOR SELECT TO anon, authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generation_status' AND policyname = 'gs_insert'
  ) THEN
    CREATE POLICY "gs_insert" ON generation_status FOR INSERT TO anon, authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'generation_status' AND policyname = 'gs_update'
  ) THEN
    CREATE POLICY "gs_update" ON generation_status FOR UPDATE TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE generation_status;
