/*
  # Fix Security Issues: Indexes, RLS Policies, and Function Search Paths

  1. Missing FK Indexes
    - Add 12 indexes on foreign key columns for query performance

  2. Unused Indexes
    - Drop 22 indexes that have never been used

  3. Duplicate Indexes
    - Drop 1 of each identical index pair (2 drops)

  4. Duplicate Permissive Policies
    - Remove redundant policies where a broader policy already covers the same access

  5. Auth RLS Initialization Plan
    - Recreate policies that call auth functions to use (select auth.uid()) pattern
    - This prevents re-evaluation per row and improves performance

  6. Function Search Paths
    - Set search_path on all public functions to prevent mutable search_path issues
*/

-- ============================================================
-- SECTION 1: Add Missing FK Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_coach_teacher_assignments_teacher_username ON coach_teacher_assignments(teacher_username);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_teacher_id ON password_reset_requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_template_id ON quiz_attempts(template_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_template_id ON quiz_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_school_districts_created_by ON school_districts(created_by);
CREATE INDEX IF NOT EXISTS idx_standards_alignments_standard_id ON standards_alignments(standard_id);
CREATE INDEX IF NOT EXISTS idx_standards_alignments_student_teacher ON standards_alignments(student_id, teacher_username);
CREATE INDEX IF NOT EXISTS idx_teacher_accounts_created_by ON teacher_accounts(created_by);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher_id ON teacher_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teachers_updated_by ON teachers(updated_by);
CREATE INDEX IF NOT EXISTS idx_weekly_groups_lesson_plan_id ON weekly_groups(lesson_plan_id);

-- ============================================================
-- SECTION 2: Drop Unused Indexes
-- ============================================================
DROP INDEX IF EXISTS idx_college_mentors_status;
DROP INDEX IF EXISTS idx_mentor_groups_teacher;
DROP INDEX IF EXISTS idx_mentor_groups_status;
DROP INDEX IF EXISTS idx_mentor_students_student;
DROP INDEX IF EXISTS idx_mentor_sessions_date;
DROP INDEX IF EXISTS idx_admin_audit_logs_admin_id;
DROP INDEX IF EXISTS idx_group_lesson_plans_group;
DROP INDEX IF EXISTS idx_group_lesson_plans_teacher;
DROP INDEX IF EXISTS idx_password_reset_token;
DROP INDEX IF EXISTS idx_quiz_attempts_student_created;
DROP INDEX IF EXISTS idx_quiz_attempts_timestamps;
DROP INDEX IF EXISTS idx_quiz_templates_active;
DROP INDEX IF EXISTS idx_quiz_templates_questions;
DROP INDEX IF EXISTS idx_students_active;
DROP INDEX IF EXISTS idx_students_teacher_emoji;
DROP INDEX IF EXISTS idx_teacher_accounts_email;
DROP INDEX IF EXISTS idx_teacher_sessions_expires;
DROP INDEX IF EXISTS idx_teacher_sessions_token;
DROP INDEX IF EXISTS idx_teachers_account_status;
DROP INDEX IF EXISTS idx_teachers_email;
DROP INDEX IF EXISTS idx_teachers_failed_login;
DROP INDEX IF EXISTS idx_teachers_login_lookup;

-- ============================================================
-- SECTION 3: Drop Duplicate Indexes
-- ============================================================
DROP INDEX IF EXISTS idx_quiz_templates_is_active;
DROP INDEX IF EXISTS idx_teachers_failed_logins;

-- ============================================================
-- SECTION 4: Remove Redundant Duplicate Policies
-- ============================================================

-- classroom_analytics: "Teachers can manage analytics" (ALL true) makes individual CRUD policies redundant
DROP POLICY IF EXISTS "Teachers can delete their own analytics" ON classroom_analytics;
DROP POLICY IF EXISTS "Teachers can insert their own analytics" ON classroom_analytics;
DROP POLICY IF EXISTS "Teachers can read their own analytics" ON classroom_analytics;
DROP POLICY IF EXISTS "Teachers can update their own analytics" ON classroom_analytics;

-- coach_teacher_assignments: "Public read access" makes auth-based SELECT redundant
DROP POLICY IF EXISTS "Coaches can view their assignments" ON coach_teacher_assignments;

-- coaches: auth-based policy is not working anyway (coaches use custom auth)
DROP POLICY IF EXISTS "Coaches can view their own data" ON coaches;

-- college_mentors: public policies make auth-based ones redundant
DROP POLICY IF EXISTS "Mentors can view own profile" ON college_mentors;
DROP POLICY IF EXISTS "Mentors can update own profile" ON college_mentors;

-- group_lesson_plans: "Public access" ALL covers everything
DROP POLICY IF EXISTS "Enable cascade delete for group lesson plans" ON group_lesson_plans;
DROP POLICY IF EXISTS "Teachers can manage group lesson plans" ON group_lesson_plans;

-- mentor_teacher_assignments: "Public *" policies cover all roles, "Anyone can *" redundant
DROP POLICY IF EXISTS "Anyone can create mentor-teacher assignments" ON mentor_teacher_assignments;
DROP POLICY IF EXISTS "Anyone can delete mentor-teacher assignments" ON mentor_teacher_assignments;
DROP POLICY IF EXISTS "Anyone can update mentor-teacher assignments" ON mentor_teacher_assignments;
DROP POLICY IF EXISTS "Anyone can view mentor-teacher assignments" ON mentor_teacher_assignments;

-- mentor_group_assignments: public policies make auth-based ones redundant
DROP POLICY IF EXISTS "Teachers can manage assignments for their groups" ON mentor_group_assignments;
DROP POLICY IF EXISTS "Mentors can view own assignments" ON mentor_group_assignments;
DROP POLICY IF EXISTS "Teachers can view assignments for their groups" ON mentor_group_assignments;

-- mentor_group_students: public policies make auth-based ones redundant
DROP POLICY IF EXISTS "Teachers can manage students in own groups" ON mentor_group_students;
DROP POLICY IF EXISTS "Mentors can view students in assigned groups" ON mentor_group_students;

-- mentor_groups: public policies make auth-based ones redundant
DROP POLICY IF EXISTS "Teachers can manage own groups" ON mentor_groups;
DROP POLICY IF EXISTS "Teachers can view own groups" ON mentor_groups;
DROP POLICY IF EXISTS "Mentors can view assigned groups" ON mentor_groups;

-- mentor_sessions: public policies make auth-based ones redundant
DROP POLICY IF EXISTS "Mentors can create sessions for assigned groups" ON mentor_sessions;
DROP POLICY IF EXISTS "Mentors can view own sessions" ON mentor_sessions;
DROP POLICY IF EXISTS "Mentors can update own sessions" ON mentor_sessions;
DROP POLICY IF EXISTS "Teachers can view sessions for their groups" ON mentor_sessions;

-- exit_tickets: "Enable insert" (true) makes auth INSERT redundant; keep "Teachers can manage" for UPDATE/DELETE
DROP POLICY IF EXISTS "Teachers can create exit tickets" ON exit_tickets;

-- quiz_questions: "Teachers can manage" ALL covers everything
DROP POLICY IF EXISTS "Enable insert for quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Enable read access for quiz questions" ON quiz_questions;

-- quiz_templates: "Public can read" and "Public can view active" are overlapping
DROP POLICY IF EXISTS "Public can view active quiz templates" ON quiz_templates;

-- students: "Public read access" + "Teachers can manage" ALL cover SELECT
DROP POLICY IF EXISTS "Teachers can view their students" ON students;

-- teacher_sessions: "Teachers can access their own sessions" ALL covers individual ops
DROP POLICY IF EXISTS "Teachers can delete their own sessions" ON teacher_sessions;
DROP POLICY IF EXISTS "Teachers can view their own sessions" ON teacher_sessions;

-- weekly_groups: "Teachers can manage" ALL covers DELETE
DROP POLICY IF EXISTS "Enable cascade delete for weekly groups" ON weekly_groups;

-- ============================================================
-- SECTION 5: Fix Auth RLS Initialization Plan
-- Recreate policies with (select auth.uid()) and (select auth.jwt()) patterns
-- ============================================================

-- admin_sessions: fix auth.jwt()
DROP POLICY IF EXISTS "Admin users can manage their sessions" ON admin_sessions;
CREATE POLICY "Admin users can manage their sessions"
  ON admin_sessions FOR ALL TO authenticated
  USING (admin_id IN (
    SELECT admin_users.id FROM admin_users
    WHERE admin_users.email = ((select auth.jwt()) ->> 'email'::text)
  ));

-- password_reset_requests: fix auth.uid()
DROP POLICY IF EXISTS "Teachers can access their own reset requests" ON password_reset_requests;
CREATE POLICY "Teachers can access their own reset requests"
  ON password_reset_requests FOR ALL
  USING (teacher_id IN (
    SELECT teacher_accounts.id FROM teacher_accounts
    WHERE teacher_accounts.username = ((select auth.uid()))::text
  ));

-- exit_tickets: fix auth.uid() in "Teachers can manage exit tickets"
DROP POLICY IF EXISTS "Teachers can manage exit tickets" ON exit_tickets;
CREATE POLICY "Teachers can manage exit tickets"
  ON exit_tickets FOR ALL TO authenticated
  USING (
    (teacher_username = ((select auth.uid()))::text)
    AND (EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.username = ((select auth.uid()))::text
      AND teachers.account_status = 'active'
      AND teachers.account_locked = false
    ))
  )
  WITH CHECK (
    (teacher_username = ((select auth.uid()))::text)
    AND (EXISTS (
      SELECT 1 FROM teachers
      WHERE teachers.username = ((select auth.uid()))::text
      AND teachers.account_status = 'active'
      AND teachers.account_locked = false
    ))
  );

