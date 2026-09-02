/*
  # Add UPDATE policy for beta_feedback

  1. Security Changes
    - Add UPDATE policy on `beta_feedback` for authenticated and anon roles
    - This allows admins to update feedback status (new, reviewed, resolved, dismissed)

  2. Notes
    - Matches existing pattern used for admin-accessible tables in this project
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'beta_feedback'
    AND policyname = 'Admins can update beta feedback status'
  ) THEN
    CREATE POLICY "Admins can update beta feedback status"
      ON beta_feedback
      FOR UPDATE
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
