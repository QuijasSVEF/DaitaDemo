/*
  # Fix teacher authentication

  1. Changes
    - Simplify teacher authentication to work directly with teachers table
    - Add proper password validation
    - Fix account status checking
    - Improve error handling
    - Add proper indexing for performance

  2. Security
    - Use pgcrypto for password hashing
    - Implement proper account locking
    - Track failed login attempts
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS authenticate_teacher(text, text, boolean);

-- Create new authentication function
CREATE OR REPLACE FUNCTION authenticate_teacher(
  p_username text,
  p_password text,
  p_remember_me boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher RECORD;
  v_password_matches boolean;
BEGIN
  -- First try to find teacher by username
  SELECT * INTO v_teacher
  FROM teachers
  WHERE LOWER(username) = LOWER(p_username)
    OR LOWER(email) = LOWER(p_username);

  -- If no teacher found, return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No account found with this username'
    );
  END IF;

  -- Check account status
  IF v_teacher.account_status = 'inactive' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is inactive'
    );
  END IF;

  -- Check if account is locked
  IF v_teacher.account_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is locked'
    );
  END IF;

  -- Verify password
  v_password_matches := v_teacher.password_hash IS NOT NULL 
    AND crypt(p_password, v_teacher.password_hash) = v_teacher.password_hash;

  -- Handle failed login
  IF NOT v_password_matches THEN
    UPDATE teachers
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = NOW(),
      -- Lock account after 5 failed attempts
      account_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE false 
      END
    WHERE username = v_teacher.username;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid password'
    );
  END IF;

  -- Update login stats on success
  UPDATE teachers
  SET 
    failed_login_attempts = 0,
    last_failed_login = NULL,
    last_login = NOW(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE username = v_teacher.username;

  -- Return success with teacher data
  RETURN jsonb_build_object(
    'success', true,
    'teacher', jsonb_build_object(
      'username', v_teacher.username,
      'name', v_teacher.name
    )
  );
END;
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_teachers_login_lookup 
ON teachers (username, email, account_locked, account_status);

CREATE INDEX IF NOT EXISTS idx_teachers_failed_login 
ON teachers (username, failed_login_attempts, last_failed_login);