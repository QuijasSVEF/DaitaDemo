/*
  # Fix quiz questions display

  1. Changes
    - Add function to get quiz questions
    - Update quiz template activation to properly handle questions
    - Add index for faster question lookups
    
  2. Security
    - Add RLS policy for question access
    - Ensure proper authentication checks
*/

-- Function to get quiz questions
CREATE OR REPLACE FUNCTION get_quiz_questions(p_template_id UUID)
RETURNS TABLE (
  question_text TEXT,
  correct_answer TEXT,
  explanation TEXT,
  options TEXT[],
  type TEXT,
  subtopic TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (q->>'questionText')::TEXT,
    (q->>'correctAnswer')::TEXT,
    (q->>'explanation')::TEXT,
    ARRAY(SELECT jsonb_array_elements_text(q->'options')),
    (q->>'type')::TEXT,
    (q->>'subtopic')::TEXT
  FROM quiz_templates,
  jsonb_array_elements(questions) AS q
  WHERE id = p_template_id;
END;
$$;

-- Update quiz template activation to handle questions
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

  -- Deactivate other quizzes
  UPDATE quiz_templates
  SET is_active = false
  WHERE teacher_username = p_teacher_username
  AND is_active = true;

  -- Activate this quiz
  UPDATE quiz_templates
  SET 
    is_active = true,
    updated_at = now()
  WHERE id = p_quiz_id;

  -- Return success with questions
  RETURN QUERY SELECT 
    true AS success,
    'Quiz activated successfully'::TEXT AS message,
    v_quiz.questions AS questions;
END;
$$;

-- Add index for faster question lookups
CREATE INDEX IF NOT EXISTS idx_quiz_templates_questions 
ON quiz_templates USING gin (questions);

-- Update RLS policy to allow question access
DROP POLICY IF EXISTS "Teachers can view quiz questions" ON quiz_templates;
CREATE POLICY "Teachers can view quiz questions"
  ON quiz_templates
  FOR SELECT
  TO authenticated
  USING (teacher_username = auth.uid()::text);