/*
  # Add activate_quiz_template function

  1. New Function
    - `activate_quiz_template(p_quiz_id UUID, p_teacher_username TEXT)`
      - Deactivates all existing active quizzes for the teacher
      - Activates the specified quiz
      - Returns boolean indicating success

  2. Security
    - Function is accessible to authenticated users
    - Validates teacher ownership of quiz before activation
*/

CREATE OR REPLACE FUNCTION public.activate_quiz_template(
  p_quiz_id UUID,
  p_teacher_username TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz_exists boolean;
BEGIN
  -- Verify quiz exists and belongs to teacher
  SELECT EXISTS (
    SELECT 1 
    FROM quiz_templates 
    WHERE id = p_quiz_id 
    AND teacher_username = p_teacher_username
  ) INTO v_quiz_exists;

  IF NOT v_quiz_exists THEN
    RAISE EXCEPTION 'Quiz not found or does not belong to teacher';
  END IF;

  -- Deactivate all existing active quizzes for this teacher
  UPDATE quiz_templates 
  SET is_active = false
  WHERE teacher_username = p_teacher_username 
  AND is_active = true;

  -- Activate the specified quiz
  UPDATE quiz_templates 
  SET is_active = true
  WHERE id = p_quiz_id;

  RETURN true;
END;
$$;