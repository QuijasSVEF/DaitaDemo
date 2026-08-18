/*
  # Fix get_teacher_students function

  1. Changes
    - Drop existing function first
    - Recreate function with correct return type
    - Add security definer and search path settings
    - Order results by last_seen timestamp
*/

DROP FUNCTION IF EXISTS public.get_teacher_students(text);

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