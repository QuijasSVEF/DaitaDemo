/*
  # Fix get_teacher_students function

  1. Changes
    - Drop existing function
    - Recreate with proper parameter validation
    - Add proper security and permissions
    - Add proper error handling
    - Return correct columns
    - Add proper sorting

  2. Security
    - Add SECURITY DEFINER
    - Set search_path
    - Restrict to authenticated users
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_teacher_students(text);

-- Create new function with proper parameter handling
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
SET search_path = public
AS $$
BEGIN
  -- Validate input
  IF p_teacher_identifier IS NULL OR p_teacher_identifier = '' THEN
    RAISE EXCEPTION 'Teacher username is required';
  END IF;

  -- Verify the teacher exists and is active
  IF NOT EXISTS (
    SELECT 1 
    FROM teachers 
    WHERE username = p_teacher_identifier 
      AND account_status = 'active'
      AND account_locked = false
  ) THEN
    RAISE EXCEPTION 'Teacher not found or inactive';
  END IF;

  -- Return the student data
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_teacher_students(text) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.get_teacher_students(text) IS 'Retrieves all students for a given teacher, including their emoji passwords and last seen timestamp';