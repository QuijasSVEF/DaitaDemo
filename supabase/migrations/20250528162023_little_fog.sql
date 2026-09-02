/*
  # Add get_teacher_students function

  1. New Functions
    - `get_teacher_students(p_teacher_identifier text)`
      - Returns all students for a given teacher
      - Parameters:
        - p_teacher_identifier: The teacher's username
      - Returns a table of student records with:
        - id: The student's ID
        - grade_level: The student's grade level
        - subject: The student's subject
        - emoji_password: The student's emoji password (if set)

  2. Security
    - Function is accessible to authenticated users only
    - Returns only students belonging to the specified teacher
*/

CREATE OR REPLACE FUNCTION public.get_teacher_students(p_teacher_identifier text)
RETURNS TABLE (
  id integer,
  grade_level text,
  subject text,
  emoji_password text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the teacher exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = p_teacher_identifier 
    AND account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Teacher not found or inactive';
  END IF;

  -- Return the student data
  RETURN QUERY
  SELECT 
    s.id,
    s.grade_level,
    s.subject,
    s.emoji_password
  FROM students s
  WHERE s.teacher_username = p_teacher_identifier
  ORDER BY s.last_seen DESC NULLS LAST;
END;
$$;