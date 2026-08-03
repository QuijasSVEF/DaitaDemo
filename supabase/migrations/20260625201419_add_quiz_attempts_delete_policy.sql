-- Add DELETE policy for quiz_attempts to allow teachers to remove individual attempts
CREATE POLICY "Quiz attempts deletable by all"
  ON quiz_attempts FOR DELETE
  TO anon, authenticated
  USING (true);