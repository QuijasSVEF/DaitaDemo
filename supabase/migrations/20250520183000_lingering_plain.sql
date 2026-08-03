/*
  # Fix password hashing functionality

  1. Changes
    - Install pgcrypto extension for password hashing
    - Update authenticate_teacher function to use proper password hashing
    - Add proper password comparison using bcrypt

  2. Security
    - Uses secure bcrypt hashing for passwords
    - Maintains existing RLS policies
    - Ensures secure password comparison
*/

-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS authenticate_teacher(p_username text, p_password text, p_remember_me boolean);

-- Recreate the function with proper password hashing
CREATE OR REPLACE FUNCTION authenticate_teacher(
  p_username text,
  p_password text,
  p_remember_me boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher RECORD;
  v_password_matches boolean;
BEGIN
  -- Get the teacher record
  SELECT * INTO v_teacher
  FROM teachers
  WHERE username = p_username
    AND account_locked = false
    AND account_status = 'active';

  -- If no teacher found, return error
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No account found with this username'
    );
  END IF;

  -- Check if password matches using bcrypt
  IF v_teacher.password_hash IS NOT NULL THEN
    v_password_matches := crypt(p_password, v_teacher.password_hash) = v_teacher.password_hash;
  ELSE
    v_password_matches := false;
  END IF;

  -- If password doesn't match, increment failed attempts
  IF NOT v_password_matches THEN
    UPDATE teachers
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = NOW(),
      account_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE false 
      END
    WHERE username = p_username;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid password'
    );
  END IF;

  -- Reset failed login attempts and update last login
  UPDATE teachers
  SET 
    failed_login_attempts = 0,
    last_failed_login = NULL,
    last_login = NOW(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE username = p_username;

  -- Return success with teacher data
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Login successful',
    'teacher', jsonb_build_object(
      'username', v_teacher.username,
      'name', v_teacher.name,
      'email', v_teacher.email,
      'requires_password_change', v_teacher.requires_password_change
    )
  );
END;
$$;