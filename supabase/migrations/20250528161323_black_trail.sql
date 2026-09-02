/*
  # Fix get_teacher_students function
  
  1. Changes
    - Drop existing function
    - Recreate with updated return type including last_seen
    - Set proper permissions and security
    
  2. Security
    - Function is security definer
    - Execute granted to authenticated and public roles
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_teacher_students(text);

-- Recreate function with updated return type
CREATE OR REPLACE FUNCTION public.get_teacher_students(p_teacher_identifier text)
RETURNS TABLE (
  id integer,
  grade_level text,
  subject text,
  emoji_password text,
  last_seen timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.grade_level,
    s.subject,
    s.emoji_password,
    s.last_seen
  FROM students s
  WHERE s.teacher_username = p_teacher_identifier
  ORDER BY s.last_seen DESC NULLS LAST;
END;
$$;

-- Set proper permissions
GRANT EXECUTE ON FUNCTION public.get_teacher_students(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_students(text) TO public;

COMMENT ON FUNCTION public.get_teacher_students(text) IS 'Retrieves all students for a given teacher username';