/*
  # Add RLS Policy for Exit Tickets
  
  1. Changes
    - Enable RLS on exit_tickets table
    - Add policy for teachers to create exit tickets
    
  2. Security
    - Cast auth.uid() to text for proper comparison with teacher_username
    - Verify teacher account is active and not locked
*/

-- Enable RLS on exit_tickets table if not already enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Add policy for teachers to create exit tickets
CREATE POLICY "Teachers can create exit tickets"
ON exit_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_username = (auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM teachers
    WHERE username = (auth.uid())::text
    AND account_status = 'active'
    AND account_locked = false
  )
);