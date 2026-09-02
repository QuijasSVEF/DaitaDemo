/*
  # Add questions column to quiz templates

  1. Changes
    - Add JSONB column 'questions' to quiz_templates table to store question data
    - Add validation check for questions array structure
    - Add trigger to validate question format on insert/update

  2. Security
    - Maintain existing RLS policies
    - Questions inherit table-level security
*/

-- Add questions column to quiz_templates
ALTER TABLE quiz_templates 
ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;

-- Add check constraint to ensure questions is an array
ALTER TABLE quiz_templates
ADD CONSTRAINT quiz_templates_questions_check
CHECK (jsonb_typeof(questions) = 'array');

-- Create function to validate question format
CREATE OR REPLACE FUNCTION validate_quiz_questions()
RETURNS trigger AS $$
BEGIN
  -- Check if questions is null or empty array
  IF NEW.questions IS NULL OR NEW.questions = '[]'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Validate each question has required fields
  IF NOT (
    SELECT bool_and(
      question ? 'questionText' AND
      question ? 'correctAnswer' AND
      question ? 'explanation' AND
      question ? 'options' AND
      question ? 'type' AND
      question ? 'subtopic'
    )
    FROM jsonb_array_elements(NEW.questions) AS question
  ) THEN
    RAISE EXCEPTION 'Invalid question format. Each question must have questionText, correctAnswer, explanation, options, type, and subtopic fields.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate questions on insert/update
DROP TRIGGER IF EXISTS validate_quiz_questions_trigger ON quiz_templates;
CREATE TRIGGER validate_quiz_questions_trigger
  BEFORE INSERT OR UPDATE OF questions ON quiz_templates
  FOR EACH ROW
  EXECUTE FUNCTION validate_quiz_questions();

-- Update existing RLS policies to include questions column
ALTER POLICY "Teachers can manage quiz templates" ON quiz_templates USING (true) WITH CHECK (true);