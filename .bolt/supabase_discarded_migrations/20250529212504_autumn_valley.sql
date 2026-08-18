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

-- Create a simple policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations on exit tickets"
ON exit_tickets
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);