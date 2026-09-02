/*
  # Update Exit Tickets RLS Policy

  1. Changes
    - Drop existing RLS policy for exit_tickets table
    - Create new, more permissive policy for teachers
    - Add separate policies for INSERT and SELECT operations
    
  2. Security
    - Maintains RLS protection while fixing authentication issues
    - Ensures teachers can only access their own exit tickets
    - Verifies teacher authentication status
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Teachers can manage exit tickets" ON exit_tickets;

-- Create new policies with proper authentication checks
CREATE POLICY "Teachers can insert exit tickets" ON exit_tickets
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    teacher_username = auth.uid()::text
  );

CREATE POLICY "Teachers can view their exit tickets" ON exit_tickets
  FOR SELECT 
  TO authenticated
  USING (
    teacher_username = auth.uid()::text
  );

CREATE POLICY "Teachers can update their exit tickets" ON exit_tickets
  FOR UPDATE
  TO authenticated
  USING (
    teacher_username = auth.uid()::text
  )
  WITH CHECK (
    teacher_username = auth.uid()::text
  );

CREATE POLICY "Teachers can delete their exit tickets" ON exit_tickets
  FOR DELETE
  TO authenticated
  USING (
    teacher_username = auth.uid()::text
  );