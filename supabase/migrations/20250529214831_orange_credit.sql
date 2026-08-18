-- Enable RLS on exit_tickets table
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Check if policies exist before creating them
DO $$ 
BEGIN
  -- Policy for INSERT operations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'exit_tickets' 
    AND policyname = 'Enable insert for exit tickets'
  ) THEN
    CREATE POLICY "Enable insert for exit tickets"
    ON exit_tickets
    FOR INSERT
    TO public
    WITH CHECK (true);
  END IF;

  -- Policy for SELECT operations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'exit_tickets' 
    AND policyname = 'Enable read access for exit tickets'
  ) THEN
    CREATE POLICY "Enable read access for exit tickets"
    ON exit_tickets
    FOR SELECT
    TO public
    USING (true);
  END IF;

  -- Policy for ALL operations for teachers
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'exit_tickets' 
    AND policyname = 'Teachers can manage exit tickets'
  ) THEN
    CREATE POLICY "Teachers can manage exit tickets"
    ON exit_tickets
    FOR ALL
    TO authenticated
    USING (
      (teacher_username = (auth.uid())::text) 
      AND 
      EXISTS (
        SELECT 1 FROM teachers 
        WHERE username = (auth.uid())::text
        AND account_status = 'active'
        AND account_locked = false
      )
    )
    WITH CHECK (
      (teacher_username = (auth.uid())::text)
      AND
      EXISTS (
        SELECT 1 FROM teachers 
        WHERE username = (auth.uid())::text
        AND account_status = 'active'
        AND account_locked = false
      )
    );
  END IF;
END $$;