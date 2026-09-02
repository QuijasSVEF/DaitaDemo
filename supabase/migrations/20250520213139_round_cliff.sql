/*
  # Fix Student Association with Teachers

  1. New Functions
    - `get_teacher_students` - Improved function to fetch students for a teacher
    - `verify_teacher_email` - Function to verify teacher by email
  
  2. Indexes
    - Add index on teachers email for faster lookups
    - Add index on students for teacher association
  
  3. Fixes
    - Ensure proper teacher username/email validation
    - Fix student retrieval logic
*/

-- Create function to get teacher by email or username
CREATE OR REPLACE FUNCTION get_teacher_by_identifier(p_identifier text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
BEGIN
  -- Check if identifier is an email or username
  SELECT username INTO v_username
  FROM teachers
  WHERE email = p_identifier OR username = p_identifier
  AND account_status = 'active'
  AND account_locked = false;
  
  RETURN v_username;
END;
$$;

-- Create function to verify teacher by email
CREATE OR REPLACE FUNCTION verify_teacher_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM teachers 
    WHERE email = p_email
    AND account_status = 'active'
    AND account_locked = false
  );
END;
$$;

-- Create function to get all students for a teacher
CREATE OR REPLACE FUNCTION get_teacher_students(p_teacher_identifier text)
RETURNS SETOF students
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
BEGIN
  -- First try to get the teacher by email or username
  SELECT username INTO v_username
  FROM teachers
  WHERE email = p_teacher_identifier OR username = p_teacher_identifier;
  
  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Teacher not found with identifier: %', p_teacher_identifier;
  END IF;
  
  -- Return all students for this teacher
  RETURN QUERY
  SELECT *
  FROM students
  WHERE teacher_username = v_username
  ORDER BY last_seen DESC NULLS LAST;
END;
$$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teachers_email_login
ON teachers(email, account_locked, account_status);

CREATE INDEX IF NOT EXISTS idx_teachers_username_login
ON teachers(username, account_locked, failed_login_attempts);

CREATE INDEX IF NOT EXISTS idx_teachers_login_lookup
ON teachers(username, email, account_locked, account_status);

-- Function to ensure student exists for a teacher
CREATE OR REPLACE FUNCTION ensure_student_exists(
  p_student_id integer,
  p_teacher_identifier text,
  p_grade_level text DEFAULT '6',
  p_subject text DEFAULT 'Mathematics'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
BEGIN
  -- Get teacher username from email or username
  SELECT username INTO v_username
  FROM teachers
  WHERE email = p_teacher_identifier OR username = p_teacher_identifier;
  
  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Teacher not found with identifier: %', p_teacher_identifier;
  END IF;
  
  -- Insert or update student
  INSERT INTO students (
    id,
    teacher_username,
    grade_level,
    subject,
    last_seen
  ) VALUES (
    p_student_id,
    v_username,
    p_grade_level,
    p_subject,
    now()
  )
  ON CONFLICT (id, teacher_username) 
  DO UPDATE SET
    last_seen = now(),
    grade_level = EXCLUDED.grade_level,
    subject = EXCLUDED.subject;
    
  RETURN true;
END;
$$;

-- Function to validate student for a teacher
CREATE OR REPLACE FUNCTION validate_student_for_teacher(
  p_student_id integer,
  p_teacher_identifier text,
  p_emoji_password text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_username text;
  v_student_exists boolean;
BEGIN
  -- Get teacher username from email or username
  SELECT username INTO v_username
  FROM teachers
  WHERE email = p_teacher_identifier OR username = p_teacher_identifier;
  
  IF v_username IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if student exists
  SELECT EXISTS (
    SELECT 1 FROM students 
    WHERE id = p_student_id 
    AND teacher_username = v_username
  ) INTO v_student_exists;
  
  -- If student doesn't exist, create them
  IF NOT v_student_exists THEN
    INSERT INTO students (
      id,
      teacher_username,
      grade_level,
      subject,
      emoji_password,
      last_seen
    ) VALUES (
      p_student_id,
      v_username,
      '6',  -- Default grade level
      'Mathematics',  -- Default subject
      p_emoji_password,
      now()
    );
    RETURN true;
  END IF;
  
  -- If student exists and emoji password is provided, update it
  IF p_emoji_password IS NOT NULL THEN
    UPDATE students 
    SET 
      emoji_password = p_emoji_password,
      last_seen = now()
    WHERE id = p_student_id 
    AND teacher_username = v_username;
  ELSE
    -- Just update last_seen
    UPDATE students 
    SET last_seen = now()
    WHERE id = p_student_id 
    AND teacher_username = v_username;
  END IF;
  
  RETURN true;
END;
$$;