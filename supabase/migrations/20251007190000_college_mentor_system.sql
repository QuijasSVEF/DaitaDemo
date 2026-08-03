/*
  # College Mentor Portal System - Database Schema

  ## Overview
  Creates a complete College Mentor system with secure authentication,
  group management, session reporting, and teacher-mentor integration.

  ## New Tables

  ### 1. `college_mentors`
  Stores college mentor accounts with authentication and profile information.

  ### 2. `mentor_groups`
  Represents student groups assigned to mentors for tutoring sessions.

  ### 3. `mentor_group_assignments`
  Links mentors to their assigned groups.

  ### 4. `mentor_group_students`
  Links students to mentor groups.

  ### 5. `mentor_sessions`
  Records each tutoring session with mentor feedback and data.

  ## Security
  - Row Level Security enabled on all tables
  - Mentors can only access their assigned groups and sessions
  - Teachers can view mentors assigned to their groups
  - Admins have full access
*/

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create college_mentors table
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

-- Create mentor_groups table
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

-- Create mentor_group_assignments table
CREATE TABLE IF NOT EXISTS mentor_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES college_mentors(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES mentor_groups(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by text,
  UNIQUE(mentor_id, group_id)
);

-- Create mentor_group_students table
CREATE TABLE IF NOT EXISTS mentor_group_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES mentor_groups(id) ON DELETE CASCADE,
  student_id integer NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, student_id)
);

-- Create mentor_sessions table
CREATE TABLE IF NOT EXISTS mentor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES college_mentors(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES mentor_groups(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  used_lesson_plan boolean NOT NULL,
  lesson_plan_comments text,
  curriculum_feedback text,
  tutoring_minutes integer NOT NULL CHECK (tutoring_minutes >= 0 AND tutoring_minutes <= 480),
  attendance_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
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

-- Enable Row Level Security
ALTER TABLE college_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_group_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for college_mentors
CREATE POLICY "Mentors can view own profile"
  ON college_mentors FOR SELECT
  TO authenticated
  USING (id = (SELECT id FROM college_mentors WHERE email = current_user));

CREATE POLICY "Mentors can update own profile"
  ON college_mentors FOR UPDATE
  TO authenticated
  USING (id = (SELECT id FROM college_mentors WHERE email = current_user))
  WITH CHECK (id = (SELECT id FROM college_mentors WHERE email = current_user));

-- RLS Policies for mentor_groups
CREATE POLICY "Mentors can view assigned groups"
  ON mentor_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mentor_group_assignments mga
      JOIN college_mentors cm ON mga.mentor_id = cm.id
      WHERE mga.group_id = mentor_groups.id
      AND cm.email = current_user
    )
  );

CREATE POLICY "Teachers can view own groups"
  ON mentor_groups FOR SELECT
  TO authenticated
  USING (
    teacher_username IN (
      SELECT username FROM teachers WHERE email = current_user
    )
  );

CREATE POLICY "Teachers can manage own groups"
  ON mentor_groups FOR ALL
  TO authenticated
  USING (
    teacher_username IN (
      SELECT username FROM teachers WHERE email = current_user
    )
  )
  WITH CHECK (
    teacher_username IN (
      SELECT username FROM teachers WHERE email = current_user
    )
  );

-- RLS Policies for mentor_group_assignments
CREATE POLICY "Mentors can view own assignments"
  ON mentor_group_assignments FOR SELECT
  TO authenticated
  USING (
    mentor_id IN (
      SELECT id FROM college_mentors WHERE email = current_user
    )
  );

CREATE POLICY "Teachers can view assignments for their groups"
  ON mentor_group_assignments FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM mentor_groups mg
      JOIN teachers t ON mg.teacher_username = t.username
      WHERE t.email = current_user
    )
  );

CREATE POLICY "Teachers can manage assignments for their groups"
  ON mentor_group_assignments FOR ALL
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM mentor_groups mg
      JOIN teachers t ON mg.teacher_username = t.username
      WHERE t.email = current_user
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT id FROM mentor_groups mg
      JOIN teachers t ON mg.teacher_username = t.username
      WHERE t.email = current_user
    )
  );

-- RLS Policies for mentor_group_students
CREATE POLICY "Mentors can view students in assigned groups"
  ON mentor_group_students FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT mga.group_id FROM mentor_group_assignments mga
      JOIN college_mentors cm ON mga.mentor_id = cm.id
      WHERE cm.email = current_user
    )
  );

