/*
  # Fix Quiz Display for Students

  1. New Functions
    - `get_quiz_questions_for_template` - Retrieves questions from a quiz template
    - `get_active_quiz_with_questions` - Gets the active quiz with its questions for a teacher

  2. Changes
    - Updates the quiz questions retrieval to properly handle the questions stored in the quiz_templates table
    - Ensures proper access to questions for students taking quizzes
*/

-- Function to get quiz questions for a template
CREATE OR REPLACE FUNCTION get_quiz_questions_for_template(p_template_id UUID)
RETURNS TABLE (
  id TEXT,
  template_id UUID,
  question_text TEXT,
  correct_answer TEXT,
  explanation TEXT,
  options TEXT[],
  type TEXT,
  subtopic TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (q->>'id')::TEXT,
    p_template_id,
    (q->>'questionText')::TEXT,
    (q->>'correctAnswer')::TEXT,
    (q->>'explanation')::TEXT,
    ARRAY(SELECT jsonb_array_elements_text(q->'options')),
    (q->>'type')::TEXT,
    (q->>'subtopic')::TEXT
  FROM quiz_templates,
  jsonb_array_elements(CASE 
    WHEN jsonb_array_length(processed_questions) > 0 THEN processed_questions
    ELSE questions
  END) AS q
  WHERE id = p_template_id;
END;
$$;

-- Function to get active quiz with questions
CREATE OR REPLACE FUNCTION get_active_quiz_with_questions(p_teacher_username TEXT)
RETURNS TABLE (
  id UUID,
  teacher_username TEXT,
  title TEXT,
  topic TEXT,
  subtopics TEXT[],
  question_types TEXT[],
  num_questions INTEGER,
  grade_level TEXT,
  difficulty TEXT,
  is_active BOOLEAN,
  show_answers BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  questions JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qt.id,
    qt.teacher_username,
    qt.title,
    qt.topic,
    qt.subtopics,
    qt.question_types,
    qt.num_questions,
    qt.grade_level,
    qt.difficulty,
    qt.is_active,
    qt.show_answers,
    qt.created_at,
    CASE 
      WHEN jsonb_array_length(qt.processed_questions) > 0 THEN qt.processed_questions
      ELSE qt.questions
    END AS questions
  FROM quiz_templates qt
  WHERE qt.teacher_username = p_teacher_username
  AND qt.is_active = true
  LIMIT 1;
END;
$$;

-- Add show_answers column if it doesn't exist
ALTER TABLE quiz_templates
ADD COLUMN IF NOT EXISTS show_answers BOOLEAN NOT NULL DEFAULT true;

-- Update RLS policies to allow public access to active quizzes
DROP POLICY IF EXISTS "Enable read access for quiz templates" ON quiz_templates;
CREATE POLICY "Enable read access for quiz templates"
  ON quiz_templates
  FOR SELECT
  TO public
  USING (true);

-- Create policy for students to view active quizzes
DROP POLICY IF EXISTS "Students can view active quizzes" ON quiz_templates;
CREATE POLICY "Students can view active quizzes"
  ON quiz_templates
  FOR SELECT
  TO public
  USING (is_active = true);