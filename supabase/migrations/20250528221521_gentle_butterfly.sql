/*
  # Fix Student Dropdown Display
  
  1. New Function
    - `get_students_with_assessments_for_dropdown`: Returns all students who have taken assessments
    - Includes students from both quiz_attempts and exit_tickets
    - Ensures proper grade level and subject information
    
  2. Changes
    - Improves student data retrieval to include quiz attempts
    - Ensures students are properly displayed in dropdown
    - Handles cases where student records might not exist in students table
*/

-- Function to get all students who have taken assessments for dropdown display
CREATE OR REPLACE FUNCTION get_students_with_assessments_for_dropdown(p_teacher_username TEXT)
RETURNS TABLE (
  id INTEGER,
  grade_level TEXT,
  subject TEXT,
  last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return all students who have either quiz attempts or exit tickets
  RETURN QUERY
  
  -- First get students from the students table
  SELECT DISTINCT ON (s.id)
    s.id,
    s.grade_level,
    s.subject,
    s.last_seen
  FROM students s
  WHERE s.teacher_username = p_teacher_username
  AND (
    -- Has quiz attempts
    EXISTS (
      SELECT 1 FROM quiz_attempts qa 
      WHERE qa.student_id = s.id 
      AND qa.teacher_username = p_teacher_username
    )
    OR
    -- Has exit tickets
    EXISTS (
      SELECT 1 FROM exit_tickets et 
      WHERE et.student_id = s.id 
      AND et.teacher_username = p_teacher_username
    )
  )
  
  UNION
  
  -- Then get students from quiz_attempts who might not be in students table
  SELECT DISTINCT ON (qa.student_id)
    qa.student_id AS id,
    COALESCE(
      (SELECT qt.grade_level FROM quiz_templates qt WHERE qt.id = qa.template_id),
      '6'
    ) AS grade_level,
    'Mathematics' AS subject,
    qa.completed_at AS last_seen
  FROM quiz_attempts qa
  WHERE qa.teacher_username = p_teacher_username
  AND NOT EXISTS (
    SELECT 1 FROM students s 
    WHERE s.id = qa.student_id 
    AND s.teacher_username = qa.teacher_username
  )
  
  ORDER BY id, last_seen DESC NULLS LAST;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_students_with_assessments_for_dropdown(TEXT) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_students_with_assessments_for_dropdown IS 'Returns all students who have taken assessments for a teacher, for dropdown display';