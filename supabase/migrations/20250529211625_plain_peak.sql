/*
  # Fix Exit Tickets RLS Policy

  1. Changes
    - Update RLS policy for exit_tickets table to properly handle teacher authentication
    - Add policy to verify teacher status and ownership
    - Ensure teachers can only manage exit tickets for their own students

  2. Security
    - Maintain RLS enabled on exit_tickets table
    - Add proper authentication checks
    - Add proper teacher verification
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage exit tickets" ON exit_tickets;

-- Create new policy with proper authentication and verification
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