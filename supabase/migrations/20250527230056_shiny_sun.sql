/*
  # Fix quiz templates schema and display

  1. New Features
    - Add show_answers column to quiz_templates table
    - Add processed_questions column for storing validated questions
    - Create functions to properly retrieve and process quiz questions
  
  2. Security
    - Update RLS policies to allow proper access to quiz templates
    - Ensure students can view active quizzes
*/

-- Add show_answers column if it doesn't exist
ALTER TABLE quiz_templates
ADD COLUMN IF NOT EXISTS show_answers BOOLEAN NOT NULL DEFAULT true;

-- Add processed_questions column to store validated questions
ALTER TABLE quiz_templates 
ADD COLUMN IF NOT EXISTS processed_questions JSONB DEFAULT '[]'::jsonb;

-- Add updated_at column if it doesn't exist
ALTER TABLE quiz_templates 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create or replace the function to update the timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the timestamp
DROP TRIGGER IF EXISTS update_quiz_templates_timestamp ON quiz_templates;
CREATE TRIGGER update_quiz_templates_timestamp
BEFORE UPDATE ON quiz_templates
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create function to process and validate quiz questions
CREATE OR REPLACE FUNCTION process_quiz_questions(
  p_questions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed JSONB;
BEGIN
  -- Validate questions array
  IF jsonb_typeof(p_questions) != 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Process and validate each question
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', COALESCE(q->>'id', gen_random_uuid()::text),
      'questionText', q->>'questionText',
      'correctAnswer', q->>'correctAnswer',
      'explanation', q->>'explanation',
      'options', q->'options',
      'type', q->>'type',
      'subtopic', q->>'subtopic'
    )
  )
  FROM jsonb_array_elements(p_questions) q
  INTO v_processed;

  RETURN COALESCE(v_processed, '[]'::jsonb);
END;
$$;

-- Create function to activate quiz template
CREATE OR REPLACE FUNCTION activate_quiz_template(
  p_quiz_id UUID,
  p_teacher_username TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  questions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz quiz_templates%ROWTYPE;
  v_processed_questions JSONB;
BEGIN
  -- Get quiz template
  SELECT * INTO v_quiz
  FROM quiz_templates
  WHERE id = p_quiz_id
  AND teacher_username = p_teacher_username;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false AS success,
      'Quiz template not found'::TEXT AS message,
      NULL::JSONB AS questions;
    RETURN;
  END IF;

  -- Process questions
  v_processed_questions := process_quiz_questions(v_quiz.questions);

  -- Deactivate other quizzes
  UPDATE quiz_templates
  SET is_active = false
  WHERE teacher_username = p_teacher_username
  AND is_active = true;

  -- Activate this quiz with processed questions
  UPDATE quiz_templates
  SET 
    is_active = true,
    processed_questions = v_processed_questions
  WHERE id = p_quiz_id
  RETURNING processed_questions INTO v_processed_questions;

  RETURN QUERY SELECT 
    true AS success,
    'Quiz activated successfully'::TEXT AS message,
    v_processed_questions AS questions;
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
  FROM jsonb_array_elements(COALESCE(v_questions, '[]'::jsonb)) q
  INTO v_result;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

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

-- Add index for faster question lookups
CREATE INDEX IF NOT EXISTS idx_quiz_templates_questions 
ON quiz_templates USING gin (questions);

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