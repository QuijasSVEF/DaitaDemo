/*
  # Fix Student Display for Quiz Attempts
  
  1. New Functions
    - `get_students_with_quiz_attempts`: Returns all students who have taken quizzes
    - `get_students_with_assessments`: Returns all students with any assessment data
    - `maintain_student_data_from_quiz`: Trigger function to ensure student records exist
    
  2. Triggers
    - Add trigger to maintain student data on quiz attempts
    
  3. Security
    - Functions are SECURITY DEFINER
    - Proper permissions granted
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
    COALESCE(s.grade_level, '6') AS grade_level,
    COALESCE(s.subject, 'Mathematics') AS subject,
    MAX(qa.completed_at) AS last_attempt
  FROM quiz_attempts qa
  LEFT JOIN students s ON s.id = qa.student_id AND s.teacher_username = qa.teacher_username
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
  -- First get all students from the students table
  RETURN QUERY
  WITH all_students AS (
    -- Students from the students table
    SELECT 
      s.id,
      s.grade_level,
      s.subject,
      s.last_seen
    FROM students s
    WHERE s.teacher_username = p_teacher_username
    
    UNION
    
    -- Students from quiz_attempts who might not be in students table
    SELECT DISTINCT
      qa.student_id,
      '6' AS grade_level,
      'Mathematics' AS subject,
      qa.completed_at AS last_seen
    FROM quiz_attempts qa
    WHERE qa.teacher_username = p_teacher_username
    AND NOT EXISTS (
      SELECT 1 FROM students s 
      WHERE s.id = qa.student_id 
      AND s.teacher_username = qa.teacher_username
    )
  )
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
  FROM all_students s
  WHERE EXISTS (
    SELECT 1 FROM quiz_attempts qa 
    WHERE qa.student_id = s.id AND qa.teacher_username = p_teacher_username
  )
  OR EXISTS (
    SELECT 1 FROM exit_tickets et 
    WHERE et.student_id = s.id AND et.teacher_username = p_teacher_username
  )
  ORDER BY s.last_seen DESC NULLS LAST;
END;
$$;

-- Function to ensure student records exist when quiz attempts are made
CREATE OR REPLACE FUNCTION maintain_student_data_from_quiz()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert student record if it doesn't exist
  INSERT INTO students (
    id,
    teacher_username,
    grade_level,
    subject,
    last_seen
  ) VALUES (
    NEW.student_id,
    NEW.teacher_username,
    (
      SELECT grade_level 
      FROM quiz_templates 
      WHERE id = NEW.template_id
    ),
    'Mathematics',
    COALESCE(NEW.completed_at, now())
  )
  ON CONFLICT (id, teacher_username) 
  DO UPDATE SET
    last_seen = GREATEST(students.last_seen, COALESCE(NEW.completed_at, now()));
    
  RETURN NEW;
END;
$$;

-- Create trigger to maintain student data on quiz attempts
DROP TRIGGER IF EXISTS maintain_student_data_from_quiz ON quiz_attempts;
CREATE TRIGGER maintain_student_data_from_quiz
BEFORE INSERT ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION maintain_student_data_from_quiz();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_students_with_quiz_attempts(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_students_with_assessments(TEXT) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION get_students_with_quiz_attempts IS 'Returns all students who have taken quizzes for a teacher';
COMMENT ON FUNCTION get_students_with_assessments IS 'Returns all students who have any assessment data for a teacher';
COMMENT ON FUNCTION maintain_student_data_from_quiz IS 'Ensures student records exist when quiz attempts are made';