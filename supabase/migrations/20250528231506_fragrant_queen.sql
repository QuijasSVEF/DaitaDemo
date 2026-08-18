-- First drop existing policies to clean up
DROP POLICY IF EXISTS "Teachers can manage their exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can delete their exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can insert exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can update their exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can view their exit tickets" ON exit_tickets;

-- Re-enable RLS
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policy for all operations
CREATE POLICY "Teachers can manage exit tickets"
ON exit_tickets
FOR ALL
TO authenticated
USING (
  EXISTS ( 
    SELECT 1
    FROM teachers
    WHERE (teachers.username = (auth.uid())::text) 
    AND (teachers.username = exit_tickets.teacher_username) 
    AND (teachers.account_status = 'active'::text) 
    AND (teachers.account_locked = false)
  )
)
WITH CHECK (
  EXISTS ( 
    SELECT 1
    FROM teachers
    WHERE (teachers.username = (auth.uid())::text) 
    AND (teachers.username = exit_tickets.teacher_username) 
    AND (teachers.account_status = 'active'::text) 
    AND (teachers.account_locked = false)
  )
);

-- Function to validate and create student if needed - with unique name
CREATE OR REPLACE FUNCTION validate_and_create_student_record(
  p_student_id INTEGER,
  p_teacher_username TEXT,
  p_grade_level TEXT DEFAULT '6',
  p_emoji_password TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_exists BOOLEAN;
BEGIN
  -- Check if student exists
  SELECT EXISTS (
    SELECT 1 
    FROM students 
    WHERE id = p_student_id 
    AND teacher_username = p_teacher_username
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
      p_teacher_username,
      p_grade_level,
      'Mathematics',
      p_emoji_password,
      now()
    );
    RETURN TRUE;
  END IF;
  
  -- If student exists and emoji password is provided, update it
  IF v_student_exists AND p_emoji_password IS NOT NULL THEN
    UPDATE students
    SET 
      emoji_password = p_emoji_password,
      last_seen = now()
    WHERE id = p_student_id 
    AND teacher_username = p_teacher_username;
  ELSE
    -- Just update last_seen
    UPDATE students
    SET last_seen = now()
    WHERE id = p_student_id 
    AND teacher_username = p_teacher_username;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_and_create_student_record TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION validate_and_create_student_record IS 'Validates a student and creates the record if it does not exist';