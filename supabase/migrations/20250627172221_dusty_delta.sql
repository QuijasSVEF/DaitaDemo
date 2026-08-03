/*
  # Fix Student Grade Level Setting
  
  1. Changes
    - Modify set_student_grade_from_quiz function to properly update student grade level
    - Add check for existing trigger before creating it
    
  2. Features
    - Automatically updates student grade level based on quiz template
    - Logs grade level changes in audit logs
    - Handles case where trigger might already exist
*/

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

-- Check if trigger exists before creating it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_student_grade_trigger'
  ) THEN
    CREATE TRIGGER set_student_grade_trigger
      AFTER INSERT
      ON quiz_attempts
      FOR EACH ROW
      EXECUTE FUNCTION set_student_grade_from_quiz();
  END IF;
END $$;