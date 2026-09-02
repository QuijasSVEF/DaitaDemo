/*
  # Fix Exit Tickets RLS Policy
  
  1. Changes
    - Drop existing restrictive policies
    - Create new policies that properly allow teachers to insert exit tickets
    - Ensure proper authentication checks
    
  2. Security
    - Maintain data isolation between teachers
    - Allow proper insertion of exit tickets
    - Preserve existing view/update/delete policies
*/

-- Make sure RLS is enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Teachers can insert exit tickets" ON public.exit_tickets;

-- Create new INSERT policy with proper permissions
CREATE POLICY "Teachers can insert exit tickets"
ON public.exit_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow teachers to insert exit tickets for their students
  (
    -- Either the teacher is authenticated as the teacher_username
    teacher_username = auth.uid()::text
    
    -- OR the teacher is creating an exit ticket for a student that belongs to them
    OR EXISTS (
      SELECT 1 
      FROM students s
      WHERE s.id = student_id 
      AND s.teacher_username = teacher_username
      AND s.teacher_username = auth.uid()::text
    )
  )
);