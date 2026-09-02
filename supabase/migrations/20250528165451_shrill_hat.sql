/*
  # Add last_failed_login column to admin_users table

  1. Changes
    - Add `last_failed_login` timestamp column to `admin_users` table
    - This column will track when an admin user last failed a login attempt
    - Column is nullable since not all users will have failed logins

  2. Rationale
    - Required for tracking failed login attempts timing
    - Used for security monitoring and account locking logic
    - Helps prevent brute force attacks by tracking failed attempt timing
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' 
    AND column_name = 'last_failed_login'
  ) THEN
    ALTER TABLE admin_users 
    ADD COLUMN last_failed_login timestamptz;
  END IF;
END $$;