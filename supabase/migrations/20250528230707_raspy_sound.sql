/*
  # Fix Exit Tickets RLS Policies

  1. Changes
    - Update RLS policies for exit_tickets table to properly handle teacher authentication
    - Add policies for INSERT operations
    - Ensure proper authentication checks using auth.uid()

  2. Security
    - Enable RLS on exit_tickets table
    - Add policies for authenticated teachers to manage their exit tickets
*/

-- First drop existing policies to clean up
DROP POLICY IF EXISTS "Teachers can delete their exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can insert exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can update their exit tickets" ON exit_tickets;
DROP POLICY IF EXISTS "Teachers can view their exit tickets" ON exit_tickets;

-- Re-enable RLS
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for all operations
CREATE POLICY "Teachers can manage their exit tickets"
ON exit_tickets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND username = teacher_username
    AND account_status = 'active'
    AND account_locked = false
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND username = teacher_username
    AND account_status = 'active'
    AND account_locked = false
  )
);