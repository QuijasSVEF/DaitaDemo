/*
  # Restore College Mentor System
  
  1. New Tables
    - college_mentors: Mentor accounts
    - mentor_groups: Student groups for mentoring
    - mentor_group_assignments: Links mentors to groups
    - mentor_group_students: Links students to groups
    - mentor_sessions: Session reports
    - mentor_teacher_assignments: Direct mentor-teacher links
    
  2. Functions
    - authenticate_college_mentor: Login
    - create_college_mentor: Create account
    
  3. Security
    - RLS enabled on all tables
    - Public access policies for admin portal
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS college_mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  phone text,
  university text,
  major text,
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended')),
  account_locked boolean NOT NULL DEFAULT false,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mentor_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  description text,
  grade_level text,
  subject text NOT NULL DEFAULT 'Mathematics',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mentor_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES college_mentors(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES mentor_groups(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by text,
  UNIQUE(mentor_id, group_id)
);

CREATE TABLE IF NOT EXISTS mentor_group_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES mentor_groups(id) ON DELETE CASCADE,
  student_id integer NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, student_id)
);

CREATE TABLE IF NOT EXISTS mentor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES college_mentors(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES mentor_groups(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  resource_used text CHECK (resource_used IN ('lesson_plan', 'curriculum')),
  lesson_plan_comments text,
  curriculum_feedback text,
  tutoring_minutes integer NOT NULL CHECK (tutoring_minutes >= 0 AND tutoring_minutes <= 480),
  attendance_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mentor_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES college_mentors(id) ON DELETE CASCADE,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  assigned_by text DEFAULT 'admin',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  UNIQUE(mentor_id, teacher_username)
);

CREATE INDEX IF NOT EXISTS idx_college_mentors_email ON college_mentors(email);
CREATE INDEX IF NOT EXISTS idx_college_mentors_status ON college_mentors(account_status);
CREATE INDEX IF NOT EXISTS idx_mentor_groups_teacher ON mentor_groups(teacher_username);
CREATE INDEX IF NOT EXISTS idx_mentor_groups_status ON mentor_groups(status);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor ON mentor_group_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_group ON mentor_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_group ON mentor_group_students(group_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_student ON mentor_group_students(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_group ON mentor_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_date ON mentor_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_mentor_teacher_assignments_mentor ON mentor_teacher_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_teacher_assignments_teacher ON mentor_teacher_assignments(teacher_username);

ALTER TABLE college_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_group_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_teacher_assignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'college_mentors'::regclass AND polname = 'Public read access for college mentors') THEN CREATE POLICY "Public read access for college mentors" ON college_mentors FOR SELECT USING (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'college_mentors'::regclass AND polname = 'Public insert access for college mentors') THEN CREATE POLICY "Public insert access for college mentors" ON college_mentors FOR INSERT WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'college_mentors'::regclass AND polname = 'Public update access for college mentors') THEN CREATE POLICY "Public update access for college mentors" ON college_mentors FOR UPDATE USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'college_mentors'::regclass AND polname = 'Public delete access for college mentors') THEN CREATE POLICY "Public delete access for college mentors" ON college_mentors FOR DELETE USING (true); END IF; END $$;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'mentor_teacher_assignments'::regclass AND polname = 'Public access for mentor teacher assignments') THEN CREATE POLICY "Public access for mentor teacher assignments" ON mentor_teacher_assignments FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'mentor_groups'::regclass AND polname = 'Public access for mentor groups') THEN CREATE POLICY "Public access for mentor groups" ON mentor_groups FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'mentor_group_assignments'::regclass AND polname = 'Public access for mentor group assignments') THEN CREATE POLICY "Public access for mentor group assignments" ON mentor_group_assignments FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'mentor_group_students'::regclass AND polname = 'Public access for mentor group students') THEN CREATE POLICY "Public access for mentor group students" ON mentor_group_students FOR ALL USING (true) WITH CHECK (true); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'mentor_sessions'::regclass AND polname = 'Public access for mentor sessions') THEN CREATE POLICY "Public access for mentor sessions" ON mentor_sessions FOR ALL USING (true) WITH CHECK (true); END IF; END $$;

DROP FUNCTION IF EXISTS authenticate_college_mentor(text, text);
CREATE FUNCTION authenticate_college_mentor(p_email text, p_password text)
RETURNS TABLE(success boolean, message text, mentor json)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mentor college_mentors%ROWTYPE;
  v_password_match boolean;
BEGIN
  SELECT * INTO v_mentor FROM college_mentors WHERE email = lower(p_email);
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Invalid credentials'::text, NULL::json; RETURN; END IF;
  IF v_mentor.account_locked THEN RETURN QUERY SELECT false, 'Account is locked. Please contact administrator.'::text, NULL::json; RETURN; END IF;
  IF v_mentor.account_status != 'active' THEN RETURN QUERY SELECT false, 'Account is not active.'::text, NULL::json; RETURN; END IF;
  v_password_match := v_mentor.password_hash = crypt(p_password, v_mentor.password_hash);
  IF NOT v_password_match THEN
    UPDATE college_mentors SET failed_login_attempts = failed_login_attempts + 1, account_locked = CASE WHEN failed_login_attempts + 1 >= 5 THEN true ELSE false END, updated_at = now() WHERE id = v_mentor.id;
    RETURN QUERY SELECT false, 'Invalid credentials'::text, NULL::json; RETURN;
  END IF;
  UPDATE college_mentors SET failed_login_attempts = 0, last_login = now(), updated_at = now() WHERE id = v_mentor.id;
  RETURN QUERY SELECT true, 'Login successful'::text, json_build_object('id', v_mentor.id, 'email', v_mentor.email, 'full_name', v_mentor.full_name, 'phone', v_mentor.phone, 'university', v_mentor.university, 'major', v_mentor.major);
END;
$$;

DROP FUNCTION IF EXISTS create_college_mentor(text, text, text, text, text, text);
CREATE FUNCTION create_college_mentor(p_email text, p_full_name text, p_password text, p_phone text DEFAULT NULL, p_university text DEFAULT NULL, p_major text DEFAULT NULL)
RETURNS TABLE(success boolean, message text, mentor_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mentor_id uuid;
  v_hashed_password text;
BEGIN
  v_hashed_password := crypt(p_password, gen_salt('bf'));
  INSERT INTO college_mentors (email, full_name, password_hash, phone, university, major, account_status, account_locked) VALUES (lower(p_email), p_full_name, v_hashed_password, p_phone, p_university, p_major, 'active', false) RETURNING id INTO v_mentor_id;
  RETURN QUERY SELECT true, 'Mentor created successfully'::text, v_mentor_id;
EXCEPTION
  WHEN unique_violation THEN RETURN QUERY SELECT false, 'A mentor with this email already exists'::text, NULL::uuid;
  WHEN OTHERS THEN RETURN QUERY SELECT false, ('Failed to create mentor: ' || SQLERRM)::text, NULL::uuid;
END;
$$;
