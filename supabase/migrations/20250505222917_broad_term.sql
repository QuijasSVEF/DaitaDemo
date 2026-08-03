/*
  # Add Student Grade Setting on First Assessment
  
  1. Changes
    - Add trigger to set student grade on first quiz attempt
    - Update student grade tracking
    - Add audit logging
    
  2. Features
    - Automatic grade level assignment
    - Grade tracking
    - Audit trail
*/

-- Create function to handle grade setting
CREATE OR REPLACE FUNCTION set_student_grade_from_quiz()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed for first quiz attempt
  IF EXISTS (
    SELECT 1 
    FROM quiz_attempts 
    WHERE student_id = NEW.student_id 
    AND created_at < NEW.created_at
  ) THEN
    RETURN NEW;
  END IF;

  -- Get quiz grade level
  UPDATE students
  SET grade_level = (
    SELECT grade_level 
    FROM quiz_templates 
    WHERE id = NEW.template_id
  )
  WHERE id = NEW.student_id
  AND teacher_username = NEW.teacher_username;

  -- Log grade assignment
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'set_student_grade',
    'student',
    NEW.student_id::text,
    jsonb_build_object(
      'quiz_id', NEW.template_id,
      'grade_level', (SELECT grade_level FROM students WHERE id = NEW.student_id),
      'timestamp', now()
    ),
    inet_client_addr()
  );

  RETURN NEW;
END;
$$;

-- Create trigger to set grade on first quiz
CREATE TRIGGER set_student_grade_trigger
  AFTER INSERT
  ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_student_grade_from_quiz();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_created 
ON quiz_attempts(student_id, created_at);