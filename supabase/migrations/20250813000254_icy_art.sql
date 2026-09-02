/*
  # Create update_quiz_template_questions RPC function

  1. New Functions
    - `update_quiz_template_questions` - Updates quiz template with generated questions
    - Handles both questions and processed_questions fields
    - Includes proper validation and error handling

  2. Security
    - Uses SECURITY DEFINER for proper permissions
    - Validates teacher ownership of quiz template
    - Ensures data integrity with proper checks
*/

-- Create the update_quiz_template_questions function
CREATE OR REPLACE FUNCTION public.update_quiz_template_questions(
  p_quiz_id uuid,
  p_teacher_username text,
  p_questions jsonb,
  p_num_questions integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_exists boolean := false;
  v_teacher_owns boolean := false;
BEGIN
  -- Validate inputs
  IF p_quiz_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quiz ID is required'
    );
  END IF;

  IF p_teacher_username IS NULL OR trim(p_teacher_username) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher username is required'
    );
  END IF;

  IF p_questions IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Questions data is required'
    );
  END IF;

  IF p_num_questions IS NULL OR p_num_questions < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Number of questions must be at least 1'
    );
  END IF;

  -- Check if template exists and belongs to teacher
  SELECT EXISTS(
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id
  ) INTO v_template_exists;

  IF NOT v_template_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quiz template not found'
    );
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) INTO v_teacher_owns;

  IF NOT v_teacher_owns THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'You do not have permission to update this quiz template'
    );
  END IF;

  -- Update the quiz template with questions
  UPDATE quiz_templates 
  SET 
    questions = p_questions,
    processed_questions = p_questions,
    num_questions = p_num_questions,
    updated_at = now()
  WHERE id = p_quiz_id AND teacher_username = p_teacher_username;

  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to update quiz template'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Questions updated successfully',
    'quiz_id', p_quiz_id,
    'num_questions', p_num_questions
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM
    );
END;
$$;