/*
  # Fix student grade level update from quiz

  1. New Functions
    - Modified `set_student_grade_from_quiz` function to properly update student grade level from quiz template
  
  2. Changes
    - Drops existing trigger if it exists before creating a new one
    - Adds better error handling and logging
*/

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS set_student_grade_trigger ON quiz_attempts;

-- Create or replace function to set student grade level from quiz
CREATE OR REPLACE FUNCTION set_student_grade_from_quiz()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_grade_level text;
BEGIN
  -- Get quiz grade level
  SELECT grade_level INTO v_grade_level
  FROM quiz_templates 
  WHERE id = NEW.template_id;
  
  IF v_grade_level IS NOT NULL THEN
    -- Update student grade level
    UPDATE students
    SET grade_level = v_grade_level
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
        'grade_level', v_grade_level,
        'timestamp', now()
      ),
      inet_client_addr()
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error updating student grade level: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger to set grade on quiz attempt
CREATE TRIGGER set_student_grade_trigger
  AFTER INSERT
  ON quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_student_grade_from_quiz();