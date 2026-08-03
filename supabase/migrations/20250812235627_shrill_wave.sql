/*
  # Fix quiz template function signature conflict

  1. Drop existing function with conflicting signature
  2. Recreate function with correct parameters matching the codebase
  3. Add proper validation and error handling
*/

-- Drop the existing function that has a conflicting signature
DROP FUNCTION IF EXISTS create_quiz_template_safe(text,text,text,text[],text[],integer,text,text,boolean);

-- Also drop any other variations that might exist
DROP FUNCTION IF EXISTS create_quiz_template_safe(text,text,text,text[],text[],integer,text,text);

-- Create the function with the correct signature that matches the codebase
CREATE OR REPLACE FUNCTION create_quiz_template_safe(
  p_teacher_username text,
  p_title text,
  p_topic text,
  p_subtopics text[],
  p_question_types text[],
  p_num_questions integer,
  p_grade_level text,
  p_difficulty text,
  p_show_answers boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id uuid;
  v_teacher_exists boolean;
BEGIN
  -- Validate teacher exists and is active
  SELECT EXISTS(
    SELECT 1 FROM teachers 
    WHERE username = p_teacher_username 
    AND account_status = 'active' 
    AND account_locked = false
  ) INTO v_teacher_exists;
  
  IF NOT v_teacher_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found or account not active'
    );
  END IF;
  
  -- Validate input parameters
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Title is required'
    );
  END IF;
  
  IF p_num_questions < 1 OR p_num_questions > 20 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Number of questions must be between 1 and 20'
    );
  END IF;
  
  IF p_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid difficulty level'
    );
  END IF;
  
  -- Check for duplicate title
  IF EXISTS(
    SELECT 1 FROM quiz_templates 
    WHERE teacher_username = p_teacher_username 
    AND title = p_title
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'A quiz with this title already exists'
    );
  END IF;
  
  -- Create the quiz template
  INSERT INTO quiz_templates (
    teacher_username,
    title,
    topic,
    subtopics,
    question_types,
    num_questions,
    grade_level,
    difficulty,
    show_answers,
    is_active,
    questions,
    processed_questions
  ) VALUES (
    p_teacher_username,
    p_title,
    p_topic,
    p_subtopics,
    p_question_types,
    p_num_questions,
    p_grade_level,
    p_difficulty,
    p_show_answers,
    false,
    '[]'::jsonb,
    '[]'::jsonb
  ) RETURNING id INTO v_template_id;
  
  -- Return success with the template ID
  RETURN jsonb_build_object(
    'success', true,
    'id', v_template_id,
    'message', 'Quiz template created successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM
    );
END;
$$;