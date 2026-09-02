/*
  # Create RPC function for updating quiz template questions

  1. New Functions
    - `update_quiz_template_questions` - Securely updates quiz questions bypassing RLS
    
  2. Security
    - Uses SECURITY DEFINER to bypass RLS while maintaining validation
    - Verifies teacher ownership before allowing updates
    - Validates teacher account status
*/

CREATE OR REPLACE FUNCTION update_quiz_template_questions(
  p_quiz_id UUID,
  p_teacher_username TEXT,
  p_questions JSONB,
  p_num_questions INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  teacher_record RECORD;
BEGIN
  -- Verify teacher exists and is active
  SELECT username, account_status, account_locked 
  INTO teacher_record
  FROM teachers 
  WHERE username = p_teacher_username;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher account not found: %', p_teacher_username;
  END IF;
  
  IF teacher_record.account_locked THEN
    RAISE EXCEPTION 'Teacher account is locked: %', p_teacher_username;
  END IF;
  
  IF teacher_record.account_status != 'active' THEN
    RAISE EXCEPTION 'Teacher account is not active: %', p_teacher_username;
  END IF;
  
  -- Verify teacher owns this quiz
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id 
    AND teacher_username = p_teacher_username
  ) THEN
    RAISE EXCEPTION 'Quiz not found or access denied for teacher: %', p_teacher_username;
  END IF;
  
  -- Validate questions format
  IF NOT (jsonb_typeof(p_questions) = 'array') THEN
    RAISE EXCEPTION 'Questions must be a JSON array';
  END IF;
  
  IF p_num_questions < 1 OR p_num_questions > 20 THEN
    RAISE EXCEPTION 'Number of questions must be between 1 and 20';
  END IF;
  
  -- Update the quiz template
  UPDATE quiz_templates 
  SET 
    questions = p_questions,
    processed_questions = p_questions,
    num_questions = p_num_questions,
    updated_at = NOW()
  WHERE id = p_quiz_id
  RETURNING to_jsonb(quiz_templates.*) INTO result;
  
  IF result IS NULL THEN
    RAISE EXCEPTION 'Failed to update quiz template';
  END IF;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_quiz_template_questions TO authenticated;
GRANT EXECUTE ON FUNCTION update_quiz_template_questions TO anon;