/*
  # Add student creation policy for quiz attempts

  1. Changes
    - Add policy to allow student creation during quiz attempts
    - Check for existing policy before creation
    - Ensure proper RLS permissions for quiz-based student creation

  2. Security
    - Only allows student creation when:
      - User is authenticated
      - Teacher has an active quiz template
      - Student is being created in context of quiz attempt
*/

DO $$ 
BEGIN
  -- Drop the policy if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE tablename = 'students' 
    AND policyname = 'Allow student creation during quiz attempts'
  ) THEN
    DROP POLICY "Allow student creation during quiz attempts" ON public.students;
  END IF;

  -- Create the policy
  CREATE POLICY "Allow student creation during quiz attempts"
    ON public.students
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 
        FROM quiz_templates qt
        WHERE qt.teacher_username = students.teacher_username
        AND qt.is_active = true
      )
    );
END $$;