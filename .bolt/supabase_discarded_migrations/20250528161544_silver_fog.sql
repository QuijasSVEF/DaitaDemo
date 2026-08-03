/*
  # Add get_teacher_students function

  1. New Functions
    - `get_teacher_students`: Retrieves all students for a given teacher
      - Parameters:
        - `p_teacher_identifier`: text - The teacher's username
      - Returns: Table of student records with id, grade_level, subject, and emoji_password

  2. Security
    - Function is accessible to authenticated users only
    - Results are filtered by teacher username for security
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
  -- Verify the teacher exists
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE username = p_teacher_identifier) THEN
    RAISE EXCEPTION 'Teacher not found';
  END IF;

  -- Return the students for this teacher
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_teacher_students(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_teacher_students(text) IS 'Retrieves all students for a given teacher';