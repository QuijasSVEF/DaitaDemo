-- ============================================================
-- COMPLETE DATABASE SCHEMA RECONSTRUCTION
-- Generated from Supabase migration files
-- ============================================================

-- ============================================================
-- SECTION 1: EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- SECTION 2: CORE TABLES
-- ============================================================

-- Teachers table (core authentication and user management)
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  name text NOT NULL,
  email text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz,
  district_id uuid,
  account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended')),
  account_locked boolean DEFAULT false,
  failed_login_attempts integer DEFAULT 0,
  password_hash text,
  temp_password boolean DEFAULT true,
  password_last_changed timestamptz,
  last_failed_login timestamptz,
  login_count integer DEFAULT 0,
  updated_by uuid
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id integer PRIMARY KEY,
  grade_level text NOT NULL,
  subject text NOT NULL,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  emoji text,
  is_active boolean DEFAULT true
);

-- Exit Tickets (assessments)
CREATE TABLE IF NOT EXISTS exit_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id integer NOT NULL,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  struggled_areas text[] DEFAULT '{}',
  last_lesson text,
  created_at timestamptz DEFAULT now()
);

-- Lesson Plans
CREATE TABLE IF NOT EXISTS lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id integer NOT NULL,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  objective text NOT NULL,
  engagement text[] NOT NULL,
  representation text[] NOT NULL,
  action_expression text[] NOT NULL,
  wrapup text[] NOT NULL,
  duration integer NOT NULL DEFAULT 25,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  detailed_activities jsonb,
  aligned_standards jsonb DEFAULT '[]',
  dok_levels jsonb DEFAULT '{"engagement": 1, "representation": 2, "action_expression": 3, "wrapup": 2}',
  exit_ticket_id uuid
);

-- Group Lesson Plans
CREATE TABLE IF NOT EXISTS group_lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id text NOT NULL,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  lesson_plan jsonb NOT NULL,
  student_ids integer[] NOT NULL,
  focus_areas text[] NOT NULL,
  unique_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Weekly Groups
CREATE TABLE IF NOT EXISTS weekly_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  group_name text NOT NULL,
  student_ids integer[] NOT NULL,
  lesson_plan_id uuid REFERENCES lesson_plans(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quiz Templates
CREATE TABLE IF NOT EXISTS quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  grade_level text NOT NULL,
  topic text NOT NULL,
  subtopics text[] DEFAULT '{}',
  num_questions integer NOT NULL DEFAULT 5,
  is_active boolean DEFAULT true,
  teacher_username text REFERENCES teachers(username) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  correct_answer text NOT NULL,
  incorrect_answers text[] DEFAULT '{}',
  explanation text,
  difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  subtopic text,
  created_at timestamptz DEFAULT now()
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
  student_id integer NOT NULL,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  answers jsonb NOT NULL,
  duration integer,
  start_time timestamptz,
  completion_time timestamptz,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- CA Standards (California Math Standards)
CREATE TABLE IF NOT EXISTS ca_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level text NOT NULL,
  subject text NOT NULL,
  standard_code text NOT NULL UNIQUE,
  domain text,
  cluster text,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Standards Alignments
CREATE TABLE IF NOT EXISTS standards_alignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id integer NOT NULL,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  standard_id uuid NOT NULL REFERENCES ca_standards(id) ON DELETE CASCADE,
  proficiency_level text CHECK (proficiency_level IN ('not_started', 'developing', 'proficient', 'advanced')),
  last_assessed timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 3: ADMIN TABLES
-- ============================================================

-- Admin Users
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Admin Sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now()
);

-- Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

-- Teacher Accounts (legacy, may be merged with teachers)
CREATE TABLE IF NOT EXISTS teacher_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  temp_password boolean DEFAULT true,
  password_last_changed timestamptz,
  account_locked boolean DEFAULT false,
  failed_login_attempts integer DEFAULT 0,
  last_failed_login timestamptz,
  last_login timestamptz,
  login_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

-- Teacher Sessions
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  user_agent text,
  ip_address text
);

-- Password Reset Requests
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teacher_accounts(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 4: SCHOOL DISTRICTS
-- ============================================================

CREATE TABLE IF NOT EXISTS school_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

-- ============================================================
-- SECTION 5: COLLEGE MENTOR SYSTEM
-- ============================================================

-- College Mentors
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

-- Mentor Groups
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

-- Mentor Group Assignments
CREATE TABLE IF NOT EXISTS mentor_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES college_mentors(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES mentor_groups(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by text,
  UNIQUE(mentor_id, group_id)
);

-- Mentor Group Students
CREATE TABLE IF NOT EXISTS mentor_group_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES mentor_groups(id) ON DELETE CASCADE,
  student_id integer NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, student_id)
);

