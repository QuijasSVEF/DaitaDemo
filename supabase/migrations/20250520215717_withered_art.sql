/*
  # Update RLS policies for students table

  1. Changes
    - Add new RLS policy to allow student record creation during quiz attempts
    - Maintain existing policies for teacher access
  
  2. Security
    - Ensures teachers can still manage their students
    - Allows student creation only in the context of quiz attempts
    - Maintains data isolation between teachers
*/

-- First ensure the policy exists before dropping
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'students' 
    AND policyname = 'Allow student creation during quiz attempts'
  ) THEN
    DROP POLICY "Allow student creation during quiz attempts" ON public.students;
  END IF;
END $$;

-- Create updated policy for student creation during quiz attempts
CREATE POLICY "Allow student creation during quiz attempts" ON public.students
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_templates qt
      WHERE qt.teacher_username = students.teacher_username
      AND qt.is_active = true
    )
    OR
    (auth.uid()::text = students.teacher_username AND verify_teacher_status(students.teacher_username))
  );

-- First ensure the policy exists before dropping
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'students' 
    AND policyname = 'Teachers can manage their students'
  ) THEN
    DROP POLICY "Teachers can manage their students" ON public.students;
  END IF;
END $$;

-- Recreate the teacher management policy with updated conditions
CREATE POLICY "Teachers can manage their students" ON public.students
  FOR ALL
  TO authenticated
  USING (
    (auth.uid()::text = teacher_username AND verify_teacher_status(teacher_username))
  )
  WITH CHECK (
    (auth.uid()::text = teacher_username AND verify_teacher_status(teacher_username))
  );

-- First ensure the policy exists before dropping
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'students' 
    AND policyname = 'Teachers can view their students'
  ) THEN
    DROP POLICY "Teachers can view their students" ON public.students;
  END IF;
END $$;

-- Recreate the teacher view policy
CREATE POLICY "Teachers can view their students" ON public.students
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid()::text = teacher_username AND verify_teacher_status(teacher_username))
  );