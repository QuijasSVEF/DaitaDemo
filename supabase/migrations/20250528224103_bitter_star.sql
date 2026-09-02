/*
  # Fix Exit Tickets RLS Policies
  
  1. Changes
    - Drop existing policies on exit_tickets table
    - Create new policies with proper authentication checks
    - Ensure RLS is enabled
    
  2. Security
    - Allow teachers to insert, select, update, and delete their own exit tickets
    - Use auth.uid() to verify teacher identity
*/

-- Make sure RLS is enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can delete their exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can insert exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can update their exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can view their exit tickets" ON exit_tickets;

-- Create new policies with proper authentication checks
CREATE POLICY "Teachers can insert exit tickets"
ON exit_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_username = auth.uid()::text
);

CREATE POLICY "Teachers can view their exit tickets"
ON exit_tickets
FOR SELECT
TO authenticated
USING (
  teacher_username = auth.uid()::text
);

CREATE POLICY "Teachers can update their exit tickets"
ON exit_tickets
FOR UPDATE
TO authenticated
USING (
  teacher_username = auth.uid()::text
)
WITH CHECK (
  teacher_username = auth.uid()::text
);

CREATE POLICY "Teachers can delete their exit tickets"
ON exit_tickets
FOR DELETE
TO authenticated
USING (
  teacher_username = auth.uid()::text
);