/*
  # Fix duplicate trigger issue

  1. Changes
    - Drop existing trigger if it exists before creating it
    - Recreate the set_student_grade_from_quiz function
    - Recreate the set_student_grade_trigger
*/

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_student_grade_trigger ON quiz_attempts;

-- Create function to set student grade level from quiz
CREATE OR REPLACE FUNCTION set_student_grade_from_quiz()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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
      'grade_level', (SELECT grade_level FROM quiz_templates WHERE id = NEW.template_id),
      'timestamp', now()
    ),
    inet_client_addr()
  );

  RETURN NEW;
END;
$$;

-- Create trigger to set grade on quiz attempt
CREATE TRIGGER set_student_grade_trigger
  AFTER INSERT
  ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_student_grade_from_quiz();