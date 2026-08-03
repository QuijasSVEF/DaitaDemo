/*
  # Fix Mentor Tables RLS Policies for Admin Portal Access

  ## Problem
  All mentor-related tables (mentor_teacher_assignments, mentor_groups, 
  mentor_group_assignments, mentor_group_students, mentor_sessions) only have 
  RLS policies for the `authenticated` role. The admin portal uses the anon key,
  so all operations (including assigning teachers to mentors) fail with 
  "new row violates row-level security policy".

  ## Changes
  Add public (all roles) CRUD policies to all 5 mentor-related tables:
  1. `mentor_teacher_assignments` - SELECT, INSERT, UPDATE, DELETE
  2. `mentor_groups` - SELECT, INSERT, UPDATE, DELETE
  3. `mentor_group_assignments` - SELECT, INSERT, UPDATE, DELETE
  4. `mentor_group_students` - SELECT, INSERT, UPDATE, DELETE
  5. `mentor_sessions` - SELECT, INSERT, UPDATE, DELETE

  ## Security Note
  Matches the existing pattern used by `teachers` and `college_mentors` tables.
  The admin portal authenticates via its own session management system.
*/

-- mentor_teacher_assignments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_teacher_assignments'::regclass
    AND polname = 'Public read access for mentor teacher assignments'
  ) THEN
    CREATE POLICY "Public read access for mentor teacher assignments"
      ON public.mentor_teacher_assignments FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_teacher_assignments'::regclass
    AND polname = 'Public insert access for mentor teacher assignments'
  ) THEN
    CREATE POLICY "Public insert access for mentor teacher assignments"
      ON public.mentor_teacher_assignments FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_teacher_assignments'::regclass
    AND polname = 'Public update access for mentor teacher assignments'
  ) THEN
    CREATE POLICY "Public update access for mentor teacher assignments"
      ON public.mentor_teacher_assignments FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_teacher_assignments'::regclass
    AND polname = 'Public delete access for mentor teacher assignments'
  ) THEN
    CREATE POLICY "Public delete access for mentor teacher assignments"
      ON public.mentor_teacher_assignments FOR DELETE USING (true);
  END IF;
END $$;

-- mentor_groups
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_groups'::regclass
    AND polname = 'Public read access for mentor groups'
  ) THEN
    CREATE POLICY "Public read access for mentor groups"
      ON public.mentor_groups FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_groups'::regclass
    AND polname = 'Public insert access for mentor groups'
  ) THEN
    CREATE POLICY "Public insert access for mentor groups"
      ON public.mentor_groups FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_groups'::regclass
    AND polname = 'Public update access for mentor groups'
  ) THEN
    CREATE POLICY "Public update access for mentor groups"
      ON public.mentor_groups FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_groups'::regclass
    AND polname = 'Public delete access for mentor groups'
  ) THEN
    CREATE POLICY "Public delete access for mentor groups"
      ON public.mentor_groups FOR DELETE USING (true);
  END IF;
END $$;

-- mentor_group_assignments
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_group_assignments'::regclass
    AND polname = 'Public read access for mentor group assignments'
  ) THEN
    CREATE POLICY "Public read access for mentor group assignments"
      ON public.mentor_group_assignments FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_group_assignments'::regclass
    AND polname = 'Public insert access for mentor group assignments'
  ) THEN
    CREATE POLICY "Public insert access for mentor group assignments"
      ON public.mentor_group_assignments FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_group_assignments'::regclass
    AND polname = 'Public update access for mentor group assignments'
  ) THEN
    CREATE POLICY "Public update access for mentor group assignments"
      ON public.mentor_group_assignments FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_group_assignments'::regclass
    AND polname = 'Public delete access for mentor group assignments'
  ) THEN
    CREATE POLICY "Public delete access for mentor group assignments"
      ON public.mentor_group_assignments FOR DELETE USING (true);
  END IF;
END $$;

-- mentor_group_students
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_group_students'::regclass
    AND polname = 'Public read access for mentor group students'
  ) THEN
    CREATE POLICY "Public read access for mentor group students"
      ON public.mentor_group_students FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_group_students'::regclass
    AND polname = 'Public insert access for mentor group students'
  ) THEN
    CREATE POLICY "Public insert access for mentor group students"
      ON public.mentor_group_students FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_group_students'::regclass
    AND polname = 'Public update access for mentor group students'
  ) THEN
    CREATE POLICY "Public update access for mentor group students"
      ON public.mentor_group_students FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_group_students'::regclass
    AND polname = 'Public delete access for mentor group students'
  ) THEN
    CREATE POLICY "Public delete access for mentor group students"
      ON public.mentor_group_students FOR DELETE USING (true);
  END IF;
END $$;

-- mentor_sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_sessions'::regclass
    AND polname = 'Public read access for mentor sessions'
  ) THEN
    CREATE POLICY "Public read access for mentor sessions"
      ON public.mentor_sessions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_sessions'::regclass
    AND polname = 'Public insert access for mentor sessions'
  ) THEN
    CREATE POLICY "Public insert access for mentor sessions"
      ON public.mentor_sessions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_sessions'::regclass
    AND polname = 'Public update access for mentor sessions'
  ) THEN
    CREATE POLICY "Public update access for mentor sessions"
      ON public.mentor_sessions FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.mentor_sessions'::regclass
    AND polname = 'Public delete access for mentor sessions'
  ) THEN
    CREATE POLICY "Public delete access for mentor sessions"
      ON public.mentor_sessions FOR DELETE USING (true);
  END IF;
END $$;
