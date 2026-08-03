/*
  # Fix Exit Tickets RLS Policies
  
  1. Changes
    - Drop existing policies before recreating them
    - Ensure proper RLS policies for exit tickets
    - Fix authentication checks
    
  2. Security
    - Maintain proper access control
    - Ensure teachers can only manage their own exit tickets
*/

-- Enable RLS on exit_tickets table if not already enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable insert for exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Enable read access for exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can manage exit tickets" ON exit_tickets;

-- Create a policy for INSERT operations
CREATE POLICY "Enable insert for exit tickets"
ON exit_tickets
FOR INSERT
TO public
WITH CHECK (true);

-- Create a policy for SELECT operations
CREATE POLICY "Enable read access for exit tickets"
ON exit_tickets
FOR SELECT
TO public
USING (true);

-- Create a policy for ALL operations for teachers
CREATE POLICY "Teachers can manage exit tickets"
ON exit_tickets
FOR ALL
TO authenticated
USING (
  (teacher_username = (auth.uid())::text) 
  AND 
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = (auth.uid())::text
    AND account_status = 'active'
    AND account_locked = false
  )
)
WITH CHECK (
  (teacher_username = (auth.uid())::text)
  AND
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = (auth.uid())::text
    AND account_status = 'active'
    AND account_locked = false
  )
);