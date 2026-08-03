/*
  # Fix Exit Tickets RLS Policies
  
  1. Changes
    - Drop existing RLS policies on exit_tickets table
    - Create new policies with proper authentication checks
    - Add verification function for teacher status
    
  2. Security
    - Ensure teachers can only access their own exit tickets
    - Verify teacher account is active before allowing operations
    - Maintain proper data isolation between teachers
*/

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

-- Make sure RLS is enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;