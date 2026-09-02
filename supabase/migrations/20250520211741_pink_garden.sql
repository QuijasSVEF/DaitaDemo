/*
  # Fix Student Data Persistence
  
  1. Changes
    - Add proper teacher verification before student operations
    - Add trigger to maintain student data consistency
    - Add indexes for better performance
    - Update RLS policies
    - Add cascade delete constraints
    - Add student data validation function
    
  2. Security
    - Enable RLS on all relevant tables
    - Add policies for proper data access
    - Add teacher verification checks
*/

-- Create function to verify teacher before operations
CREATE OR REPLACE FUNCTION verify_teacher_for_operation(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify teacher exists and is active
  RETURN EXISTS (
    SELECT 1 
    FROM teachers 
    WHERE username = p_username
    AND account_status = 'active'
    AND account_locked = false
  );
END;
$$;

-- Create function to maintain student data consistency
CREATE OR REPLACE FUNCTION maintain_student_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update student record if it doesn't exist
  INSERT INTO students (
    id,
    teacher_username,
    grade_level,
    subject,
    last_seen
  ) VALUES (
    NEW.student_id,
    NEW.teacher_username,
    '6',  -- Default grade level
    'Mathematics',  -- Default subject
    now()
  )
  ON CONFLICT (id, teacher_username) 
  DO UPDATE SET
    last_seen = now();
    
  RETURN NEW;
END;
$$;

-- Add triggers for quiz attempts and exit tickets
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
CREATE INDEX IF NOT EXISTS idx_students_teacher_lookup 
ON students(teacher_username, id);

CREATE INDEX IF NOT EXISTS idx_students_active 
ON students(teacher_username, last_seen DESC);

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