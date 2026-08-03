/*
  # Add updated_at column to quiz_templates table

  1. New Columns
    - `updated_at` (timestamp with time zone) - Tracks when a quiz template was last updated
  
  2. Changes
    - Adds a trigger to automatically update the timestamp when a row is modified
    - Sets default value to current timestamp
*/

-- Add updated_at column to quiz_templates table
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

-- Fix the activate_quiz_template function to handle the updated_at column
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