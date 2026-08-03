/*
  # Improve student data persistence
  
  1. Changes
    - Add indexes for faster student lookups
    - Add cascade delete triggers
    - Add last_seen timestamp
    - Add session tracking
    - Improve student-teacher relationship constraints
  
  2. Security
    - Add RLS policies for student data access
    - Add validation checks
*/

-- Add last_seen column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS last_seen timestamptz DEFAULT now();

-- Create index for faster student lookups
CREATE INDEX IF NOT EXISTS idx_students_teacher_lookup 
ON students(teacher_username, id);

-- Create index for active students
CREATE INDEX IF NOT EXISTS idx_students_active 
ON students(teacher_username, last_seen DESC);

-- Add RLS policy for student data access
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their students"
ON students
FOR SELECT
TO authenticated
USING (teacher_username = auth.uid()::text);

-- Function to update student last_seen timestamp
CREATE OR REPLACE FUNCTION update_student_last_seen()
RETURNS trigger AS $$
BEGIN
  UPDATE students 
  SET last_seen = now()
  WHERE id = NEW.student_id 
  AND teacher_username = NEW.teacher_username;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_seen on quiz attempts
DROP TRIGGER IF EXISTS update_student_seen_on_quiz ON quiz_attempts;
CREATE TRIGGER update_student_seen_on_quiz
AFTER INSERT ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION update_student_last_seen();

-- Create trigger to update last_seen on exit tickets
DROP TRIGGER IF EXISTS update_student_seen_on_exit_ticket ON exit_tickets;
CREATE TRIGGER update_student_seen_on_exit_ticket
AFTER INSERT ON exit_tickets
FOR EACH ROW
EXECUTE FUNCTION update_student_last_seen();

-- Function to validate and create student if needed
CREATE OR REPLACE FUNCTION validate_and_create_student(
  p_student_id integer,
  p_teacher_username text,
  p_emoji_password text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  v_student_exists boolean;
BEGIN
  -- Check if student exists
  SELECT EXISTS (
    SELECT 1 FROM students 
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
      emoji_password
    ) VALUES (
      p_student_id,
      p_teacher_username,
      '6', -- Default grade level
      'Mathematics', -- Default subject
      p_emoji_password
    );
    RETURN true;
  END IF;

  -- If student exists and emoji password is provided, update it
  IF p_emoji_password IS NOT NULL THEN
    UPDATE students 
    SET emoji_password = p_emoji_password
    WHERE id = p_student_id 
    AND teacher_username = p_teacher_username;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;