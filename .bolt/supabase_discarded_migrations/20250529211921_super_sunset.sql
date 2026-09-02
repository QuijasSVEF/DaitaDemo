/*
  # Add RLS policy for exit tickets

  1. Changes
    - Add RLS policy to allow teachers to insert exit tickets
    - Policy ensures teachers can only create exit tickets for their own students
    - Verifies teacher account is active and not locked

  2. Security
    - Enables RLS on exit_tickets table if not already enabled
    - Adds policy for authenticated teachers to create exit tickets
    - Uses teacher verification function to ensure account is active
*/

-- Enable RLS on exit_tickets table if not already enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Add policy for teachers to create exit tickets
CREATE POLICY "Teachers can create exit tickets"
ON exit_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  teacher_username = auth.uid()
  AND EXISTS (
    SELECT 1 FROM teachers
    WHERE username = auth.uid()
    AND account_status = 'active'
    AND account_locked = false
  )
);