-- Mentor Sessions
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
  resource text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Mentor Teacher Assignments
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

-- ============================================================
-- SECTION 6: COACH SYSTEM
-- ============================================================

-- Coaches
CREATE TABLE IF NOT EXISTS coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  account_locked boolean DEFAULT false
);

-- Coach Teacher Assignments
CREATE TABLE IF NOT EXISTS coach_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  teacher_username text REFERENCES teachers(username) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, teacher_username)
);

-- Coach Notes
CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id),
  target_type text NOT NULL CHECK (target_type IN ('teacher', 'mentor')),
  target_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Coach Tags
CREATE TABLE IF NOT EXISTS coach_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES coaches(id),
  target_type text NOT NULL CHECK (target_type IN ('teacher', 'mentor')),
  target_id text NOT NULL,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Coaching Goals
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

-- ============================================================
-- SECTION 7: ANALYTICS
-- ============================================================

-- Classroom Analytics
CREATE TABLE IF NOT EXISTS classroom_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  analytics_data jsonb NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Analytics Error Logs
CREATE TABLE IF NOT EXISTS analytics_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb,
  parameters jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 8: INDEXES
-- ============================================================

-- Teachers indexes
CREATE INDEX IF NOT EXISTS idx_teachers_district ON teachers(district_id);
CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);
CREATE INDEX IF NOT EXISTS idx_teachers_updated_by ON teachers(updated_by);

-- Students indexes
CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_username);
CREATE INDEX IF NOT EXISTS idx_students_id ON students(id);

-- Exit tickets indexes
CREATE INDEX IF NOT EXISTS idx_exit_tickets_student ON exit_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_exit_tickets_teacher ON exit_tickets(teacher_username);
CREATE INDEX IF NOT EXISTS idx_exit_tickets_created ON exit_tickets(created_at);

-- Lesson plans indexes
CREATE INDEX IF NOT EXISTS idx_lesson_plans_student ON lesson_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON lesson_plans(teacher_username);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_exit_ticket ON lesson_plans(exit_ticket_id);

