/*
  # Fix Exit Tickets RLS Policies
  
  1. Changes
    - Enable RLS on exit_tickets table
    - Create proper policies for different operations
    - Fix authentication checks
    
  2. Security
    - Allow public read access for exit tickets
    - Allow authenticated teachers to manage their own exit tickets
*/

-- Enable RLS on exit_tickets table
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

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