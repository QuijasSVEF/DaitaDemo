/*
  # Fix Quiz Display Issues

  1. New Functions
    - `get_active_quiz_for_student`: Retrieves the active quiz with questions for a specific teacher
    - `get_quiz_questions_with_ids`: Ensures all questions have proper IDs for student display

  2. Security
    - Add RLS policies to allow students to view active quizzes
    - Create index for faster lookups of active quizzes

  3. Changes
    - Add show_answers column to quiz_templates if it doesn't exist
    - Update RLS policies for better security
*/

-- Function to get active quiz with questions for students
CREATE OR REPLACE FUNCTION get_active_quiz_for_student(p_teacher_username TEXT)
RETURNS TABLE (
  id UUID,
  teacher_username TEXT,
  title TEXT,
  topic TEXT,
  subtopics TEXT[],
  question_types TEXT[],
  num_questions INTEGER,
  grade_level TEXT,
  difficulty TEXT,
  is_active BOOLEAN,
  show_answers BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  questions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qt.id,
    qt.teacher_username,
    qt.title,
    qt.topic,
    qt.subtopics,
    qt.question_types,
    qt.num_questions,
    qt.grade_level,
    qt.difficulty,
    qt.is_active,
    qt.show_answers,
    qt.created_at,
    CASE 
      WHEN jsonb_array_length(qt.processed_questions) > 0 THEN qt.processed_questions
      ELSE qt.questions
    END AS questions
  FROM quiz_templates qt
  WHERE qt.teacher_username = p_teacher_username
  AND qt.is_active = true
  LIMIT 1;
END;
$$;

-- Function to get quiz questions with proper IDs
CREATE OR REPLACE FUNCTION get_quiz_questions_with_ids(p_template_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_questions JSONB;
  v_result JSONB;
BEGIN
  -- Get the questions from the template
  SELECT 
    CASE 
      WHEN jsonb_array_length(processed_questions) > 0 THEN processed_questions
      ELSE questions
    END INTO v_questions
  FROM quiz_templates
  WHERE id = p_template_id;
  
  -- Ensure each question has an ID
  SELECT jsonb_agg(
    jsonb_set(
      q, 
      '{id}', 
      to_jsonb(COALESCE(q->>'id', concat(p_template_id, '-', gen_random_uuid())::text))
    )
  )
  FROM jsonb_array_elements(v_questions) q
  INTO v_result;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Ensure the quiz_templates table has the show_answers column
ALTER TABLE quiz_templates
ADD COLUMN IF NOT EXISTS show_answers BOOLEAN NOT NULL DEFAULT true;

-- Update RLS policies to allow students to view active quizzes
DROP POLICY IF EXISTS "Students can view active quizzes" ON quiz_templates;
CREATE POLICY "Students can view active quizzes"
  ON quiz_templates
  FOR SELECT
  TO public
  USING (is_active = true);

-- Create index for faster lookups of active quizzes
CREATE INDEX IF NOT EXISTS idx_quiz_templates_is_active
  ON quiz_templates(teacher_username, is_active)
  WHERE is_active = true;

-- Update student creation policy to allow during quiz attempts
DROP POLICY IF EXISTS "Allow student creation during quiz attempts" ON public.students;
CREATE POLICY "Allow student creation during quiz attempts"
  ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_templates qt
      WHERE qt.teacher_username = students.teacher_username
      AND qt.is_active = true
    )
  );