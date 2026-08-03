/*
  # Restore Quiz Management RPC Functions

  1. New Functions
    - `process_quiz_answers_for_analysis` - Processes quiz answers to identify incorrect questions and struggle areas
    - `delete_quiz_template` - Safely deletes a quiz template and all related data (attempts, questions)
    - `activate_quiz_template` - Activates a quiz template and deactivates others for the teacher
    - `deactivate_quiz_template` - Deactivates a specific quiz template
    - `update_quiz_template_questions` - Updates quiz questions with validation
    - `create_quiz_template_safe` - Creates a quiz template with validation and duplicate checking

  2. Security
    - All functions use SECURITY DEFINER
    - Teacher ownership verified before mutations
    - Execute permissions granted to authenticated and anon roles
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS process_quiz_answers_for_analysis(uuid);
DROP FUNCTION IF EXISTS activate_quiz_template(uuid, text);
DROP FUNCTION IF EXISTS activate_quiz_template(text, text);
DROP FUNCTION IF EXISTS deactivate_quiz_template(uuid, text);
DROP FUNCTION IF EXISTS deactivate_quiz_template(text, text);
DROP FUNCTION IF EXISTS delete_quiz_template(uuid, text);
DROP FUNCTION IF EXISTS delete_quiz_template(text, text);
DROP FUNCTION IF EXISTS update_quiz_template_questions(uuid, text, jsonb, integer);
DROP FUNCTION IF EXISTS create_quiz_template_safe(text,text,text,text[],text[],integer,text,text,boolean);
DROP FUNCTION IF EXISTS create_quiz_template_safe(text,text,text,text[],text[],integer,text,text);

-- process_quiz_answers_for_analysis
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
  SELECT answers INTO v_answers
  FROM quiz_attempts
  WHERE id = p_attempt_id;

  SELECT
    CASE
      WHEN jsonb_array_length(processed_questions) > 0 THEN processed_questions
      ELSE questions
    END INTO v_questions
  FROM quiz_templates qt
  JOIN quiz_attempts qa ON qa.template_id = qt.id
  WHERE qa.id = p_attempt_id;

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

  SELECT array_agg(DISTINCT q->>'questionSubtopic')
  FROM jsonb_array_elements(COALESCE(v_incorrect_questions, '[]'::jsonb)) q
  INTO v_struggle_areas;

  v_result := jsonb_build_object(
    'incorrectQuestions', COALESCE(v_incorrect_questions, '[]'::jsonb),
    'struggleAreas', COALESCE(v_struggle_areas, '{}'::text[])
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION process_quiz_answers_for_analysis TO authenticated, anon;

-- delete_quiz_template
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
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz not found or access denied'
    );
  END IF;

  DELETE FROM quiz_attempts WHERE template_id = p_quiz_id;
  DELETE FROM quiz_questions WHERE template_id = p_quiz_id;
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

-- activate_quiz_template
CREATE OR REPLACE FUNCTION activate_quiz_template(
  p_quiz_id uuid,
  p_teacher_username text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz not found or access denied'
    );
  END IF;

  UPDATE quiz_templates
  SET is_active = false
  WHERE teacher_username = p_teacher_username AND id != p_quiz_id;

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

-- deactivate_quiz_template
CREATE OR REPLACE FUNCTION deactivate_quiz_template(
  p_quiz_id uuid,
  p_teacher_username text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Quiz not found or access denied'
    );
  END IF;

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

-- update_quiz_template_questions
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

  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates
    WHERE id = p_quiz_id
    AND teacher_username = p_teacher_username
  ) THEN
    RAISE EXCEPTION 'Quiz not found or access denied for teacher: %', p_teacher_username;
  END IF;

  IF NOT (jsonb_typeof(p_questions) = 'array') THEN
    RAISE EXCEPTION 'Questions must be a JSON array';
  END IF;

  IF p_num_questions < 1 OR p_num_questions > 20 THEN
    RAISE EXCEPTION 'Number of questions must be between 1 and 20';
  END IF;

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

GRANT EXECUTE ON FUNCTION update_quiz_template_questions TO authenticated, anon;

-- create_quiz_template_safe
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

GRANT EXECUTE ON FUNCTION create_quiz_template_safe TO authenticated, anon;
GRANT EXECUTE ON FUNCTION delete_quiz_template TO authenticated, anon;
GRANT EXECUTE ON FUNCTION activate_quiz_template TO authenticated, anon;
GRANT EXECUTE ON FUNCTION deactivate_quiz_template TO authenticated, anon;