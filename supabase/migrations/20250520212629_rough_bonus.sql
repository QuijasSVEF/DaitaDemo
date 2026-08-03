/*
  # Fix Student Data Consistency

  1. New Functions
    - Add function to verify teacher status
    - Add function to maintain student data consistency
    - Add function to update student last seen timestamp
  
  2. Triggers
    - Add triggers for maintaining student data on quiz attempts and exit tickets
    - Add triggers for updating student last seen timestamp
  
  3. Indexes
    - Add indexes for faster student lookups
    - Add indexes for active students
    - Add indexes for student-teacher relationships
*/

-- Function to verify teacher status
CREATE OR REPLACE FUNCTION verify_teacher_status(p_username text)
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
  IF NOT verify_teacher_status(NEW.teacher_username) THEN
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

CREATE INDEX IF NOT EXISTS idx_students_teacher_emoji 
ON students(teacher_username, emoji_password) 
WHERE emoji_password IS NOT NULL;

-- Update RLS policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view their students" ON students;
CREATE POLICY "Teachers can view their students"
ON students
FOR SELECT
TO authenticated
USING (
  teacher_username = auth.uid()::text
  AND verify_teacher_status(teacher_username)
);

DROP POLICY IF EXISTS "Teachers can manage their students" ON students;
CREATE POLICY "Teachers can manage their students"
ON students
FOR ALL
TO authenticated
USING (
  teacher_username = auth.uid()::text
  AND verify_teacher_status(teacher_username)
)
WITH CHECK (
  teacher_username = auth.uid()::text
  AND verify_teacher_status(teacher_username)
);

-- Add cascade delete constraints if not already present
DO $$ 
BEGIN
  ALTER TABLE quiz_attempts
    DROP CONSTRAINT IF EXISTS quiz_attempts_student_teacher_fkey,
    ADD CONSTRAINT quiz_attempts_student_teacher_fkey
    FOREIGN KEY (student_id, teacher_username)
    REFERENCES students(id, teacher_username)
    ON DELETE CASCADE;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ 
BEGIN
  ALTER TABLE exit_tickets
    DROP CONSTRAINT IF EXISTS exit_tickets_student_teacher_fkey,
    ADD CONSTRAINT exit_tickets_student_teacher_fkey
    FOREIGN KEY (student_id, teacher_username)
    REFERENCES students(id, teacher_username)
    ON DELETE CASCADE;
EXCEPTION
  WHEN others THEN NULL;
END $$;