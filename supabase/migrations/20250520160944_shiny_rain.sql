/*
  # Fix coach authentication function
  
  1. Changes
    - Drop existing function first to avoid return type conflict
    - Recreate function with proper error handling and password verification
    - Add account locking after 5 failed attempts
    - Update last login timestamp on successful login
    
  2. Security
    - Function is security definer to run with elevated privileges
    - Password verification uses crypt() for secure comparison
    - Account locking prevents brute force attacks
*/

-- First drop the existing function
DROP FUNCTION IF EXISTS authenticate_coach(text, text);

-- Recreate the function with proper return type
CREATE OR REPLACE FUNCTION authenticate_coach(
  p_email TEXT,
  p_password TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach coaches;
  v_success boolean;
  v_message text;
BEGIN
  -- Get coach record
  SELECT * INTO v_coach
  FROM coaches
  WHERE email = p_email;

  -- Initialize response
  v_success := false;
  v_message := 'Invalid credentials';

  -- Check if coach exists
  IF v_coach.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;

  -- Check if account is locked
  IF v_coach.account_locked = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is locked. Please contact support.'
    );
  END IF;

  -- Verify password
  IF v_coach.password_hash = crypt(p_password, v_coach.password_hash) THEN
    -- Reset failed attempts on successful login
    UPDATE coaches
    SET 
      failed_login_attempts = 0,
      last_login = now()
    WHERE id = v_coach.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Login successful',
      'coach', jsonb_build_object(
        'id', v_coach.id,
        'email', v_coach.email,
        'full_name', v_coach.full_name
      )
    );
  ELSE
    -- Increment failed attempts
    UPDATE coaches
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      account_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE false 
      END
    WHERE id = v_coach.id;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;
END;
$$;