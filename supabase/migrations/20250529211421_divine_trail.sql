-- Enable RLS if not already enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Drop the policy if it exists
DROP POLICY IF EXISTS "Teachers can manage exit tickets" ON exit_tickets;

-- Add policy for teachers to manage their exit tickets
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