-- Quiz indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_created ON quiz_attempts(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_template_id ON quiz_attempts(template_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_template_id ON quiz_questions(template_id);

-- Standards indexes
CREATE INDEX IF NOT EXISTS idx_ca_standards_grade_subject ON ca_standards(grade_level, subject);
CREATE INDEX IF NOT EXISTS idx_standards_alignments_standard_id ON standards_alignments(standard_id);
CREATE INDEX IF NOT EXISTS idx_standards_alignments_student_teacher ON standards_alignments(student_id, teacher_username);

-- Admin indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_teacher_accounts_created_by ON teacher_accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher_id ON teacher_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_teacher_id ON password_reset_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_coach_teacher_assignments_teacher_username ON coach_teacher_assignments(teacher_username);

-- School district indexes
CREATE INDEX IF NOT EXISTS idx_school_districts_created_by ON school_districts(created_by);

-- College mentor indexes
CREATE INDEX IF NOT EXISTS idx_college_mentors_email ON college_mentors(email);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor ON mentor_group_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_group ON mentor_group_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_mentor_students_group ON mentor_group_students(group_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_mentor ON mentor_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_group ON mentor_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_mentor_teacher_assignments_mentor ON mentor_teacher_assignments(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentor_teacher_assignments_teacher ON mentor_teacher_assignments(teacher_username);

-- Coach indexes
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_id ON coach_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_target ON coach_notes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_coach_tags_coach_id ON coach_tags(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_tags_target ON coach_tags(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_coaching_goals_coach_id ON coaching_goals(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_goals_target ON coaching_goals(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_coaching_goals_status ON coaching_goals(status);

-- Group lesson plans indexes
CREATE INDEX IF NOT EXISTS idx_weekly_groups_lesson_plan_id ON weekly_groups(lesson_plan_id);

-- ============================================================
-- SECTION 9: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ca_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards_alignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_group_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_group_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_error_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 10: ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Teachers policies
CREATE POLICY "Teachers can manage their students"
  ON students FOR ALL TO authenticated
  USING (
    ((SELECT auth.uid()))::text = teacher_username
    AND verify_teacher_status(teacher_username)
  )
  WITH CHECK (
    ((SELECT auth.uid()))::text = teacher_username
    AND verify_teacher_status(teacher_username)
  );

CREATE POLICY "Public read access for students"
  ON students FOR SELECT USING (true);

-- Exit tickets policies
CREATE POLICY "Teachers can manage exit tickets"
  ON exit_tickets FOR ALL TO authenticated
  USING (
    (teacher_username = ((SELECT auth.uid()))::text)
    AND (EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.username = ((SELECT auth.uid()))::text
      AND teachers.account_status = 'active'
      AND teachers.account_locked = false
    ))
  )
  WITH CHECK (
    (teacher_username = ((SELECT auth.uid()))::text)
    AND (EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.username = ((SELECT auth.uid()))::text
      AND teachers.account_status = 'active'
      AND teachers.account_locked = false
    ))
  );

CREATE POLICY "Enable insert for exit tickets"
  ON exit_tickets FOR INSERT WITH CHECK (true);

-- Lesson plans policies
CREATE POLICY "Public access to lesson plans"
  ON lesson_plans FOR ALL USING (true);

-- Group lesson plans policies
CREATE POLICY "Public access to group lesson plans"
  ON group_lesson_plans FOR ALL USING (true);

-- Weekly groups policies
CREATE POLICY "Teachers can manage weekly groups"
  ON weekly_groups FOR ALL TO authenticated
  USING (true);

-- Quiz templates policies
CREATE POLICY "Public can read quiz templates"
  ON quiz_templates FOR SELECT USING (true);

CREATE POLICY "Teachers can manage quiz templates by username"
  ON quiz_templates FOR ALL TO anon, authenticated
  USING (
    teacher_username IS NOT NULL
    AND (
      ((SELECT auth.email()) IS NOT NULL AND EXISTS (
        SELECT 1 FROM teachers
        WHERE teachers.username = quiz_templates.teacher_username
        AND teachers.email = (SELECT auth.email())
        AND teachers.account_status = 'active'
        AND teachers.account_locked = false
      ))
      OR (SELECT auth.email()) IS NULL
    )
  )
  WITH CHECK (
    teacher_username IS NOT NULL
    AND (
      ((SELECT auth.email()) IS NOT NULL AND EXISTS (
        SELECT 1 FROM teachers
        WHERE teachers.username = quiz_templates.teacher_username
        AND teachers.email = (SELECT auth.email())
        AND teachers.account_status = 'active'
        AND teachers.account_locked = false
      ))
      OR (SELECT auth.email()) IS NULL
    )
  );

-- Quiz questions policies
CREATE POLICY "Teachers can manage quiz questions"
  ON quiz_questions FOR ALL USING (true);

-- Quiz attempts policies
CREATE POLICY "Teachers can manage quiz attempts"
  ON quiz_attempts FOR ALL TO authenticated
  USING (
    teacher_username = ((SELECT auth.uid()))::text
    AND verify_teacher_username(teacher_username)
  )
  WITH CHECK (
    teacher_username = ((SELECT auth.uid()))::text
    AND verify_teacher_username(teacher_username)
  );

CREATE POLICY "Public can create quiz attempts"
  ON quiz_attempts FOR INSERT WITH CHECK (true);

-- CA Standards policies
CREATE POLICY "Public can read standards"
  ON ca_standards FOR SELECT USING (true);

-- Standards alignments policies
CREATE POLICY "Public access to standards alignments"
  ON standards_alignments FOR ALL USING (true);

-- Admin policies
CREATE POLICY "Admin users can manage all data"
  ON admin_users FOR ALL USING (true);

CREATE POLICY "Admin users can manage their sessions"
  ON admin_sessions FOR ALL TO authenticated
  USING (admin_id IN (
    SELECT admin_users.id FROM admin_users
    WHERE admin_users.email = ((SELECT auth.jwt()) ->> 'email'::text)
  ));

CREATE POLICY "Public can view audit logs"
  ON admin_audit_logs FOR SELECT USING (true);

-- Teacher accounts and sessions policies
CREATE POLICY "Public access to teacher accounts"
  ON teacher_accounts FOR ALL USING (true);

CREATE POLICY "Teachers can access their own sessions"
  ON teacher_sessions FOR ALL USING (true);

CREATE POLICY "Teachers can access their own reset requests"
  ON password_reset_requests FOR ALL
  USING (teacher_id IN (
    SELECT teacher_accounts.id FROM teacher_accounts
    WHERE teacher_accounts.username = ((SELECT auth.uid()))::text
  ));

-- School districts policies
CREATE POLICY "Admin users can manage districts"
  ON school_districts FOR ALL USING (true);

-- College mentor policies
CREATE POLICY "Public can view college mentors"
  ON college_mentors FOR SELECT USING (true);

CREATE POLICY "Public can manage college mentors"
  ON college_mentors FOR ALL USING (true);

CREATE POLICY "Public can view mentor groups"
  ON mentor_groups FOR SELECT USING (true);

CREATE POLICY "Public can manage mentor groups"
  ON mentor_groups FOR ALL USING (true);

CREATE POLICY "Public can view mentor assignments"
  ON mentor_group_assignments FOR SELECT USING (true);

CREATE POLICY "Public can manage mentor assignments"
  ON mentor_group_assignments FOR ALL USING (true);

CREATE POLICY "Public can view mentor students"
  ON mentor_group_students FOR SELECT USING (true);

CREATE POLICY "Public can manage mentor students"
  ON mentor_group_students FOR ALL USING (true);

CREATE POLICY "Public can view mentor sessions"
  ON mentor_sessions FOR SELECT USING (true);

CREATE POLICY "Public can create mentor sessions"
  ON mentor_sessions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update mentor sessions"
  ON mentor_sessions FOR UPDATE USING (true);

CREATE POLICY "Public can view mentor teacher assignments"
  ON mentor_teacher_assignments FOR SELECT USING (true);

CREATE POLICY "Public can manage mentor teacher assignments"
  ON mentor_teacher_assignments FOR ALL USING (true);

-- Coach policies
CREATE POLICY "Public can view coaches"
  ON coaches FOR SELECT USING (true);

CREATE POLICY "Public can manage coaches"
  ON coaches FOR ALL USING (true);

CREATE POLICY "Public read access for coach teacher assignments"
  ON coach_teacher_assignments FOR SELECT USING (true);

CREATE POLICY "Public can manage coach teacher assignments"
  ON coach_teacher_assignments FOR ALL USING (true);

CREATE POLICY "Public read coach notes"
  ON coach_notes FOR SELECT USING (true);

CREATE POLICY "Public insert coach notes"
  ON coach_notes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update coach notes"
  ON coach_notes FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete coach notes"
  ON coach_notes FOR DELETE USING (true);

CREATE POLICY "Public read coach tags"
  ON coach_tags FOR SELECT USING (true);

CREATE POLICY "Public insert coach tags"
  ON coach_tags FOR INSERT WITH CHECK (true);

CREATE POLICY "Public delete coach tags"
  ON coach_tags FOR DELETE USING (true);

CREATE POLICY "Public read coaching goals"
  ON coaching_goals FOR SELECT USING (true);

CREATE POLICY "Public insert coaching goals"
  ON coaching_goals FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update coaching goals"
  ON coaching_goals FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public delete coaching goals"
  ON coaching_goals FOR DELETE USING (true);

-- Analytics policies
CREATE POLICY "Teachers can manage analytics"
  ON classroom_analytics FOR ALL USING (true);

CREATE POLICY "Admins can read error logs"
  ON analytics_error_logs FOR SELECT TO authenticated USING (true);

-- ============================================================
-- SECTION 11: HELPER FUNCTIONS
-- ============================================================

-- Verify teacher username function
CREATE OR REPLACE FUNCTION verify_teacher_username(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teachers
    WHERE username = p_username
    AND account_status = 'active'
    AND account_locked = false
  );
END;
$$;

-- Verify teacher status function
CREATE OR REPLACE FUNCTION verify_teacher_status(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teachers
    WHERE username = p_username
    AND account_status = 'active'
    AND account_locked = false
  );
END;
$$;

-- ============================================================
-- SECTION 12: AUTHENTICATION FUNCTIONS
-- ============================================================

-- Handle teacher login
CREATE OR REPLACE FUNCTION handle_teacher_login(
  p_username TEXT,
  p_password TEXT,
  p_remember_me BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_account_locked BOOLEAN;
  v_failed_attempts INTEGER;
  v_temp_password BOOLEAN;
  v_password_hash TEXT;
  v_name TEXT;
BEGIN
  -- Get teacher info
  SELECT
    account_locked,
    failed_login_attempts,
    temp_password,
    password_hash,
    name
  INTO
    v_account_locked,
    v_failed_attempts,
    v_temp_password,
    v_password_hash,
    v_name
  FROM teachers
  WHERE username = p_username;

  -- Check if account exists
  IF NOT FOUND THEN
    -- Log failed attempt for non-existent account
    INSERT INTO admin_audit_logs (
      action,
      target_type,
      target_id,
      details,
      ip_address
    ) VALUES (
      'failed_login',
      'teacher',
      p_username,
      jsonb_build_object(
        'reason', 'account_not_found',
        'timestamp', now()
      ),
      inet_client_addr()
    );

    -- Use constant-time comparison even for non-existent accounts
    PERFORM crypt('dummy-password', gen_salt('bf'));

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;

  -- Check if account is locked
  IF v_account_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is locked. Please contact an administrator.'
    );
  END IF;

  -- Special case: If password is stored directly (temporary)
  IF v_password_hash = p_password THEN
    -- Hash the password properly for future use
    v_password_hash := crypt(p_password, gen_salt('bf'));

    -- Update the stored hash
    UPDATE teachers
    SET password_hash = v_password_hash
    WHERE username = p_username;
  END IF;

  -- Verify password using constant-time comparison
  IF v_password_hash IS NULL OR NOT (v_password_hash = crypt(p_password, v_password_hash)) THEN
    -- Increment failed attempts
    UPDATE teachers
    SET
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      -- Lock account after 5 failed attempts
      account_locked = CASE
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true
        ELSE false
      END,
      -- Update last failed attempt timestamp
      last_failed_login = now()
    WHERE username = p_username
    RETURNING failed_login_attempts INTO v_failed_attempts;

    -- Log failed attempt
    INSERT INTO admin_audit_logs (
      action,
      target_type,
      target_id,
      details,
      ip_address
    ) VALUES (
      'failed_login',
      'teacher',
      p_username,
      jsonb_build_object(
        'reason', 'invalid_password',
        'attempts', v_failed_attempts,
        'timestamp', now()
      ),
      inet_client_addr()
    );

    -- Return error with attempts remaining
    RETURN jsonb_build_object(
      'success', false,
      'message', CASE
        WHEN v_failed_attempts >= 5 THEN 'Account has been locked. Please contact an administrator.'
        ELSE format('Invalid credentials. %s attempts remaining.', 5 - v_failed_attempts)
      END
    );
  END IF;

  -- Successful login - update account info
  UPDATE teachers
  SET
    last_login = now(),
    login_count = COALESCE(login_count, 0) + 1,
    failed_login_attempts = 0,
    last_failed_login = NULL
  WHERE username = p_username;

  -- Log successful login
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'login',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'remember_me', p_remember_me,
      'temp_password', v_temp_password
    ),
    inet_client_addr()
  );

  -- Return success with teacher info
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Login successful',
    'teacher', jsonb_build_object(
      'username', p_username,
      'name', v_name
    )
  );
END;
$$;

-- Reset teacher password
CREATE OR REPLACE FUNCTION reset_teacher_password(
  p_username TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_temp_password TEXT;
  v_password_hash TEXT;
BEGIN
  -- Generate random temporary password (8 characters)
  v_temp_password := substr(md5(random()::text || clock_timestamp()::text), 1, 8);

  -- Hash the temporary password
  v_password_hash := crypt(v_temp_password, gen_salt('bf'));

  -- Update teacher account
  UPDATE teachers
  SET
    password_hash = v_password_hash,
    temp_password = true,
    password_last_changed = NULL,
    failed_login_attempts = 0,
    account_locked = false
  WHERE username = p_username;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Log password reset
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'reset_password',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', true
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password reset successfully',
    'temp_password', v_temp_password
  );
END;
$$;

-- Update teacher password
CREATE OR REPLACE FUNCTION update_teacher_password(
  p_username TEXT,
  p_new_password TEXT,
  p_temp_password BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_teacher_exists BOOLEAN;
  v_password_hash TEXT;
BEGIN
  -- Check if teacher exists
  SELECT EXISTS (
    SELECT 1 FROM teachers WHERE username = p_username
  ) INTO v_teacher_exists;

  IF NOT v_teacher_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Hash the password
  v_password_hash := crypt(p_new_password, gen_salt('bf'));

  -- Update the password
  UPDATE teachers
  SET
    password_hash = v_password_hash,
    temp_password = p_temp_password,
    password_last_changed = CASE
      WHEN p_temp_password THEN NULL
      ELSE now()
    END,
    failed_login_attempts = 0,
    account_locked = false
  WHERE username = p_username;

  -- Log the password update
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'update_password',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', p_temp_password
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password updated successfully'
  );
END;
$$;

-- Authenticate college mentor
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
SET search_path = public, extensions
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

-- Authenticate coach
CREATE OR REPLACE FUNCTION authenticate_coach(
  p_email text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_coach coaches;
BEGIN
  -- Get coach by email
  SELECT * INTO v_coach
  FROM coaches
  WHERE email = p_email;

  -- Check if coach exists and password matches
  IF v_coach.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;

  -- Check if account is locked
  IF v_coach.account_locked THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is locked'
    );
  END IF;

  -- Verify password
  IF v_coach.password_hash = crypt(p_password, v_coach.password_hash) THEN
    -- Update last login
    UPDATE coaches
    SET last_login = now()
    WHERE id = v_coach.id;

    RETURN json_build_object(
      'success', true,
      'coach', json_build_object(
        'id', v_coach.id,
        'email', v_coach.email,
        'full_name', v_coach.full_name
      )
    );
  END IF;

  RETURN json_build_object(
    'success', false,
    'message', 'Invalid credentials'
  );
END;
$$;

-- ============================================================
-- SECTION 13: LESSON PLAN GENERATION FUNCTIONS
-- ============================================================

-- Generate AI lesson plan (placeholder - actual AI integration would be separate)
CREATE OR REPLACE FUNCTION generate_ai_lesson_plan(
  p_grade_level TEXT,
  p_last_lesson TEXT,
  p_struggled_areas TEXT[],
  p_teacher_username TEXT,
  p_student_id INTEGER,
  p_exit_ticket_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_standard_id UUID;
  v_standard_code TEXT;
  v_standard_description TEXT;
  v_lesson_plan jsonb;
  v_struggle_area TEXT;
BEGIN
  -- Get the primary struggle area
  SELECT COALESCE(p_struggled_areas[1], 'mathematical concepts') INTO v_struggle_area;

  -- Find the most relevant standard
  SELECT
    id,
    standard_code,
    description
  INTO
    v_standard_id,
    v_standard_code,
    v_standard_description
  FROM ca_standards
  WHERE grade_level = p_grade_level
  AND subject = 'Mathematics'
  LIMIT 1;

  -- Generate lesson plan structure
  v_lesson_plan := jsonb_build_object(
    'objective', 'Master ' || array_to_string(p_struggled_areas, ' and ') || ' through personalized learning strategies',
    'engagement', ARRAY[
      'Interactive exploration using manipulatives to visualize ' || v_struggle_area,
      'Guided discovery with real-world examples',
      'Collaborative problem-solving with visual aids',
      'Student-led concept mapping'
    ],
    'representation', ARRAY[
      'Multi-modal visualization using physical models and diagrams',
      'Concept comparison using multiple solution strategies',
      'Concrete-to-abstract progression',
      'Real-world applications'
    ],
    'action_expression', ARRAY[
      'Hands-on problem solving with choice of methods',
      'Collaborative project applying concepts',
      'Peer teaching opportunity',
      'Creative application through games'
    ],
    'wrapup', ARRAY[
      'Concept synthesis through student summary',
      'Self-reflection journal',
      'Exit ticket completion',
      'Next steps planning'
    ],
    'duration', 25,
    'dok_levels', jsonb_build_object(
      'engagement', 1,
      'representation', 2,
      'action_expression', 3,
      'wrapup', 2
    ),
    'aligned_standards', CASE
      WHEN v_standard_id IS NOT NULL THEN
        jsonb_build_array(jsonb_build_object(
          'code', v_standard_code,
          'description', v_standard_description
        ))
      ELSE '[]'::jsonb
    END
  );

  RETURN v_lesson_plan;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_ai_lesson_plan TO authenticated, anon;
GRANT EXECUTE ON FUNCTION handle_teacher_login TO authenticated, anon;
GRANT EXECUTE ON FUNCTION reset_teacher_password TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_teacher_password TO authenticated, anon;
GRANT EXECUTE ON FUNCTION authenticate_college_mentor TO authenticated, anon;
GRANT EXECUTE ON FUNCTION authenticate_coach TO authenticated, anon;
GRANT EXECUTE ON FUNCTION verify_teacher_username TO authenticated, anon;
GRANT EXECUTE ON FUNCTION verify_teacher_status TO authenticated, anon;

-- ============================================================
-- END OF SCHEMA RECONSTRUCTION
-- ============================================================
