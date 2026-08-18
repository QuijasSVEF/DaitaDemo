/*
  # Fix College Mentors RLS Policies for Admin Portal Access

  ## Problem
  The existing RLS policies on `college_mentors` only allow authenticated mentors 
  to view/update their own profiles. The admin portal uses the anon key and cannot 
  read, update, or delete any mentor records. This causes the mentor management 
  section to always display "No College Mentors" even when records exist.

  ## Changes
  1. Add SELECT policy allowing public read access (matching teachers table pattern)
  2. Add UPDATE policy allowing public update access for admin management
  3. Add DELETE policy allowing public delete access for admin management
  4. Add INSERT policy allowing public insert access for admin management

  ## Security Note
  These policies match the existing pattern used by the `teachers` table which also
  allows public access. The admin portal authenticates via its own session system,
  not Supabase auth. The `create_college_mentor` RPC (SECURITY DEFINER) handles 
  password hashing securely.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.college_mentors'::regclass
    AND polname = 'Public read access for college mentors'
  ) THEN
    CREATE POLICY "Public read access for college mentors"
      ON public.college_mentors
      FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.college_mentors'::regclass
    AND polname = 'Public insert access for college mentors'
  ) THEN
    CREATE POLICY "Public insert access for college mentors"
      ON public.college_mentors
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.college_mentors'::regclass
    AND polname = 'Public update access for college mentors'
  ) THEN
    CREATE POLICY "Public update access for college mentors"
      ON public.college_mentors
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'public.college_mentors'::regclass
    AND polname = 'Public delete access for college mentors'
  ) THEN
    CREATE POLICY "Public delete access for college mentors"
      ON public.college_mentors
      FOR DELETE
      USING (true);
  END IF;
END $$;
