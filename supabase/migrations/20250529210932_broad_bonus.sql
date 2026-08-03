-- Function to process quiz answers for analysis
CREATE OR REPLACE FUNCTION process_quiz_answers_for_analysis(p_attempt_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_answers jsonb;
  v_questions jsonb;
  v_result jsonb;
  v_incorrect_questions jsonb;
  v_struggle_areas text[];
BEGIN
  -- Get the answers from the attempt
  SELECT answers INTO v_answers
  FROM quiz_attempts
  WHERE id = p_attempt_id;
  
  -- Get the questions from the template
  SELECT 
    CASE 
      WHEN jsonb_array_length(processed_questions) > 0 THEN processed_questions
      ELSE questions
    END INTO v_questions
  FROM quiz_templates qt
  JOIN quiz_attempts qa ON qa.template_id = qt.id
  WHERE qa.id = p_attempt_id;
  
  -- Process incorrect answers
  SELECT jsonb_agg(
    jsonb_build_object(
      'questionId', a->>'questionId',
      'questionText', (
        SELECT q->>'questionText'
        FROM jsonb_array_elements(v_questions) q
        WHERE q->>'id' = a->>'questionId'
        LIMIT 1
      ),
      'questionSubtopic', (
        SELECT q->>'subtopic'
        FROM jsonb_array_elements(v_questions) q
        WHERE q->>'id' = a->>'questionId'
        LIMIT 1
      ),
      'userAnswer', a->>'answer',
      'correctAnswer', (
        SELECT q->>'correctAnswer'
        FROM jsonb_array_elements(v_questions) q
        WHERE q->>'id' = a->>'questionId'
        LIMIT 1
      ),
      'explanation', (
        SELECT q->>'explanation'
        FROM jsonb_array_elements(v_questions) q
        WHERE q->>'id' = a->>'questionId'
        LIMIT 1
      )
    )
  )
  FROM jsonb_array_elements(v_answers) a
  WHERE (a->>'correct')::boolean = false
  INTO v_incorrect_questions;
  
  -- Extract struggle areas from incorrect questions
  SELECT array_agg(DISTINCT q->>'questionSubtopic')
  FROM jsonb_array_elements(COALESCE(v_incorrect_questions, '[]'::jsonb)) q
  INTO v_struggle_areas;
  
  -- Build final result
  v_result := jsonb_build_object(
    'incorrectQuestions', COALESCE(v_incorrect_questions, '[]'::jsonb),
    'struggleAreas', COALESCE(v_struggle_areas, '{}'::text[])
  );
  
  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_quiz_answers_for_analysis TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION process_quiz_answers_for_analysis IS 'Processes quiz answers to identify incorrect questions and struggle areas';

-- Function to validate and create student if needed
CREATE OR REPLACE FUNCTION validate_and_create_student(
  p_student_id INTEGER,
  p_teacher_username TEXT,
  p_emoji_password TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_exists BOOLEAN;
BEGIN
  -- Check if student exists
  SELECT EXISTS (
    SELECT 1 
    FROM students 
    WHERE id = p_student_id 
    AND teacher_username = p_teacher_username
  ) INTO v_student_exists;
  
  -- If student doesn't exist, create them
  IF NOT v_student_exists THEN
    INSERT INTO students (
      id,
      teacher_username,
      grade_level,
      subject,
      emoji_password,
      last_seen
    ) VALUES (
      p_student_id,
      p_teacher_username,
      '6',
      'Mathematics',
      p_emoji_password,
      now()
    );
    RETURN TRUE;
  END IF;
  
  -- If student exists and emoji password is provided, update it
  IF v_student_exists AND p_emoji_password IS NOT NULL THEN
    UPDATE students
    SET 
      emoji_password = p_emoji_password,
      last_seen = now()
    WHERE id = p_student_id 
    AND teacher_username = p_teacher_username;
  ELSE
    -- Just update last_seen
    UPDATE students
    SET last_seen = now()
    WHERE id = p_student_id 
    AND teacher_username = p_teacher_username;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_and_create_student TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION validate_and_create_student IS 'Validates a student and creates the record if it does not exist';