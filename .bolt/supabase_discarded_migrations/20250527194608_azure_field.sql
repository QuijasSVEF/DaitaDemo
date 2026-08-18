/*
  # Fix Quiz Processing and Activation
  
  1. New Functions
    - Add function to process quiz questions
    - Add function to activate quiz templates
    - Add function to validate quiz structure
  
  2. Security
    - Add RLS policies for quiz management
    - Add validation triggers
    
  3. Schema Updates
    - Add processed_questions column
    - Add validation constraints
*/

-- Add processed_questions column to store validated questions
ALTER TABLE quiz_templates 
ADD COLUMN IF NOT EXISTS processed_questions JSONB DEFAULT '[]'::jsonb;

-- Create function to process and validate quiz questions
CREATE OR REPLACE FUNCTION process_quiz_questions(
  p_questions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed JSONB;
BEGIN
  -- Validate questions array
  IF jsonb_typeof(p_questions) != 'array' THEN
    RAISE EXCEPTION 'Questions must be a JSON array';
  END IF;

  -- Process and validate each question
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', COALESCE(q->>'id', gen_random_uuid()::text),
      'questionText', q->>'questionText',
      'correctAnswer', q->>'correctAnswer',
      'explanation', q->>'explanation',
      'options', q->'options',
      'type', q->>'type',
      'subtopic', q->>'subtopic'
    )
  )
  FROM jsonb_array_elements(p_questions) q
  INTO v_processed;

  RETURN COALESCE(v_processed, '[]'::jsonb);
END;
$$;

-- Create function to activate quiz template
CREATE OR REPLACE FUNCTION activate_quiz_template(
  p_quiz_id UUID,
  p_teacher_username TEXT
)
RETURNS JSONB
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
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Quiz template not found'
    );
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
    processed_questions = v_processed_questions,
    updated_at = now()
  WHERE id = p_quiz_id
  RETURNING processed_questions INTO v_processed_questions;

  RETURN jsonb_build_object(
    'success', true,
    'questions', v_processed_questions
  );
END;
$$;

-- Add trigger to validate questions on insert/update
CREATE OR REPLACE FUNCTION validate_quiz_template()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate questions structure
  IF NEW.questions IS NOT NULL AND jsonb_typeof(NEW.questions) != 'array' THEN
    RAISE EXCEPTION 'Questions must be a JSON array';
  END IF;

  -- Process questions if being activated
  IF NEW.is_active AND OLD.is_active IS DISTINCT FROM true THEN
    NEW.processed_questions := process_quiz_questions(NEW.questions);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_quiz_template_trigger ON quiz_templates;
CREATE TRIGGER validate_quiz_template_trigger
  BEFORE INSERT OR UPDATE ON quiz_templates
  FOR EACH ROW
  EXECUTE FUNCTION validate_quiz_template();

-- Update RLS policies
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage quiz templates" ON quiz_templates;
CREATE POLICY "Teachers can manage quiz templates"
  ON quiz_templates
  FOR ALL
  TO authenticated
  USING (teacher_username = auth.uid()::text)
  WITH CHECK (teacher_username = auth.uid()::text);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_templates_active 
ON quiz_templates(teacher_username, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_quiz_templates_teacher 
ON quiz_templates(teacher_username, created_at DESC);