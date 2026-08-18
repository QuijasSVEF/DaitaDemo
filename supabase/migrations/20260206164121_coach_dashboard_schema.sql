/*
  # Coach Dashboard Schema & RLS Fixes

  1. RLS Fixes
    - Add public read policy on `coach_teacher_assignments` (coaches use custom auth, not Supabase Auth)
    - Add public read policy on `students` for coach data access

  2. New Tables
    - `coach_notes` - Coach notes on teachers/mentors
    - `coach_tags` - Tags for teachers/mentors (e.g. "needs support", "low dosage")
    - `coaching_goals` - Goals set for teachers/mentors

  3. Security
    - RLS enabled on all new tables with public CRUD policies
    - Coaches authenticate via custom RPC, not Supabase Auth, so auth.uid() is null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'coach_teacher_assignments' 
    AND policyname = 'Public read access for coach teacher assignments'
  ) THEN
    CREATE POLICY "Public read access for coach teacher assignments"
      ON coach_teacher_assignments FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'students' 
    AND policyname = 'Public read access for students'
  ) THEN
    CREATE POLICY "Public read access for students"
      ON students FOR SELECT USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id),
  target_type text NOT NULL CHECK (target_type IN ('teacher', 'mentor')),
  target_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_notes' AND policyname = 'Public read coach notes') THEN
    CREATE POLICY "Public read coach notes" ON coach_notes FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_notes' AND policyname = 'Public insert coach notes') THEN
    CREATE POLICY "Public insert coach notes" ON coach_notes FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_notes' AND policyname = 'Public update coach notes') THEN
    CREATE POLICY "Public update coach notes" ON coach_notes FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_notes' AND policyname = 'Public delete coach notes') THEN
    CREATE POLICY "Public delete coach notes" ON coach_notes FOR DELETE USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coach_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id),
  target_type text NOT NULL CHECK (target_type IN ('teacher', 'mentor')),
  target_id text NOT NULL,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coach_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_tags' AND policyname = 'Public read coach tags') THEN
    CREATE POLICY "Public read coach tags" ON coach_tags FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_tags' AND policyname = 'Public insert coach tags') THEN
    CREATE POLICY "Public insert coach tags" ON coach_tags FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coach_tags' AND policyname = 'Public delete coach tags') THEN
    CREATE POLICY "Public delete coach tags" ON coach_tags FOR DELETE USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS coaching_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id),
  target_type text NOT NULL CHECK (target_type IN ('teacher', 'mentor')),
  target_id text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE coaching_goals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coaching_goals' AND policyname = 'Public read coaching goals') THEN
    CREATE POLICY "Public read coaching goals" ON coaching_goals FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coaching_goals' AND policyname = 'Public insert coaching goals') THEN
    CREATE POLICY "Public insert coaching goals" ON coaching_goals FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coaching_goals' AND policyname = 'Public update coaching goals') THEN
    CREATE POLICY "Public update coaching goals" ON coaching_goals FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coaching_goals' AND policyname = 'Public delete coaching goals') THEN
    CREATE POLICY "Public delete coaching goals" ON coaching_goals FOR DELETE USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_id ON coach_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_target ON coach_notes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_coach_tags_coach_id ON coach_tags(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_tags_target ON coach_tags(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_coaching_goals_coach_id ON coaching_goals(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_goals_target ON coaching_goals(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_coaching_goals_status ON coaching_goals(status);
