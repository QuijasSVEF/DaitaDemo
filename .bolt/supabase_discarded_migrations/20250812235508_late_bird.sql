/*
  # Create Quiz Template Safe Function

  1. New Functions
    - `create_quiz_template_safe` - Safely creates quiz templates with proper validation
    - `update_quiz_template_questions` - Updates quiz template questions
    - `activate_quiz_template` - Activates a quiz template and deactivates others

  2. Security
    - Proper validation of teacher permissions
    - RLS bypass for authenticated operations
    - Input validation and sanitization

  3. Error Handling
    - Comprehensive error messages
    - Rollback on failure
    - Proper return values
*/

-- Function to safely create quiz templates
CREATE OR REPLACE FUNCTION create_quiz_template_safe(
  p_teacher_username TEXT,
  p_title TEXT,
  p_topic TEXT,
  p_subtopics TEXT[],
  p_question_types TEXT[],
  p_num_questions INTEGER,
  p_grade_level TEXT,
  p_difficulty TEXT,
  p_show_answers BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id UUID;
  v_teacher_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_teacher_username IS NULL OR trim(p_teacher_username) = '' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Teacher username is required'
    );
  END IF;

  IF p_title IS NULL OR trim(p_title) = '' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz title is required'
    );
  END IF;

  -- Check if teacher exists and is active
  SELECT EXISTS(
    SELECT 1 FROM teachers 
    WHERE username = trim(p_teacher_username) 
    AND account_status = 'active' 
    AND account_locked = false
  ) INTO v_teacher_exists;

  IF NOT v_teacher_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Teacher not found or account not active'
    );
  END IF;

  -- Check for duplicate title
  IF EXISTS(
    SELECT 1 FROM quiz_templates 
    WHERE teacher_username = trim(p_teacher_username) 
    AND title = trim(p_title)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'A quiz with this title already exists'
    );
  END IF;

  -- Generate new UUID for template
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
    processed_questions,
    created_at,
    updated_at
  ) VALUES (
    v_template_id,
    trim(p_teacher_username),
    trim(p_title),
    trim(p_topic),
    p_subtopics,
    p_question_types,
    p_num_questions,
    trim(p_grade_level),
    trim(p_difficulty),
    COALESCE(p_show_answers, true),
    false, -- Start as inactive
    '[]'::jsonb, -- Empty questions array initially
    '[]'::jsonb, -- Empty processed questions array initially
    now(),
    now()
  );

  -- Return success with template ID
  RETURN json_build_object(
    'success', true,
    'id', v_template_id,
    'message', 'Quiz template created successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Database error: ' || SQLERRM
    );
END;
$$;

-- Function to update quiz template questions
CREATE OR REPLACE FUNCTION update_quiz_template_questions(
  p_quiz_id UUID,
  p_teacher_username TEXT,
  p_questions JSONB,
  p_num_questions INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate teacher owns this quiz
  IF NOT EXISTS(
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id 
    AND teacher_username = trim(p_teacher_username)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz not found or access denied'
    );
  END IF;

  -- Update the quiz template with questions
  UPDATE quiz_templates 
  SET 
    questions = p_questions,
    processed_questions = p_questions,
    num_questions = p_num_questions,
    updated_at = now()
  WHERE id = p_quiz_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Questions updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Error updating questions: ' || SQLERRM
    );
END;
$$;

-- Function to activate quiz template
CREATE OR REPLACE FUNCTION activate_quiz_template(
  p_quiz_id UUID,
  p_teacher_username TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate teacher owns this quiz
  IF NOT EXISTS(
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id 
    AND teacher_username = trim(p_teacher_username)
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz not found or access denied'
    );
  END IF;

  -- Deactivate all other quizzes for this teacher
  UPDATE quiz_templates 
  SET is_active = false 
  WHERE teacher_username = trim(p_teacher_username) 
  AND id != p_quiz_id;

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