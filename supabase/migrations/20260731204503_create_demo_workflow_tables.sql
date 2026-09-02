/*
# Demo Workflow Tables

Creates dedicated tables for the end-to-end demo assessment and lesson assignment workflow.

## New Tables

1. `demo_students` - Student accounts for the demo classroom
   - id (uuid, PK)
   - first_name (text)
   - last_initial (text)
   - emoji (text) - secret emoji for login
   - group_name (text) - which class group they belong to
   - created_at (timestamptz)

2. `demo_assessments` - Pre-created quizzes/assessments
   - id (uuid, PK)
   - title (text)
   - subject (text)
   - description (text)
   - created_at (timestamptz)

3. `demo_assessment_questions` - Questions within each assessment
   - id (uuid, PK)
   - assessment_id (uuid, FK -> demo_assessments)
   - question_text (text)
   - topic (text) - the subject area/topic this question tests
   - options (jsonb) - array of answer choices
   - correct_answer (text)
   - order_num (integer)

4. `demo_assessment_assignments` - Teacher assigning assessments to groups
   - id (uuid, PK)
   - assessment_id (uuid, FK -> demo_assessments)
   - group_name (text)
   - assigned_by (text) - teacher username
   - assigned_at (timestamptz)

5. `demo_quiz_responses` - Student answers to quiz questions
   - id (uuid, PK)
   - student_id (uuid, FK -> demo_students)
   - assessment_id (uuid, FK -> demo_assessments)
   - question_id (uuid, FK -> demo_assessment_questions)
   - selected_answer (text)
   - is_correct (boolean)
   - submitted_at (timestamptz)

6. `demo_quiz_completions` - Tracks overall quiz completion per student
   - id (uuid, PK)
   - student_id (uuid, FK -> demo_students)
   - assessment_id (uuid, FK -> demo_assessments)
   - score (integer) - percentage score
   - total_correct (integer)
   - total_questions (integer)
   - completed_at (timestamptz)

7. `demo_lessons` - Pre-designed lessons mapped to topics
   - id (uuid, PK)
   - title (text)
   - topic (text) - maps to question topics
   - subject (text)
   - description (text)
   - content (jsonb) - lesson content structure
   - created_at (timestamptz)

8. `demo_lesson_assignments` - Lessons assigned to students based on struggle areas
   - id (uuid, PK)
   - student_id (uuid, FK -> demo_students)
   - lesson_id (uuid, FK -> demo_lessons)
   - assessment_id (uuid, FK -> demo_assessments) - which assessment triggered this
   - assigned_by (text) - teacher username
   - struggle_topic (text) - which topic they struggled with
   - status (text) - 'assigned', 'in_progress', 'completed'
   - assigned_at (timestamptz)
   - completed_at (timestamptz)

## Security
- RLS enabled on all tables
- All tables accessible by anon + authenticated (demo mode, no real auth)
*/

-- Demo Students
CREATE TABLE IF NOT EXISTS demo_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_initial text NOT NULL,
  emoji text NOT NULL,
  group_name text NOT NULL DEFAULT 'Class A',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE demo_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_students_select" ON demo_students;
CREATE POLICY "demo_students_select" ON demo_students FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "demo_students_insert" ON demo_students;
CREATE POLICY "demo_students_insert" ON demo_students FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "demo_students_update" ON demo_students;
CREATE POLICY "demo_students_update" ON demo_students FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "demo_students_delete" ON demo_students;
CREATE POLICY "demo_students_delete" ON demo_students FOR DELETE TO anon, authenticated USING (true);

-- Demo Assessments
CREATE TABLE IF NOT EXISTS demo_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subject text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE demo_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_assessments_select" ON demo_assessments;
CREATE POLICY "demo_assessments_select" ON demo_assessments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "demo_assessments_insert" ON demo_assessments;
CREATE POLICY "demo_assessments_insert" ON demo_assessments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "demo_assessments_update" ON demo_assessments;
CREATE POLICY "demo_assessments_update" ON demo_assessments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "demo_assessments_delete" ON demo_assessments;
CREATE POLICY "demo_assessments_delete" ON demo_assessments FOR DELETE TO anon, authenticated USING (true);

-- Demo Assessment Questions
CREATE TABLE IF NOT EXISTS demo_assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES demo_assessments(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  topic text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  order_num integer NOT NULL DEFAULT 0
);

ALTER TABLE demo_assessment_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_assessment_questions_select" ON demo_assessment_questions;
CREATE POLICY "demo_assessment_questions_select" ON demo_assessment_questions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "demo_assessment_questions_insert" ON demo_assessment_questions;
CREATE POLICY "demo_assessment_questions_insert" ON demo_assessment_questions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "demo_assessment_questions_update" ON demo_assessment_questions;
CREATE POLICY "demo_assessment_questions_update" ON demo_assessment_questions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "demo_assessment_questions_delete" ON demo_assessment_questions;
CREATE POLICY "demo_assessment_questions_delete" ON demo_assessment_questions FOR DELETE TO anon, authenticated USING (true);

-- Demo Assessment Assignments
CREATE TABLE IF NOT EXISTS demo_assessment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES demo_assessments(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  assigned_by text NOT NULL,
  assigned_at timestamptz DEFAULT now()
);

