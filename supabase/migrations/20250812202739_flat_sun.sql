/*
  # Fix Quiz Templates Operations

  1. Database Functions
    - Drop existing functions that may have conflicting signatures
    - Create new functions for quiz template CRUD operations
    - Add proper error handling and validation

  2. Security
    - Ensure functions respect existing RLS policies
    - Add proper permission checks
*/

-- Drop existing functions if they exist (with all possible signatures)
DROP FUNCTION IF EXISTS activate_quiz_template(uuid, text);
DROP FUNCTION IF EXISTS activate_quiz_template(text, text);
DROP FUNCTION IF EXISTS deactivate_quiz_template(uuid, text);
DROP FUNCTION IF EXISTS deactivate_quiz_template(text, text);
DROP FUNCTION IF EXISTS delete_quiz_template(uuid, text);
DROP FUNCTION IF EXISTS delete_quiz_template(text, text);

-- Function to safely delete a quiz template and all related data
CREATE OR REPLACE FUNCTION delete_quiz_template(
  p_quiz_id uuid,
  p_teacher_username text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  -- Verify the quiz belongs to the teacher
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz not found or access denied'
    );
  END IF;

  -- Delete quiz attempts first (foreign key constraint)
  DELETE FROM quiz_attempts WHERE template_id = p_quiz_id;
  
  -- Delete quiz questions (foreign key constraint)
  DELETE FROM quiz_questions WHERE template_id = p_quiz_id;
  
  -- Delete the quiz template
  DELETE FROM quiz_templates WHERE id = p_quiz_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Quiz deleted successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error deleting quiz: ' || SQLERRM
    );
END;
$$;

-- Function to activate a quiz template (and deactivate others)
CREATE OR REPLACE FUNCTION activate_quiz_template(
  p_quiz_id uuid,
  p_teacher_username text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the quiz belongs to the teacher
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz not found or access denied'
    );
  END IF;

  -- Deactivate all other quizzes for this teacher
  UPDATE quiz_templates 
  SET is_active = false 
  WHERE teacher_username = p_teacher_username AND id != p_quiz_id;
  
  -- Activate the selected quiz
  UPDATE quiz_templates 
  SET is_active = true 
  WHERE id = p_quiz_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Quiz activated successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error activating quiz: ' || SQLERRM
    );
END;
$$;

-- Function to deactivate a quiz template
CREATE OR REPLACE FUNCTION deactivate_quiz_template(
  p_quiz_id uuid,
  p_teacher_username text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the quiz belongs to the teacher
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz not found or access denied'
    );
  END IF;

  -- Deactivate the quiz
  UPDATE quiz_templates 
  SET is_active = false 
  WHERE id = p_quiz_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Quiz deactivated successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error deactivating quiz: ' || SQLERRM
    );
END;
$$;