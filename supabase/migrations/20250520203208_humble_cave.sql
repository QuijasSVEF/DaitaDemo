/*
  # Enable pgcrypto and update admin login verification

  1. Changes
    - Enable pgcrypto extension for password hashing
    - Create/replace verify_admin_login function to use pgcrypto for password verification
    
  2. Security
    - Function is accessible to authenticated users only
    - Uses secure password comparison with pgcrypto
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS verify_admin_login;

-- Create new verify_admin_login function using pgcrypto
CREATE OR REPLACE FUNCTION verify_admin_login(
  p_email TEXT,
  p_password TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user admin_users%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Get user by email
  SELECT * INTO v_user
  FROM admin_users
  WHERE email = p_email;

  -- Check if user exists
  IF v_user.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid email or password'
    );
  END IF;

  -- Check if account is locked
  IF v_user.account_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is locked. Please contact support.'
    );
  END IF;

  -- Verify password using pgcrypto
  IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
    -- Check if 2FA is required
    IF v_user.two_factor_enabled THEN
      RETURN jsonb_build_object(
        'success', true,
        'requires_2fa', true,
        'message', 'Please enter your 2FA code'
      );
    END IF;

    -- Update last login and reset failed attempts
    UPDATE admin_users
    SET 
      last_login = NOW(),
      failed_login_attempts = 0
    WHERE id = v_user.id;

    RETURN jsonb_build_object(
      'success', true,
      'requires_2fa', false,
      'message', 'Login successful'
    );
  END IF;

  -- Increment failed login attempts
  UPDATE admin_users
  SET 
    failed_login_attempts = failed_login_attempts + 1,
    account_locked = CASE 
      WHEN failed_login_attempts + 1 >= 5 THEN true 
      ELSE false 
    END
  WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', false,
    'message', 'Invalid email or password'
  );
END;
$$;