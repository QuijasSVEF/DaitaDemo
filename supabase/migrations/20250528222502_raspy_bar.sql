/*
  # Fix RLS policies for exit tickets table

  1. Changes
    - Drop existing RLS policies for exit_tickets table
    - Create new RLS policies that properly handle teacher authentication
    - Add policies for:
      - INSERT: Teachers can create exit tickets for their students
      - SELECT: Teachers can view their own exit tickets
      - UPDATE: Teachers can update their own exit tickets
      - DELETE: Teachers can delete their own exit tickets

  2. Security
    - Enable RLS on exit_tickets table
    - Policies ensure teachers can only access their own data
    - Verify teacher authentication status before allowing operations
*/

-- Drop existing policies
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
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND account_status = 'active'
  )
);

CREATE POLICY "Teachers can view their exit tickets"
ON exit_tickets
FOR SELECT
TO authenticated
USING (
  teacher_username = auth.uid()::text 
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND account_status = 'active'
  )
);

CREATE POLICY "Teachers can update their exit tickets"
ON exit_tickets
FOR UPDATE
TO authenticated
USING (
  teacher_username = auth.uid()::text 
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND account_status = 'active'
  )
)
WITH CHECK (
  teacher_username = auth.uid()::text 
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND account_status = 'active'
  )
);

CREATE POLICY "Teachers can delete their exit tickets"
ON exit_tickets
FOR DELETE
TO authenticated
USING (
  teacher_username = auth.uid()::text 
  AND EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.uid()::text 
    AND account_status = 'active'
  )
);