/*
  # Fix Student Validation Function
  
  1. Changes
    - Add function to validate student and create if needed
    - Ensure emoji password is properly handled
    - Add proper error handling
    
  2. Features
    - Automatic student creation
    - Emoji password management
    - Proper validation
*/

-- Function to validate student and create if needed
CREATE OR REPLACE FUNCTION validate_and_create_student(
  p_student_id INTEGER,
  p_teacher_username TEXT,
  p_emoji_password TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_exists BOOLEAN;
  v_emoji_password TEXT;
BEGIN
  -- Check if student exists
  SELECT EXISTS (
    SELECT 1 
    FROM students 
    WHERE id = p_student_id AND teacher_username = p_teacher_username
  ) INTO v_student_exists;
  
  -- If student exists, check emoji password if provided
  IF v_student_exists AND p_emoji_password IS NOT NULL THEN
    SELECT emoji_password INTO v_emoji_password
    FROM students
    WHERE id = p_student_id AND teacher_username = p_teacher_username;
    
    -- If student has an emoji password, it must match
    IF v_emoji_password IS NOT NULL AND v_emoji_password != p_emoji_password THEN
      RETURN FALSE;
    END IF;
    
    -- If student doesn't have an emoji password, set it
    IF v_emoji_password IS NULL THEN
      UPDATE students
      SET emoji_password = p_emoji_password
      WHERE id = p_student_id AND teacher_username = p_teacher_username;
    END IF;
    
    RETURN TRUE;
  END IF;
  
  -- If student doesn't exist, create them
  IF NOT v_student_exists THEN
    INSERT INTO students (
      id,
      teacher_username,
      grade_level,
      subject,
      emoji_password
    ) VALUES (
      p_student_id,
      p_teacher_username,
      '6', -- Default grade level
      'Mathematics', -- Default subject
      p_emoji_password
    );
    RETURN TRUE;
  END IF;
  
  RETURN TRUE;
END;
$$;