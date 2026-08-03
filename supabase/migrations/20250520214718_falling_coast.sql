/*
  # Update students table RLS policies

  1. Changes
     - Add a new policy to allow student creation during quiz attempts
     - Ensure proper authentication checks for student creation
     - Maintain existing policies for teacher access

  2. Security
     - Restricts student creation to authenticated users
     - Only allows creation when there's an active quiz for the teacher
     - Preserves existing teacher access controls
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow student creation during quiz attempts" ON public.students;

-- Create new policy to allow student creation during quiz attempts
CREATE POLICY "Allow student creation during quiz attempts"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM quiz_templates qt 
    WHERE qt.teacher_username = students.teacher_username
    AND qt.is_active = true
  )
);

-- Create function to validate student for a teacher with better error handling
CREATE OR REPLACE FUNCTION validate_student_for_quiz(
  p_student_id integer,
  p_teacher_username text,
  p_emoji_password text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_exists boolean;
  v_active_quiz_exists boolean;
BEGIN
  -- Check if teacher exists and is active
  SELECT EXISTS (
    SELECT 1 
    FROM teachers 
    WHERE username = p_teacher_username
    AND account_status = 'active'
    AND account_locked = false
  ) INTO v_teacher_exists;
  
  IF NOT v_teacher_exists THEN
    RETURN false;
  END IF;
  
  -- Check if teacher has an active quiz
  SELECT EXISTS (
    SELECT 1 
    FROM quiz_templates 
    WHERE teacher_username = p_teacher_username
    AND is_active = true
  ) INTO v_active_quiz_exists;
  
  IF NOT v_active_quiz_exists THEN
    RETURN false;
  END IF;
  
  -- Create or update student
  INSERT INTO students (
    id,
    teacher_username,
    grade_level,
    subject,
    emoji_password,
    last_seen
  ) VALUES (
    p_student_id,
    p_teacher_username,
    '6',  -- Default grade level
    'Mathematics',  -- Default subject
    p_emoji_password,
    now()
  )
  ON CONFLICT (id, teacher_username) 
  DO UPDATE SET 
    emoji_password = COALESCE(p_emoji_password, students.emoji_password),
    last_seen = now();
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

-- Create function to get active quiz for teacher
CREATE OR REPLACE FUNCTION get_active_quiz_for_teacher(p_teacher_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM quiz_templates 
    WHERE teacher_username = p_teacher_username
    AND is_active = true
  );
END;
$$;