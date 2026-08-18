/*
  # Fix teacher authentication function

  1. Changes
    - Create new authenticate_teacher function with improved error handling
    - Add proper password validation
    - Add account status checks
    - Return detailed error messages
*/

CREATE OR REPLACE FUNCTION authenticate_teacher(
  p_username text,
  p_password text,
  p_remember_me boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher RECORD;
  v_password_valid boolean;
  v_result jsonb;
BEGIN
  -- Get teacher record
  SELECT * INTO v_teacher
  FROM teachers
  WHERE username = p_username;

  -- Check if teacher exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;

  -- Check if account is locked
  IF v_teacher.account_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is locked. Please contact an administrator.'
    );
  END IF;

  -- Verify password
  SELECT EXISTS (
    SELECT 1
    FROM teacher_accounts
    WHERE username = p_username
    AND password_hash = crypt(p_password, password_hash)
  ) INTO v_password_valid;

  IF NOT v_password_valid THEN
    -- Increment failed login attempts
    UPDATE teachers
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = NOW()
    WHERE username = p_username;

    -- Lock account after 5 failed attempts within 30 minutes
    IF (
      SELECT COUNT(*)
      FROM teachers
      WHERE username = p_username
      AND failed_login_attempts >= 5
      AND last_failed_login > NOW() - INTERVAL '30 minutes'
    ) > 0 THEN
      UPDATE teachers
      SET account_locked = true
      WHERE username = p_username;

      RETURN jsonb_build_object(
        'success', false,
        'message', 'Account has been locked due to too many failed attempts'
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;

  -- Reset failed attempts on successful login
  UPDATE teachers
  SET 
    failed_login_attempts = 0,
    last_login = NOW(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE username = p_username;

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