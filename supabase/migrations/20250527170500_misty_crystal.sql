/*
  # Update student creation policy

  1. Changes
    - Drop existing student creation policy if it exists
    - Recreate policy with correct permissions for quiz attempts
  
  2. Security
    - Ensures students can be created during active quiz attempts
    - Maintains RLS security for student table
*/

-- First drop the existing policy if it exists
DROP POLICY IF EXISTS "Allow student creation during quiz attempts" ON public.students;

-- Then create the policy fresh
CREATE POLICY "Allow student creation during quiz attempts"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quiz_templates qt
    WHERE qt.teacher_username = students.teacher_username
    AND qt.is_active = true
  )
);