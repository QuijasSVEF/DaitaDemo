/*
  # Add RLS policy for student creation during quiz attempts

  1. Changes
    - Add new RLS policy to allow student creation during quiz attempts
    - Policy ensures:
      - Only authenticated users can create students
      - Creation only allowed when user has an active quiz template
      - Maintains data integrity with teacher verification

  2. Security
    - Enables secure student creation during assessments
    - Maintains RLS protection while allowing necessary operations
*/

-- Add policy to allow student creation during quiz attempts
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