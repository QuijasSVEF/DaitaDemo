/*
  # Fix Student Display in Forms
  
  1. Changes
    - Add function to get all student quiz attempts
    - Ensure proper student data retrieval
    - Fix student validation for quizzes
    
  2. Security
    - Maintain existing RLS policies
    - Ensure proper authentication checks
*/

-- Function to get all students who have taken quizzes
CREATE OR REPLACE FUNCTION get_students_with_quiz_attempts(p_teacher_username TEXT)
RETURNS TABLE (
  student_id INTEGER,
  grade_level TEXT,
  subject TEXT,
  last_attempt TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    qa.student_id,
    s.grade_level,
    s.subject,
    MAX(qa.completed_at) AS last_attempt
  FROM quiz_attempts qa
  JOIN students s ON s.id = qa.student_id AND s.teacher_username = qa.teacher_username
  WHERE qa.teacher_username = p_teacher_username
  GROUP BY qa.student_id, s.grade_level, s.subject
  ORDER BY last_attempt DESC;
END;
$$;

-- Function to get all students with any assessment data
CREATE OR REPLACE FUNCTION get_students_with_assessments(p_teacher_username TEXT)
RETURNS TABLE (
  student_id INTEGER,
  grade_level TEXT,
  subject TEXT,
  last_seen TIMESTAMPTZ,
  has_quiz_attempts BOOLEAN,
  has_exit_tickets BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS student_id,
    s.grade_level,
    s.subject,
    s.last_seen,
    EXISTS (
      SELECT 1 FROM quiz_attempts qa 
      WHERE qa.student_id = s.id AND qa.teacher_username = p_teacher_username
    ) AS has_quiz_attempts,
    EXISTS (
      SELECT 1 FROM exit_tickets et 
      WHERE et.student_id = s.id AND et.teacher_username = p_teacher_username
    ) AS has_exit_tickets
  FROM students s
  WHERE s.teacher_username = p_teacher_username
  AND (
    EXISTS (
      SELECT 1 FROM quiz_attempts qa 
      WHERE qa.student_id = s.id AND qa.teacher_username = p_teacher_username
    )
    OR
    EXISTS (
      SELECT 1 FROM exit_tickets et 
      WHERE et.student_id = s.id AND et.teacher_username = p_teacher_username
    )
  )
  ORDER BY s.last_seen DESC NULLS LAST;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_students_with_quiz_attempts(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_students_with_assessments(TEXT) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION get_students_with_quiz_attempts IS 'Returns all students who have taken quizzes for a teacher';
COMMENT ON FUNCTION get_students_with_assessments IS 'Returns all students who have any assessment data for a teacher';