CREATE POLICY "Teachers can manage students in own groups"
  ON mentor_group_students FOR ALL
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM mentor_groups mg
      JOIN teachers t ON mg.teacher_username = t.username
      WHERE t.email = current_user
    )
  )
  WITH CHECK (
    group_id IN (
      SELECT id FROM mentor_groups mg
      JOIN teachers t ON mg.teacher_username = t.username
      WHERE t.email = current_user
    )
  );

-- RLS Policies for mentor_sessions
CREATE POLICY "Mentors can view own sessions"
  ON mentor_sessions FOR SELECT
  TO authenticated
  USING (
    mentor_id IN (
      SELECT id FROM college_mentors WHERE email = current_user
    )
  );

CREATE POLICY "Mentors can create sessions for assigned groups"
  ON mentor_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    mentor_id IN (
      SELECT id FROM college_mentors WHERE email = current_user
    )
    AND group_id IN (
      SELECT mga.group_id FROM mentor_group_assignments mga
      JOIN college_mentors cm ON mga.mentor_id = cm.id
      WHERE cm.email = current_user
    )
  );

CREATE POLICY "Mentors can update own sessions"
  ON mentor_sessions FOR UPDATE
  TO authenticated
  USING (
    mentor_id IN (
      SELECT id FROM college_mentors WHERE email = current_user
    )
  )
  WITH CHECK (
    mentor_id IN (
      SELECT id FROM college_mentors WHERE email = current_user
    )
  );

CREATE POLICY "Teachers can view sessions for their groups"
  ON mentor_sessions FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT id FROM mentor_groups mg
      JOIN teachers t ON mg.teacher_username = t.username
      WHERE t.email = current_user
    )
  );

-- Function to authenticate college mentor
CREATE OR REPLACE FUNCTION authenticate_college_mentor(
  p_email text,
  p_password text
)
RETURNS TABLE(
  success boolean,
  message text,
  mentor json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mentor college_mentors%ROWTYPE;
  v_password_match boolean;
BEGIN
  SELECT * INTO v_mentor
  FROM college_mentors
  WHERE email = lower(p_email);

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid credentials'::text, NULL::json;
    RETURN;
  END IF;

  IF v_mentor.account_locked THEN
    RETURN QUERY SELECT false, 'Account is locked. Please contact administrator.'::text, NULL::json;
    RETURN;
  END IF;

  IF v_mentor.account_status != 'active' THEN
    RETURN QUERY SELECT false, 'Account is not active.'::text, NULL::json;
    RETURN;
  END IF;

  v_password_match := v_mentor.password_hash = crypt(p_password, v_mentor.password_hash);

  IF NOT v_password_match THEN
    UPDATE college_mentors
    SET
      failed_login_attempts = failed_login_attempts + 1,
      account_locked = CASE WHEN failed_login_attempts + 1 >= 5 THEN true ELSE false END,
      updated_at = now()
    WHERE id = v_mentor.id;

    RETURN QUERY SELECT false, 'Invalid credentials'::text, NULL::json;
    RETURN;
  END IF;

  UPDATE college_mentors
  SET
    failed_login_attempts = 0,
    last_login = now(),
    updated_at = now()
  WHERE id = v_mentor.id;

  RETURN QUERY SELECT
    true,
    'Login successful'::text,
    json_build_object(
      'id', v_mentor.id,
      'email', v_mentor.email,
      'full_name', v_mentor.full_name,
      'phone', v_mentor.phone,
      'university', v_mentor.university,
      'major', v_mentor.major
    );
END;
$$;

-- Function to create college mentor with hashed password
CREATE OR REPLACE FUNCTION create_college_mentor(
  p_email text,
  p_full_name text,
  p_password text,
  p_phone text DEFAULT NULL,
  p_university text DEFAULT NULL,
  p_major text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text,
  mentor_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mentor_id uuid;
  v_hashed_password text;
BEGIN
  v_hashed_password := crypt(p_password, gen_salt('bf'));

  INSERT INTO college_mentors (
    email,
    full_name,
    password_hash,
    phone,
    university,
    major,
    account_status,
    account_locked
  ) VALUES (
    lower(p_email),
    p_full_name,
    v_hashed_password,
    p_phone,
    p_university,
    p_major,
    'active',
    false
  )
  RETURNING id INTO v_mentor_id;

  RETURN QUERY SELECT
    true,
    'Mentor created successfully'::text,
    v_mentor_id;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT
      false,
      'A mentor with this email already exists'::text,
      NULL::uuid;
  WHEN OTHERS THEN
    RETURN QUERY SELECT
      false,
      'Failed to create mentor: ' || SQLERRM,
      NULL::uuid;
END;
$$;
