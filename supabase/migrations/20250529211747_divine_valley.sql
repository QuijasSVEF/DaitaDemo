/*
  # Add RLS policy for exit tickets table

  1. Changes
    - Add RLS policy to allow teachers to insert exit tickets
    - Policy ensures teachers can only insert exit tickets for their own username
    - Requires teacher to be authenticated and have valid teacher_username claim

  2. Security
    - Enables RLS on exit_tickets table if not already enabled
    - Adds policy for INSERT operations
    - Validates teacher_username matches JWT claim
*/

-- Enable RLS if not already enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can manage exit tickets" ON exit_tickets;

-- Create new policy for teachers to manage their exit tickets
CREATE POLICY "Teachers can manage exit tickets"
ON exit_tickets
FOR ALL
TO authenticated
USING (
  teacher_username = auth.jwt() ->> 'teacher_username'
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.jwt() ->> 'teacher_username'
    AND account_status = 'active'
    AND account_locked = false
  )
)
WITH CHECK (
  teacher_username = auth.jwt() ->> 'teacher_username'
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.jwt() ->> 'teacher_username'
    AND account_status = 'active'
    AND account_locked = false
  )
);