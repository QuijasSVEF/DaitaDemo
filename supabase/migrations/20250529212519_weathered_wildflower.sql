/*
  # Fix Exit Tickets RLS Policies
  
  1. Changes
    - Drop existing policies if they exist
    - Create new policies with proper auth checks
    - Add policy for teachers to create exit tickets
    - Add policy for teachers to manage their exit tickets
    
  2. Security
    - Ensure proper authentication checks
    - Verify teacher status before allowing operations
*/

-- First check if the policy exists before trying to drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'exit_tickets' 
    AND policyname = 'Teachers can create exit tickets'
  ) THEN
    DROP POLICY "Teachers can create exit tickets" ON public.exit_tickets;
  END IF;
END $$;

-- Create new policy for inserting exit tickets
CREATE POLICY "Teachers can create exit tickets"
ON public.exit_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  (teacher_username = (auth.jwt() ->> 'teacher_username'))
  AND (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE username = (auth.jwt() ->> 'teacher_username')
      AND account_status = 'active'
      AND account_locked = false
    )
  )
);

-- First check if the policy exists before trying to drop it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'exit_tickets' 
    AND policyname = 'Teachers can manage exit tickets'
  ) THEN
    DROP POLICY "Teachers can manage exit tickets" ON public.exit_tickets;
  END IF;
END $$;

-- Create new policy for all operations on exit tickets
CREATE POLICY "Teachers can manage exit tickets"
ON public.exit_tickets
FOR ALL
TO authenticated
USING (
  (teacher_username = (auth.jwt() ->> 'teacher_username'))
  AND (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE username = (auth.jwt() ->> 'teacher_username')
      AND account_status = 'active'
      AND account_locked = false
    )
  )
)
WITH CHECK (
  (teacher_username = (auth.jwt() ->> 'teacher_username'))
  AND (
    EXISTS (
      SELECT 1 FROM teachers
      WHERE username = (auth.jwt() ->> 'teacher_username')
      AND account_status = 'active'
      AND account_locked = false
    )
  )
);

-- Make sure RLS is enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;