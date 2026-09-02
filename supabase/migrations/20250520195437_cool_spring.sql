/*
  # Authentication System Update

  1. Changes
     - Enable pgcrypto extension
     - Create password verification function
     - Create teacher authentication function
     - Add performance indexes

  2. Security
     - Uses secure password hashing
     - Implements account locking
     - Tracks failed login attempts
*/

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS verify_password(text, text);
DROP FUNCTION IF EXISTS authenticate_teacher(text, text, boolean);

-- Create password verification function
CREATE OR REPLACE FUNCTION verify_password(
  input_password text,
  stored_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN stored_hash = crypt(input_password, stored_hash);
END;
$$;

-- Create teacher authentication function
CREATE OR REPLACE FUNCTION authenticate_teacher(
  p_email text,
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
  v_is_valid boolean;
BEGIN
  -- Get teacher record
  SELECT *
  INTO v_teacher
  FROM teachers
  WHERE email = LOWER(p_email);
  
  -- Check if teacher exists
  IF v_teacher IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;
  
  -- Check account status
  IF v_teacher.account_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is locked. Please contact an administrator.'
    );
  END IF;
  
  IF v_teacher.account_status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is not active'
    );
  END IF;
  
  -- Verify password
  SELECT verify_password(p_password, v_teacher.password_hash) INTO v_is_valid;
  
  IF NOT v_is_valid THEN
    -- Update failed login attempts
    UPDATE teachers
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = NOW(),
      account_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE false 
      END
    WHERE email = p_email;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;
  
  -- Reset failed attempts and update login timestamp
  UPDATE teachers
  SET 
    failed_login_attempts = 0,
    last_failed_login = NULL,
    last_login = NOW(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE email = p_email;
  
  -- Return success with teacher data
  RETURN jsonb_build_object(
    'success', true,
    'teacher', jsonb_build_object(
      'username', v_teacher.username,
      'name', v_teacher.name,
      'email', v_teacher.email
    )
  );
END;
$$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_teachers_email_login 
ON teachers (email, account_locked, account_status);

CREATE INDEX IF NOT EXISTS idx_teachers_failed_login 
ON teachers (email, failed_login_attempts, last_failed_login);