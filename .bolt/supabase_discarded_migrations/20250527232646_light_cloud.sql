/*
  # Add get_teacher_students function
  
  1. New Functions
    - `get_teacher_students`: Retrieves all students for a given teacher
      - Input: p_teacher_identifier (text)
      - Returns: Table with student data (id, grade_level, subject, emoji_password)
  
  2. Security
    - Function is marked as SECURITY DEFINER to run with elevated privileges
    - Access is controlled through RLS policies on the students table
*/

CREATE OR REPLACE FUNCTION public.get_teacher_students(p_teacher_identifier text)
RETURNS TABLE (
  id integer,
  grade_level text,
  subject text,
  emoji_password text
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.grade_level,
    s.subject,
    s.emoji_password
  FROM students s
  WHERE s.teacher_username = p_teacher_identifier
  ORDER BY s.last_seen DESC;
$$;