/*
  # Add RLS policies for exit tickets table

  1. Security Changes
    - Enable RLS on exit_tickets table (if not already enabled)
    - Add policy for teachers to manage their own exit tickets
    - Add policy for authenticated users to create exit tickets
    
  2. Policy Details
    - Teachers can manage (insert/select/update/delete) exit tickets for their students
    - Policy checks that:
      - The teacher_username matches the authenticated user's ID
      - The teacher has an active account and is not locked
*/

-- Enable RLS
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Add policy for teachers to manage their exit tickets
CREATE POLICY "Teachers can manage exit tickets"
ON exit_tickets
FOR ALL
TO authenticated
USING (
  teacher_username = auth.uid()::text 
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND account_status = 'active' 
    AND account_locked = false
  )
)
WITH CHECK (
  teacher_username = auth.uid()::text 
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND account_status = 'active' 
    AND account_locked = false
  )
);