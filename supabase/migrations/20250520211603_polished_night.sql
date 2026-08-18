/*
  # Fix Student Data Persistence

  1. Changes
    - Add ON DELETE CASCADE to relevant foreign keys
    - Add indexes for better query performance
    - Add trigger to maintain student data consistency
    - Add function to properly validate teacher before operations
    - Add function to ensure student data persistence
    - Add RLS policies for proper data access

  2. Security
    - Enable RLS on affected tables
    - Add policies for proper data access control
    - Ensure cascading deletes work correctly
*/

-- Create function to verify teacher before operations
CREATE OR REPLACE FUNCTION verify_teacher_for_operation(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM teachers 
    WHERE username = p_username
    AND account_status = 'active'
    AND account_locked = false
  );
END;
$$;

-- Create function to ensure student data persistence
CREATE OR REPLACE FUNCTION ensure_student_data(
  p_student_id integer,
  p_teacher_username text,
  p_grade_level text DEFAULT '6',
  p_subject text DEFAULT 'Mathematics'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First verify teacher
  IF NOT verify_teacher_for_operation(p_teacher_username) THEN
    RETURN false;
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
    p_teacher_username,
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

-- Add trigger to maintain student data consistency
CREATE OR REPLACE FUNCTION maintain_student_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure student exists and is up to date
  PERFORM ensure_student_data(
    NEW.student_id,
    NEW.teacher_username
  );
  
  RETURN NEW;
END;
$$;

-- Create triggers for quiz attempts and exit tickets
DROP TRIGGER IF EXISTS maintain_student_data_quiz ON quiz_attempts;
CREATE TRIGGER maintain_student_data_quiz
BEFORE INSERT ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION maintain_student_data();

DROP TRIGGER IF EXISTS maintain_student_data_exit ON exit_tickets;
CREATE TRIGGER maintain_student_data_exit
BEFORE INSERT ON exit_tickets
FOR EACH ROW
EXECUTE FUNCTION maintain_student_data();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_teacher 
ON quiz_attempts(student_id, teacher_username);

CREATE INDEX IF NOT EXISTS idx_exit_tickets_student_teacher
ON exit_tickets(student_id, teacher_username);

-- Update RLS policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage their students" ON students;
CREATE POLICY "Teachers can manage their students"
ON students
FOR ALL
TO authenticated
USING (
  teacher_username = auth.uid()::text
  AND verify_teacher_for_operation(teacher_username)
)
WITH CHECK (
  teacher_username = auth.uid()::text
  AND verify_teacher_for_operation(teacher_username)
);

DROP POLICY IF EXISTS "Teachers can manage quiz attempts" ON quiz_attempts;
CREATE POLICY "Teachers can manage quiz attempts"
ON quiz_attempts
FOR ALL
TO authenticated
USING (
  teacher_username = auth.uid()::text
  AND verify_teacher_for_operation(teacher_username)
)
WITH CHECK (
  teacher_username = auth.uid()::text
  AND verify_teacher_for_operation(teacher_username)
);

DROP POLICY IF EXISTS "Teachers can manage exit tickets" ON exit_tickets;
CREATE POLICY "Teachers can manage exit tickets"
ON exit_tickets
FOR ALL
TO authenticated
USING (
  teacher_username = auth.uid()::text
  AND verify_teacher_for_operation(teacher_username)
)
WITH CHECK (
  teacher_username = auth.uid()::text
  AND verify_teacher_for_operation(teacher_username)
);

-- Add cascade delete constraints
ALTER TABLE quiz_attempts
DROP CONSTRAINT IF EXISTS quiz_attempts_student_teacher_fkey,
ADD CONSTRAINT quiz_attempts_student_teacher_fkey
FOREIGN KEY (student_id, teacher_username)
REFERENCES students(id, teacher_username)
ON DELETE CASCADE;

ALTER TABLE exit_tickets
DROP CONSTRAINT IF EXISTS exit_tickets_student_teacher_fkey,
ADD CONSTRAINT exit_tickets_student_teacher_fkey
FOREIGN KEY (student_id, teacher_username)
REFERENCES students(id, teacher_username)
ON DELETE CASCADE;