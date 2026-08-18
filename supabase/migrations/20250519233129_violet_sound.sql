/*
  # Add coach authentication function

  1. New Functions
    - `authenticate_coach`: Securely authenticates coaches using email and password
      - Takes email and password as parameters
      - Returns coach data and success status
      - Handles password verification and account locking

  2. Security
    - Function is accessible to public role
    - Implements account locking after failed attempts
    - Updates last login timestamp on successful login
*/

CREATE OR REPLACE FUNCTION authenticate_coach(
  p_email TEXT,
  p_password TEXT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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