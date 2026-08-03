/*
  # Fix Teacher Students Function
  
  1. Changes
    - Drop existing function
    - Create new function with proper parameter handling
    - Fix return type to include all necessary student data
    - Add proper error handling
    
  2. Security
    - Maintain SECURITY DEFINER
    - Set proper search_path
    - Add proper permissions
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_teacher_students(text);

-- Create new function with proper parameter handling
CREATE OR REPLACE FUNCTION public.get_teacher_students(p_teacher_username text)
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
  IF p_teacher_username IS NULL OR p_teacher_username = '' THEN
    RAISE EXCEPTION 'Teacher username is required';
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
  WHERE s.teacher_username = p_teacher_username
  ORDER BY s.last_seen DESC NULLS LAST;
END;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION public.get_teacher_students(text) TO authenticated, anon;

-- Add helpful comment
COMMENT ON FUNCTION public.get_teacher_students(text) IS 'Retrieves all students for a given teacher, including their emoji passwords and last seen timestamp';