-- quiz_attempts: fix auth.uid()
DROP POLICY IF EXISTS "Teachers can manage quiz attempts" ON quiz_attempts;
CREATE POLICY "Teachers can manage quiz attempts"
  ON quiz_attempts FOR ALL TO authenticated
  USING (
    teacher_username = ((select auth.uid()))::text
    AND verify_teacher_username(teacher_username)
  )
  WITH CHECK (
    teacher_username = ((select auth.uid()))::text
    AND verify_teacher_username(teacher_username)
  );

-- students: fix auth.uid()
DROP POLICY IF EXISTS "Teachers can manage their students" ON students;
CREATE POLICY "Teachers can manage their students"
  ON students FOR ALL TO authenticated
  USING (
    ((select auth.uid()))::text = teacher_username
    AND verify_teacher_status(teacher_username)
  )
  WITH CHECK (
    ((select auth.uid()))::text = teacher_username
    AND verify_teacher_status(teacher_username)
  );

-- quiz_templates: fix auth.email()
DROP POLICY IF EXISTS "Teachers can manage quiz templates by username" ON quiz_templates;
CREATE POLICY "Teachers can manage quiz templates by username"
  ON quiz_templates FOR ALL TO anon, authenticated
  USING (
    teacher_username IS NOT NULL
    AND (
      ((select auth.email()) IS NOT NULL AND EXISTS (
        SELECT 1 FROM teachers
        WHERE teachers.username = quiz_templates.teacher_username
        AND teachers.email = (select auth.email())
        AND teachers.account_status = 'active'
        AND teachers.account_locked = false
      ))
      OR (select auth.email()) IS NULL
    )
  )
  WITH CHECK (
    teacher_username IS NOT NULL
    AND (
      ((select auth.email()) IS NOT NULL AND EXISTS (
        SELECT 1 FROM teachers
        WHERE teachers.username = quiz_templates.teacher_username
        AND teachers.email = (select auth.email())
        AND teachers.account_status = 'active'
        AND teachers.account_locked = false
      ))
      OR (select auth.email()) IS NULL
    )
  );

-- ============================================================
-- SECTION 6: Fix Function Search Paths
-- Set search_path = public on all public functions
-- ============================================================
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f'
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path = public', func_record.proname, func_record.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not alter function %.%(%): %', 'public', func_record.proname, func_record.args, SQLERRM;
    END;
  END LOOP;
END $$;
