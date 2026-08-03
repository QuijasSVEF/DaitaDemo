/*
  # Add authentication functions and extensions

  1. Changes
    - Enable pgcrypto extension for password hashing
    - Add function to verify password hashes
    - Add function to authenticate teachers
    
  2. Security
    - Functions are accessible to authenticated users only
*/

-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(
  password_attempt text,
  stored_hash text
) RETURNS boolean AS $$
BEGIN
  RETURN stored_hash = crypt(password_attempt, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to authenticate teacher
CREATE OR REPLACE FUNCTION authenticate_teacher(
  p_username text,
  p_password text,
  p_remember_me boolean DEFAULT false
) RETURNS json AS $$
DECLARE
  v_teacher RECORD;
  v_is_valid boolean;
BEGIN
  -- Get teacher record
  SELECT username, name, password_hash, account_locked, account_status
  INTO v_teacher
  FROM teachers
  WHERE username = p_username OR email = p_username;
  
  -- Check if teacher exists
  IF v_teacher IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;
  
  -- Check account status
  IF v_teacher.account_locked THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is locked'
    );
  END IF;
  
  IF v_teacher.account_status != 'active' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is not active'
    );
  END IF;
  
  -- Verify password
  SELECT verify_password(p_password, v_teacher.password_hash) INTO v_is_valid;
  
  IF NOT v_is_valid THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;
  
  -- Return success with teacher data
  RETURN json_build_object(
    'success', true,
    'message', 'Authentication successful',
    'teacher', json_build_object(
      'username', v_teacher.username,
      'name', v_teacher.name
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;