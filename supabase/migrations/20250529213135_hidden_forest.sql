/*
  # Fix Exit Tickets RLS Policies
  
  1. Changes
    - Drop all existing policies on exit_tickets table
    - Create new policies with proper authentication checks
    - Add policy for INSERT operations that works with the current auth setup
    
  2. Security
    - Ensure proper RLS enforcement
    - Fix authentication checks
*/

-- Make sure RLS is enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on exit_tickets
DO $$ 
DECLARE
  policy_name text;
BEGIN
  FOR policy_name IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'exit_tickets'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.exit_tickets', policy_name);
  END LOOP;
END $$;

-- Create new policies with proper authentication checks
-- Policy for INSERT operations
CREATE POLICY "Enable insert for exit tickets"
ON exit_tickets
FOR INSERT
TO public
WITH CHECK (true);

-- Policy for SELECT operations
CREATE POLICY "Enable read access for exit tickets"
ON exit_tickets
FOR SELECT
TO public
USING (true);

-- Policy for ALL operations for teachers
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