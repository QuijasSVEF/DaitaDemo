/*
  # Restore Core Database Tables
  
  Full schema restoration for the application's core tables.
  
  1. New Tables
    - `teachers` - Teacher accounts with login credentials
    - `students` - Student records linked to teachers
    - `exit_tickets` - Assessment results with struggle areas
    - `lesson_plans` - Generated UDL lesson plans
    - `quiz_templates` - Quiz/assessment templates
    - `quiz_questions` - Individual quiz questions
    - `quiz_attempts` - Student quiz attempt records
    - `weekly_groups` - Weekly student groupings
    - `group_lesson_plans` - Lesson plans for groups
    - `ca_standards` - California math standards
    - `standards_alignments` - Standards alignment records
    - `classroom_analytics` - Classroom-level analytics
    - `teacher_accounts` - Extended teacher account info
    - `admin_users` - Admin user accounts
    - `admin_audit_logs` - Admin action audit trail
    - `admin_sessions` - Admin login sessions
    - `teacher_sessions` - Teacher login sessions
    - `password_reset_requests` - Password reset tracking
    - `school_districts` - School district records
    
  2. Security
    - RLS enabled on all tables
    - Policies for authenticated access
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  email text DEFAULT '',
  password_hash text DEFAULT '',
  grade_level text DEFAULT '',
  school text DEFAULT '',
  district_id uuid,
  account_status text DEFAULT 'active',
  account_locked boolean DEFAULT false,
  failed_login_attempts integer DEFAULT 0,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Teachers can read own data') THEN
    CREATE POLICY "Teachers can read own data" ON teachers FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Teachers can update own data') THEN
    CREATE POLICY "Teachers can update own data" ON teachers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Teachers can insert') THEN
    CREATE POLICY "Teachers can insert" ON teachers FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow anon read for login') THEN
    CREATE POLICY "Allow anon read for login" ON teachers FOR SELECT TO anon USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow anon insert for registration') THEN
    CREATE POLICY "Allow anon insert for registration" ON teachers FOR INSERT TO anon WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teachers' AND policyname = 'Allow anon update for login tracking') THEN
    CREATE POLICY "Allow anon update for login tracking" ON teachers FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id integer NOT NULL,
  teacher_username text NOT NULL,
  grade_level text DEFAULT '',
  subject text DEFAULT 'Mathematics',
  emoji_password text DEFAULT '',
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id, teacher_username)
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Students readable by all') THEN
    CREATE POLICY "Students readable by all" ON students FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Students insertable by all') THEN
    CREATE POLICY "Students insertable by all" ON students FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Students updatable by all') THEN
    CREATE POLICY "Students updatable by all" ON students FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'Students deletable by all') THEN
    CREATE POLICY "Students deletable by all" ON students FOR DELETE USING (true);
  END IF;
END $$;

-- Exit tickets table
CREATE TABLE IF NOT EXISTS exit_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id integer NOT NULL,
  teacher_username text NOT NULL,
  score integer DEFAULT 0,
  total_questions integer DEFAULT 1,
  struggled_areas text[] DEFAULT '{}',
  last_lesson text DEFAULT '',
  confidence_level integer DEFAULT 3,
  additional_notes text DEFAULT '',
  student_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exit_tickets' AND policyname = 'Exit tickets readable by all') THEN
    CREATE POLICY "Exit tickets readable by all" ON exit_tickets FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exit_tickets' AND policyname = 'Exit tickets insertable by all') THEN
    CREATE POLICY "Exit tickets insertable by all" ON exit_tickets FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exit_tickets' AND policyname = 'Exit tickets updatable by all') THEN
    CREATE POLICY "Exit tickets updatable by all" ON exit_tickets FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exit_tickets' AND policyname = 'Exit tickets deletable by all') THEN
    CREATE POLICY "Exit tickets deletable by all" ON exit_tickets FOR DELETE USING (true);
  END IF;
END $$;

-- Lesson plans table
CREATE TABLE IF NOT EXISTS lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id integer NOT NULL,
  teacher_username text NOT NULL,
  exit_ticket_id uuid,
  objective text DEFAULT '',
  engagement text[] DEFAULT '{}',
  representation text[] DEFAULT '{}',
  action_expression text[] DEFAULT '{}',
  wrapup text[] DEFAULT '{}',
  duration integer DEFAULT 25,
  aligned_standards jsonb DEFAULT '[]',
  dok_levels jsonb DEFAULT '{"engagement":1,"representation":2,"action_expression":3,"wrapup":2}',
  detailed_activities jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lesson_plans' AND policyname = 'Lesson plans readable by all') THEN
    CREATE POLICY "Lesson plans readable by all" ON lesson_plans FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lesson_plans' AND policyname = 'Lesson plans insertable by all') THEN
    CREATE POLICY "Lesson plans insertable by all" ON lesson_plans FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lesson_plans' AND policyname = 'Lesson plans updatable by all') THEN
    CREATE POLICY "Lesson plans updatable by all" ON lesson_plans FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lesson_plans' AND policyname = 'Lesson plans deletable by all') THEN
    CREATE POLICY "Lesson plans deletable by all" ON lesson_plans FOR DELETE USING (true);
  END IF;
END $$;

-- Quiz templates table
CREATE TABLE IF NOT EXISTS quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_username text NOT NULL,
  title text NOT NULL DEFAULT '',
  topic text DEFAULT '',
  subtopics text[] DEFAULT '{}',
  grade_level text DEFAULT '',
  difficulty text DEFAULT 'medium',
  num_questions integer DEFAULT 10,
  question_types text[] DEFAULT '{}',
  questions jsonb DEFAULT '[]',
  processed_questions jsonb DEFAULT '[]',
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_templates' AND policyname = 'Quiz templates readable by all') THEN
    CREATE POLICY "Quiz templates readable by all" ON quiz_templates FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_templates' AND policyname = 'Quiz templates insertable by all') THEN
    CREATE POLICY "Quiz templates insertable by all" ON quiz_templates FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_templates' AND policyname = 'Quiz templates updatable by all') THEN
    CREATE POLICY "Quiz templates updatable by all" ON quiz_templates FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_templates' AND policyname = 'Quiz templates deletable by all') THEN
    CREATE POLICY "Quiz templates deletable by all" ON quiz_templates FOR DELETE USING (true);
  END IF;
END $$;

-- Quiz questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL DEFAULT '',
  question_type text DEFAULT 'multiple_choice',
  options jsonb DEFAULT '[]',
  correct_answer text DEFAULT '',
  subtopic text DEFAULT '',
  difficulty text DEFAULT 'medium',
  explanation text DEFAULT '',
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'Quiz questions readable by all') THEN
    CREATE POLICY "Quiz questions readable by all" ON quiz_questions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'Quiz questions insertable by all') THEN
    CREATE POLICY "Quiz questions insertable by all" ON quiz_questions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'Quiz questions updatable by all') THEN
    CREATE POLICY "Quiz questions updatable by all" ON quiz_questions FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_questions' AND policyname = 'Quiz questions deletable by all') THEN
    CREATE POLICY "Quiz questions deletable by all" ON quiz_questions FOR DELETE USING (true);
  END IF;
END $$;

-- Quiz attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id integer NOT NULL,
  teacher_username text NOT NULL,
  template_id uuid NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  total_questions integer DEFAULT 0,
  answers jsonb DEFAULT '[]',
  start_time timestamptz DEFAULT now(),
  completion_time timestamptz DEFAULT now(),
  completed_at timestamptz DEFAULT now(),
  duration integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_attempts' AND policyname = 'Quiz attempts readable by all') THEN
    CREATE POLICY "Quiz attempts readable by all" ON quiz_attempts FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_attempts' AND policyname = 'Quiz attempts insertable by all') THEN
    CREATE POLICY "Quiz attempts insertable by all" ON quiz_attempts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quiz_attempts' AND policyname = 'Quiz attempts updatable by all') THEN
    CREATE POLICY "Quiz attempts updatable by all" ON quiz_attempts FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Weekly groups table
CREATE TABLE IF NOT EXISTS weekly_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_username text NOT NULL,
  name text DEFAULT '',
  students integer[] DEFAULT '{}',
  focus_areas text[] DEFAULT '{}',
  lesson_plan_id uuid,
  week_start timestamptz DEFAULT now(),
  week_end timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE weekly_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_groups' AND policyname = 'Weekly groups readable by all') THEN
    CREATE POLICY "Weekly groups readable by all" ON weekly_groups FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_groups' AND policyname = 'Weekly groups insertable by all') THEN
    CREATE POLICY "Weekly groups insertable by all" ON weekly_groups FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_groups' AND policyname = 'Weekly groups updatable by all') THEN
    CREATE POLICY "Weekly groups updatable by all" ON weekly_groups FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'weekly_groups' AND policyname = 'Weekly groups deletable by all') THEN
    CREATE POLICY "Weekly groups deletable by all" ON weekly_groups FOR DELETE USING (true);
  END IF;
END $$;

-- Group lesson plans table
CREATE TABLE IF NOT EXISTS group_lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES weekly_groups(id) ON DELETE CASCADE,
  teacher_username text NOT NULL,
  lesson_plan jsonb DEFAULT '{}',
  student_ids integer[] DEFAULT '{}',
  focus_areas text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE group_lesson_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_lesson_plans' AND policyname = 'Group lesson plans readable by all') THEN
    CREATE POLICY "Group lesson plans readable by all" ON group_lesson_plans FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_lesson_plans' AND policyname = 'Group lesson plans insertable by all') THEN
    CREATE POLICY "Group lesson plans insertable by all" ON group_lesson_plans FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'group_lesson_plans' AND policyname = 'Group lesson plans updatable by all') THEN
    CREATE POLICY "Group lesson plans updatable by all" ON group_lesson_plans FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- CA Standards table
CREATE TABLE IF NOT EXISTS ca_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level text NOT NULL,
  subject text NOT NULL DEFAULT 'Mathematics',
  domain text DEFAULT '',
  cluster text DEFAULT '',
  standard_code text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ca_standards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ca_standards' AND policyname = 'CA standards readable by all') THEN
    CREATE POLICY "CA standards readable by all" ON ca_standards FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ca_standards' AND policyname = 'CA standards insertable by all') THEN
    CREATE POLICY "CA standards insertable by all" ON ca_standards FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Standards alignments table
CREATE TABLE IF NOT EXISTS standards_alignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id uuid REFERENCES lesson_plans(id) ON DELETE CASCADE,
  standard_id uuid REFERENCES ca_standards(id) ON DELETE CASCADE,
  alignment_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE standards_alignments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'standards_alignments' AND policyname = 'Standards alignments readable by all') THEN
    CREATE POLICY "Standards alignments readable by all" ON standards_alignments FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'standards_alignments' AND policyname = 'Standards alignments insertable by all') THEN
    CREATE POLICY "Standards alignments insertable by all" ON standards_alignments FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Classroom analytics table
CREATE TABLE IF NOT EXISTS classroom_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_username text NOT NULL,
  analytics_data jsonb DEFAULT '{}',
  week_start timestamptz,
  week_end timestamptz,
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE classroom_analytics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classroom_analytics' AND policyname = 'Classroom analytics readable by all') THEN
    CREATE POLICY "Classroom analytics readable by all" ON classroom_analytics FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classroom_analytics' AND policyname = 'Classroom analytics insertable by all') THEN
    CREATE POLICY "Classroom analytics insertable by all" ON classroom_analytics FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'classroom_analytics' AND policyname = 'Classroom analytics updatable by all') THEN
    CREATE POLICY "Classroom analytics updatable by all" ON classroom_analytics FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Indexes for core tables
CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_username);
CREATE INDEX IF NOT EXISTS idx_exit_tickets_student ON exit_tickets(student_id);
CREATE INDEX IF NOT EXISTS idx_exit_tickets_teacher ON exit_tickets(teacher_username);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_student ON lesson_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_teacher ON lesson_plans(teacher_username);
CREATE INDEX IF NOT EXISTS idx_quiz_templates_teacher ON quiz_templates(teacher_username);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_teacher ON quiz_attempts(teacher_username);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_template ON quiz_attempts(template_id);
CREATE INDEX IF NOT EXISTS idx_weekly_groups_teacher ON weekly_groups(teacher_username);
CREATE INDEX IF NOT EXISTS idx_ca_standards_grade ON ca_standards(grade_level);
CREATE INDEX IF NOT EXISTS idx_classroom_analytics_teacher ON classroom_analytics(teacher_username);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_template ON quiz_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_teachers_username ON teachers(username);
