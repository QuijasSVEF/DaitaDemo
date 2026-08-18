/*
# Add generation_status table for teacher-facing lesson plan / groups status

1. New Tables
  - `generation_status`
    - `teacher_username` (text, primary key)
    - `phase` (text) - idle, processing, ready, error
    - `students_pending` (int) - students awaiting lesson plans
    - `lesson_plan_started_at` (timestamptz, nullable)
    - `lesson_plan_completed_at` (timestamptz, nullable)
    - `groups_ready_at` (timestamptz, nullable)
    - `last_message` (text, default '')
    - `updated_at` (timestamptz, default now())
2. Security
  - Enable RLS
  - Permissive read/write for anon + authenticated (matches existing app auth model)
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

DROP POLICY IF EXISTS "gs_select" ON generation_status;
CREATE POLICY "gs_select" ON generation_status FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "gs_insert" ON generation_status;
CREATE POLICY "gs_insert" ON generation_status FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "gs_update" ON generation_status;
CREATE POLICY "gs_update" ON generation_status FOR UPDATE TO anon, authenticated
  USING (true) WITH CHECK (true);
