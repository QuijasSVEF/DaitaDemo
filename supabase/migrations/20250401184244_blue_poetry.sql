/*
  # Teacher Login Handler

  1. New Function
    - `handle_teacher_login`: Validates teacher credentials and handles account locking
    
  2. Features
    - Password validation
    - Account locking after failed attempts
    - Temporary password handling
    - Login tracking
    
  3. Security
    - Secure password comparison
    - Account status checks
    - Audit logging
*/

CREATE OR REPLACE FUNCTION handle_teacher_login(
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
    id,
    account_locked,
    failed_login_attempts,
    temp_password,
    password_hash,
    full_name
  INTO
    v_teacher_id,
    v_account_locked,
    v_failed_attempts,
    v_temp_password,
    v_password_hash,
    v_name
  FROM teacher_accounts
  WHERE username = p_username;

  -- Check if account exists
  IF NOT FOUND THEN
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

  -- Verify password
  IF v_password_hash IS NULL OR v_password_hash != crypt(p_password, v_password_hash) THEN
    -- Increment failed attempts
    UPDATE teacher_accounts
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      -- Lock account after 5 failed attempts
      account_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE false 
      END
    WHERE username = p_username;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;

  -- Successful login - update account info
  UPDATE teacher_accounts
  SET
    last_login = now(),
    login_count = COALESCE(login_count, 0) + 1,
    failed_login_attempts = 0
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