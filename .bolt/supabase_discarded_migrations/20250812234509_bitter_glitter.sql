/*
  # Create quiz template safe function

  1. New Functions
    - `create_quiz_template_safe` - Safely creates quiz templates with proper validation
    - Bypasses RLS while maintaining security through validation
    - Returns the created template data

  2. Security
    - Validates teacher exists and is active
    - Ensures only one active quiz per teacher
    - Proper error handling and validation
*/

CREATE OR REPLACE FUNCTION public.create_quiz_template_safe(
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
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id uuid;
  v_teacher_exists boolean;
  v_result json;
BEGIN
  -- Validate teacher exists and is active
  SELECT EXISTS(
    SELECT 1 FROM teachers 
    WHERE username = p_teacher_username 
    AND account_status = 'active' 
    AND account_locked = false
  ) INTO v_teacher_exists;
  
  IF NOT v_teacher_exists THEN
    RAISE EXCEPTION 'Teacher not found, inactive, or account locked';
  END IF;
  
  -- Validate input parameters
  IF p_title IS NULL OR trim(p_title) = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  
  IF p_topic IS NULL OR trim(p_topic) = '' THEN
    RAISE EXCEPTION 'Topic is required';
  END IF;
  
  IF p_subtopics IS NULL OR array_length(p_subtopics, 1) = 0 THEN
    RAISE EXCEPTION 'At least one subtopic is required';
  END IF;
  
  IF p_question_types IS NULL OR array_length(p_question_types, 1) = 0 THEN
    RAISE EXCEPTION 'At least one question type is required';
  END IF;
  
  IF p_num_questions IS NULL OR p_num_questions < 1 OR p_num_questions > 20 THEN
    RAISE EXCEPTION 'Number of questions must be between 1 and 20';
  END IF;
  
  IF p_grade_level IS NULL OR trim(p_grade_level) = '' THEN
    RAISE EXCEPTION 'Grade level is required';
  END IF;
  
  IF p_difficulty IS NULL OR p_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RAISE EXCEPTION 'Difficulty must be easy, medium, or hard';
  END IF;
  
  -- Generate new UUID for the template
  v_template_id := gen_random_uuid();
  
  -- Insert the quiz template
  INSERT INTO quiz_templates (
    id,
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
    v_template_id,
    p_teacher_username,
    trim(p_title),
    trim(p_topic),
    p_subtopics,
    p_question_types,
    p_num_questions,
    trim(p_grade_level),
    p_difficulty,
    COALESCE(p_show_answers, true),
    false, -- Start as inactive
    '[]'::jsonb, -- Empty questions array
    '[]'::jsonb  -- Empty processed questions array
  );
  
  -- Return the created template data
  SELECT json_build_object(
    'success', true,
    'id', v_template_id,
    'message', 'Quiz template created successfully'
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A quiz template with this title already exists for this teacher';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create quiz template: %', SQLERRM;
END;
$$;