-- First check if policies exist before dropping them
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exit_tickets' AND policyname = 'Teachers can manage exit tickets'
  ) THEN
    DROP POLICY "Teachers can manage exit tickets" ON exit_tickets;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exit_tickets' AND policyname = 'Teachers can delete their exit tickets'
  ) THEN
    DROP POLICY "Teachers can delete their exit tickets" ON exit_tickets;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exit_tickets' AND policyname = 'Teachers can insert exit tickets'
  ) THEN
    DROP POLICY "Teachers can insert exit tickets" ON exit_tickets;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exit_tickets' AND policyname = 'Teachers can update their exit tickets'
  ) THEN
    DROP POLICY "Teachers can update their exit tickets" ON exit_tickets;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exit_tickets' AND policyname = 'Teachers can view their exit tickets'
  ) THEN
    DROP POLICY "Teachers can view their exit tickets" ON exit_tickets;
  END IF;
END $$;

-- Re-enable RLS
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policy for all operations if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'exit_tickets' AND policyname = 'Teachers can manage exit tickets'
  ) THEN
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
  END IF;
END $$;

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS validate_and_create_student_record(integer, text, text, text);

-- Function to validate and create student if needed - with unique name
CREATE FUNCTION validate_and_create_student_record(
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