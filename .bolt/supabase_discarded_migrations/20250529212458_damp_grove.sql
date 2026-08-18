-- Enable RLS on exit_tickets table
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on exit_tickets to start fresh
DO $$ 
BEGIN
  -- Drop all policies on exit_tickets
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'exit_tickets'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON exit_tickets', r.policyname);
  END LOOP;
END $$;

-- Create a new policy for INSERT operations
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
  (teacher_username = auth.jwt() ->> 'teacher_username') 
  AND 
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.jwt() ->> 'teacher_username'
    AND account_status = 'active'
    AND account_locked = false
  )
)
WITH CHECK (
  (teacher_username = auth.jwt() ->> 'teacher_username')
  AND
  EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = auth.jwt() ->> 'teacher_username'
    AND account_status = 'active'
    AND account_locked = false
  )
);