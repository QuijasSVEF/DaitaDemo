/*
  # Fidelity monitoring + end-of-program evaluation schema

  1. New Tables
    - mentor_session_attendance: per-student attendance per mentor session.
      Uses integer student_id; omits FK to students because students has a
      composite primary key (id, teacher_username). Integrity is handled via
      application code that only inserts known roster IDs.
  2. New Columns
    - mentor_sessions.time_manually_adjusted (generated boolean)
    - student_session_logs.mentor_session_id (nullable fk to mentor_sessions)
    - students.salesforce_id text
  3. Security
    - RLS on new table; mentors manage own rows; teachers read rows for their
      students; admin service role bypasses.
*/

CREATE TABLE IF NOT EXISTS public.mentor_session_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.mentor_sessions(id) ON DELETE CASCADE,
  student_id integer NOT NULL,
  present boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_mentor_session_attendance_session
  ON public.mentor_session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_mentor_session_attendance_student
  ON public.mentor_session_attendance(student_id);

ALTER TABLE public.mentor_session_attendance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mentor_session_attendance' AND policyname='Mentors read own session attendance') THEN
    CREATE POLICY "Mentors read own session attendance" ON public.mentor_session_attendance FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.mentor_sessions ms WHERE ms.id = mentor_session_attendance.session_id AND ms.mentor_id::text = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mentor_session_attendance' AND policyname='Mentors insert own session attendance') THEN
    CREATE POLICY "Mentors insert own session attendance" ON public.mentor_session_attendance FOR INSERT TO authenticated
      WITH CHECK (EXISTS (SELECT 1 FROM public.mentor_sessions ms WHERE ms.id = mentor_session_attendance.session_id AND ms.mentor_id::text = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mentor_session_attendance' AND policyname='Mentors update own session attendance') THEN
    CREATE POLICY "Mentors update own session attendance" ON public.mentor_session_attendance FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.mentor_sessions ms WHERE ms.id = mentor_session_attendance.session_id AND ms.mentor_id::text = auth.uid()::text))
      WITH CHECK (EXISTS (SELECT 1 FROM public.mentor_sessions ms WHERE ms.id = mentor_session_attendance.session_id AND ms.mentor_id::text = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mentor_session_attendance' AND policyname='Mentors delete own session attendance') THEN
    CREATE POLICY "Mentors delete own session attendance" ON public.mentor_session_attendance FOR DELETE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.mentor_sessions ms WHERE ms.id = mentor_session_attendance.session_id AND ms.mentor_id::text = auth.uid()::text));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='mentor_session_attendance' AND policyname='Teachers read attendance for own students') THEN
    CREATE POLICY "Teachers read attendance for own students" ON public.mentor_session_attendance FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = mentor_session_attendance.student_id AND s.teacher_username = (auth.jwt() ->> 'teacher_username')));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='mentor_sessions' AND column_name='time_manually_adjusted') THEN
    ALTER TABLE public.mentor_sessions ADD COLUMN time_manually_adjusted boolean
      GENERATED ALWAYS AS (COALESCE(tutoring_minutes,0) IS DISTINCT FROM COALESCE(timer_minutes,0)) STORED;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='student_session_logs' AND column_name='mentor_session_id') THEN
    ALTER TABLE public.student_session_logs ADD COLUMN mentor_session_id uuid REFERENCES public.mentor_sessions(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_student_session_logs_mentor_session ON public.student_session_logs(mentor_session_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='students' AND column_name='salesforce_id') THEN
    ALTER TABLE public.students ADD COLUMN salesforce_id text;
  END IF;
END $$;