/*
  # Fix Student Data Persistence

  1. New Functions
    - `verify_teacher_username`: Ensures teacher exists and is active
    - `maintain_student_data`: Handles student data consistency
    - `update_student_last_seen`: Updates student activity timestamp
  
  2. Triggers
    - Add triggers for quiz attempts and exit tickets
    - Ensure student data is maintained on all operations
  
  3. Indexes
    - Add indexes for better query performance
    - Add indexes for student lookups
  
  4. Security
    - Update RLS policies
    - Add proper cascade delete constraints
*/

-- Function to verify teacher username exists and is active
CREATE OR REPLACE FUNCTION verify_teacher_username(p_username text)
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

-- Function to maintain student data consistency
CREATE OR REPLACE FUNCTION maintain_student_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First verify teacher
  IF NOT verify_teacher_username(NEW.teacher_username) THEN
    RAISE EXCEPTION 'Teacher not found or not properly configured';
  END IF;

  -- Insert or update student record
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

-- Function to update student last seen timestamp
CREATE OR REPLACE FUNCTION update_student_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE students 
  SET last_seen = now()
  WHERE id = NEW.student_id 
  AND teacher_username = NEW.teacher_username;
  RETURN NEW;
END;
$$;

-- Add triggers for quiz attempts
DROP TRIGGER IF EXISTS maintain_student_data_quiz ON quiz_attempts;
CREATE TRIGGER maintain_student_data_quiz
BEFORE INSERT ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION maintain_student_data();

DROP TRIGGER IF EXISTS update_student_seen_on_quiz ON quiz_attempts;
CREATE TRIGGER update_student_seen_on_quiz
AFTER INSERT ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION update_student_last_seen();

-- Add triggers for exit tickets
DROP TRIGGER IF EXISTS maintain_student_data_exit ON exit_tickets;
CREATE TRIGGER maintain_student_data_exit
BEFORE INSERT ON exit_tickets
FOR EACH ROW
EXECUTE FUNCTION maintain_student_data();

DROP TRIGGER IF EXISTS update_student_seen_on_exit_ticket ON exit_tickets;
CREATE TRIGGER update_student_seen_on_exit_ticket
AFTER INSERT ON exit_tickets
FOR EACH ROW
EXECUTE FUNCTION update_student_last_seen();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_teacher_lookup 
ON students(teacher_username, id);

CREATE INDEX IF NOT EXISTS idx_students_active 
ON students(teacher_username, last_seen DESC);

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
  AND verify_teacher_username(teacher_username)
)
WITH CHECK (
  teacher_username = auth.uid()::text
  AND verify_teacher_username(teacher_username)
);

DROP POLICY IF EXISTS "Teachers can manage quiz attempts" ON quiz_attempts;
CREATE POLICY "Teachers can manage quiz attempts"
ON quiz_attempts
FOR ALL
TO authenticated
USING (
  teacher_username = auth.uid()::text
  AND verify_teacher_username(teacher_username)
)
WITH CHECK (
  teacher_username = auth.uid()::text
  AND verify_teacher_username(teacher_username)
);

DROP POLICY IF EXISTS "Teachers can manage exit tickets" ON exit_tickets;
CREATE POLICY "Teachers can manage exit tickets"
ON exit_tickets
FOR ALL
TO authenticated
USING (
  teacher_username = auth.uid()::text
  AND verify_teacher_username(teacher_username)
)
WITH CHECK (
  teacher_username = auth.uid()::text
  AND verify_teacher_username(teacher_username)
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