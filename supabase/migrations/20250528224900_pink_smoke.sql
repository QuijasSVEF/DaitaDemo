/*
  # Fix Exit Tickets RLS Policies

  1. Changes
    - Add INSERT policy for exit tickets table to allow teachers to create exit tickets
    - Ensure teachers can only insert exit tickets for their own students
    - Maintain existing SELECT policy

  2. Security
    - Enable RLS on exit_tickets table (already enabled)
    - Add policy for INSERT operations
    - Verify teacher authentication and ownership
*/

-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Teachers can insert exit tickets" ON public.exit_tickets;

-- Create new INSERT policy
CREATE POLICY "Teachers can insert exit tickets"
ON public.exit_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  -- Verify the teacher is authenticated and owns the student
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = student_id
    AND s.teacher_username = teacher_username
    AND teacher_username = auth.uid()::text
  )
  AND
  -- Verify the teacher account is active
  EXISTS (
    SELECT 1 FROM teachers t
    WHERE t.username = teacher_username
    AND t.account_status = 'active'
    AND NOT t.account_locked
  )
);