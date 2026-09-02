/*
  # Fix Quiz Templates CRUD Operations

  1. Database Functions
    - Create function to safely delete quiz templates with cascade
    - Create function to activate/deactivate quizzes
    - Ensure proper RLS policies for quiz operations

  2. Security
    - Update RLS policies for quiz_templates
    - Ensure teachers can only manage their own quizzes

  3. Indexes
    - Add performance indexes for common queries
*/

-- Function to safely delete a quiz template with all related data
CREATE OR REPLACE FUNCTION delete_quiz_template(p_quiz_id uuid, p_teacher_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the quiz belongs to the teacher
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RAISE EXCEPTION 'Quiz not found or access denied';
  END IF;

  -- Delete quiz attempts first (foreign key constraint)
  DELETE FROM quiz_attempts WHERE template_id = p_quiz_id;
  
  -- Delete quiz questions (if any exist in separate table)
  DELETE FROM quiz_questions WHERE template_id = p_quiz_id;
  
  -- Delete the quiz template
  DELETE FROM quiz_templates WHERE id = p_quiz_id;
  
  RETURN true;
END;
$$;

-- Function to activate a quiz and deactivate others
CREATE OR REPLACE FUNCTION activate_quiz_template(p_quiz_id uuid, p_teacher_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the quiz belongs to the teacher
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RAISE EXCEPTION 'Quiz not found or access denied';
  END IF;

  -- Deactivate all other quizzes for this teacher
  UPDATE quiz_templates 
  SET is_active = false 
  WHERE teacher_username = p_teacher_username AND id != p_quiz_id;
  
  -- Activate the selected quiz
  UPDATE quiz_templates 
  SET is_active = true 
  WHERE id = p_quiz_id;
  
  RETURN true;
END;
$$;

-- Function to deactivate a quiz
CREATE OR REPLACE FUNCTION deactivate_quiz_template(p_quiz_id uuid, p_teacher_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the quiz belongs to the teacher
  IF NOT EXISTS (
    SELECT 1 FROM quiz_templates 
    WHERE id = p_quiz_id AND teacher_username = p_teacher_username
  ) THEN
    RAISE EXCEPTION 'Quiz not found or access denied';
  END IF;

  -- Deactivate the quiz
  UPDATE quiz_templates 
  SET is_active = false 
  WHERE id = p_quiz_id;
  
  RETURN true;
END;
$$;

-- Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_quiz_templates_teacher_active 
ON quiz_templates(teacher_username, is_active);

CREATE INDEX IF NOT EXISTS idx_quiz_templates_teacher_created 
ON quiz_templates(teacher_username, created_at DESC);

-- Update RLS policies to ensure teachers can manage their own quizzes
DROP POLICY IF EXISTS "Teachers can manage quiz templates" ON quiz_templates;
CREATE POLICY "Teachers can manage quiz templates"
  ON quiz_templates
  FOR ALL
  TO authenticated
  USING (teacher_username = (uid())::text)
  WITH CHECK (teacher_username = (uid())::text);

-- Ensure public access for students to read active quizzes
DROP POLICY IF EXISTS "Students can view active quizzes" ON quiz_templates;
CREATE POLICY "Students can view active quizzes"
  ON quiz_templates
  FOR SELECT
  TO public
  USING (is_active = true);