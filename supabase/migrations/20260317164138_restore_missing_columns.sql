/*
  # Add missing columns to teachers and admin_users tables
  
  1. Modified Tables
    - `teachers` - Add temp_password, plaintext_password, login_count, last_failed_login columns
    - `admin_users` - Add full_name, last_failed_login columns
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'temp_password') THEN
    ALTER TABLE teachers ADD COLUMN temp_password boolean DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'plaintext_password') THEN
    ALTER TABLE teachers ADD COLUMN plaintext_password text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'login_count') THEN
    ALTER TABLE teachers ADD COLUMN login_count integer DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'last_failed_login') THEN
    ALTER TABLE teachers ADD COLUMN last_failed_login timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'full_name') THEN
    ALTER TABLE admin_users ADD COLUMN full_name text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'last_failed_login') THEN
    ALTER TABLE admin_users ADD COLUMN last_failed_login timestamptz;
  END IF;
END $$;
