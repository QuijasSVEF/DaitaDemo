/*
  # Fix Login Validation

  1. Changes
    - Fix password verification in handle_teacher_login function
    - Add proper error handling for invalid credentials
    - Improve account locking logic
    - Add audit logging for login attempts

  2. Security
    - Use proper password comparison with crypt()
    - Track failed login attempts
    - Lock accounts after 5 failed attempts
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS handle_teacher_login(text, text, boolean);

-- Function to handle teacher login with proper password validation
CREATE FUNCTION handle_teacher_login(
  p_username TEXT,
  p_password TEXT,
  p_remember_me BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_account_locked BOOLEAN;
  v_failed_attempts INTEGER;
  v_temp_password BOOLEAN;
  v_password_hash TEXT;
  v_name TEXT;
BEGIN
  -- Get teacher account info
  SELECT 
    ta.id,
    ta.account_locked,
    ta.failed_login_attempts,
    ta.temp_password,
    ta.password_hash,
    t.name
  INTO
    v_teacher_id,
    v_account_locked,
    v_failed_attempts,
    v_temp_password,
    v_password_hash,
    v_name
  FROM teacher_accounts ta
  JOIN teachers t ON t.username = ta.username
  WHERE ta.username = p_username;

  -- Check if account exists
  IF NOT FOUND THEN
    -- Log failed attempt for non-existent account
    INSERT INTO admin_audit_logs (
      action,
      target_type,
      target_id,
      details,
      ip_address
    ) VALUES (
      'failed_login',
      'teacher',
      p_username,
      jsonb_build_object(
        'reason', 'account_not_found',
        'timestamp', now()
      ),
      inet_client_addr()
    );

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;

  -- Check if account is locked
  IF v_account_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account is locked. Please contact an administrator.'
    );
  END IF;

  -- Verify password using crypt()
  IF v_password_hash IS NULL OR crypt(p_password, v_password_hash) != v_password_hash THEN
    -- Increment failed attempts
    UPDATE teacher_accounts
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      -- Lock account after 5 failed attempts
      account_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE false 
      END,
      -- Update last failed attempt timestamp
      last_failed_login = now()
    WHERE username = p_username
    RETURNING failed_login_attempts INTO v_failed_attempts;

    -- Log failed attempt
    INSERT INTO admin_audit_logs (
      admin_id,
      action,
      target_type,
      target_id,
      details,
      ip_address
    ) VALUES (
      v_teacher_id,
      'failed_login',
      'teacher',
      p_username,
      jsonb_build_object(
        'reason', 'invalid_password',
        'attempts', v_failed_attempts,
        'timestamp', now()
      ),
      inet_client_addr()
    );

    -- Return error with attempts remaining
    RETURN jsonb_build_object(
      'success', false,
      'message', CASE
        WHEN v_failed_attempts >= 5 THEN 'Account has been locked. Please contact an administrator.'
        ELSE 'Invalid credentials. ' || (5 - v_failed_attempts)::TEXT || ' attempts remaining.'
      END
    );
  END IF;

  -- Successful login - update account info
  UPDATE teacher_accounts
  SET
    last_login = now(),
    login_count = COALESCE(login_count, 0) + 1,
    failed_login_attempts = 0,
    last_failed_login = NULL
  WHERE username = p_username;

  -- Log successful login
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    v_teacher_id,
    'login',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'remember_me', p_remember_me,
      'temp_password', v_temp_password
    ),
    inet_client_addr()
  );

  -- Return success with teacher info
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Login successful',
    'teacher', jsonb_build_object(
      'id', v_teacher_id,
      'username', p_username,
      'name', v_name,
      'temp_password', v_temp_password,
      'account_locked', v_account_locked
    )
  );
END;
$$;