ALTER TABLE demo_assessment_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_assessment_assignments_select" ON demo_assessment_assignments;
CREATE POLICY "demo_assessment_assignments_select" ON demo_assessment_assignments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "demo_assessment_assignments_insert" ON demo_assessment_assignments;
CREATE POLICY "demo_assessment_assignments_insert" ON demo_assessment_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "demo_assessment_assignments_update" ON demo_assessment_assignments;
CREATE POLICY "demo_assessment_assignments_update" ON demo_assessment_assignments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "demo_assessment_assignments_delete" ON demo_assessment_assignments;
CREATE POLICY "demo_assessment_assignments_delete" ON demo_assessment_assignments FOR DELETE TO anon, authenticated USING (true);

-- Demo Quiz Responses
CREATE TABLE IF NOT EXISTS demo_quiz_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES demo_students(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES demo_assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES demo_assessment_questions(id) ON DELETE CASCADE,
  selected_answer text NOT NULL,
  is_correct boolean NOT NULL,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE demo_quiz_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_quiz_responses_select" ON demo_quiz_responses;
CREATE POLICY "demo_quiz_responses_select" ON demo_quiz_responses FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "demo_quiz_responses_insert" ON demo_quiz_responses;
CREATE POLICY "demo_quiz_responses_insert" ON demo_quiz_responses FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "demo_quiz_responses_update" ON demo_quiz_responses;
CREATE POLICY "demo_quiz_responses_update" ON demo_quiz_responses FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "demo_quiz_responses_delete" ON demo_quiz_responses;
CREATE POLICY "demo_quiz_responses_delete" ON demo_quiz_responses FOR DELETE TO anon, authenticated USING (true);

-- Demo Quiz Completions
CREATE TABLE IF NOT EXISTS demo_quiz_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES demo_students(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES demo_assessments(id) ON DELETE CASCADE,
  score integer NOT NULL,
  total_correct integer NOT NULL,
  total_questions integer NOT NULL,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE demo_quiz_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_quiz_completions_select" ON demo_quiz_completions;
CREATE POLICY "demo_quiz_completions_select" ON demo_quiz_completions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "demo_quiz_completions_insert" ON demo_quiz_completions;
CREATE POLICY "demo_quiz_completions_insert" ON demo_quiz_completions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "demo_quiz_completions_update" ON demo_quiz_completions;
CREATE POLICY "demo_quiz_completions_update" ON demo_quiz_completions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "demo_quiz_completions_delete" ON demo_quiz_completions;
CREATE POLICY "demo_quiz_completions_delete" ON demo_quiz_completions FOR DELETE TO anon, authenticated USING (true);

-- Demo Lessons
CREATE TABLE IF NOT EXISTS demo_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  topic text NOT NULL,
  subject text NOT NULL,
  description text,
  content jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE demo_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_lessons_select" ON demo_lessons;
CREATE POLICY "demo_lessons_select" ON demo_lessons FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "demo_lessons_insert" ON demo_lessons;
CREATE POLICY "demo_lessons_insert" ON demo_lessons FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "demo_lessons_update" ON demo_lessons;
CREATE POLICY "demo_lessons_update" ON demo_lessons FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "demo_lessons_delete" ON demo_lessons;
CREATE POLICY "demo_lessons_delete" ON demo_lessons FOR DELETE TO anon, authenticated USING (true);

-- Demo Lesson Assignments
CREATE TABLE IF NOT EXISTS demo_lesson_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES demo_students(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES demo_lessons(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES demo_assessments(id) ON DELETE CASCADE,
  assigned_by text NOT NULL,
  struggle_topic text NOT NULL,
  status text NOT NULL DEFAULT 'assigned',
  assigned_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE demo_lesson_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_lesson_assignments_select" ON demo_lesson_assignments;
CREATE POLICY "demo_lesson_assignments_select" ON demo_lesson_assignments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "demo_lesson_assignments_insert" ON demo_lesson_assignments;
CREATE POLICY "demo_lesson_assignments_insert" ON demo_lesson_assignments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "demo_lesson_assignments_update" ON demo_lesson_assignments;
CREATE POLICY "demo_lesson_assignments_update" ON demo_lesson_assignments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "demo_lesson_assignments_delete" ON demo_lesson_assignments;
CREATE POLICY "demo_lesson_assignments_delete" ON demo_lesson_assignments FOR DELETE TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_demo_questions_assessment ON demo_assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_demo_assignments_assessment ON demo_assessment_assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_demo_assignments_group ON demo_assessment_assignments(group_name);
CREATE INDEX IF NOT EXISTS idx_demo_responses_student ON demo_quiz_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_demo_responses_assessment ON demo_quiz_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_demo_completions_student ON demo_quiz_completions(student_id);
CREATE INDEX IF NOT EXISTS idx_demo_completions_assessment ON demo_quiz_completions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_demo_lessons_topic ON demo_lessons(topic);
CREATE INDEX IF NOT EXISTS idx_demo_lesson_assignments_student ON demo_lesson_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_demo_lesson_assignments_lesson ON demo_lesson_assignments(lesson_id);
