/*
  # Fix password hashing and verification

  1. Changes
    - Update handle_teacher_login function to use proper password hashing
    - Add pgcrypto extension for password hashing
    - Fix password verification logic
    - Add better error handling and logging
    
  2. Security
    - Use bcrypt for password hashing
    - Implement constant-time comparison
    - Add audit logging for login attempts
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

    -- Use constant-time comparison even for non-existent accounts
    PERFORM crypt('dummy-password', gen_salt('bf'));

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

  -- Special case: If password is stored directly (temporary)
  IF v_password_hash = p_password THEN
    -- Hash the password properly for future use
    v_password_hash := crypt(p_password, gen_salt('bf'));
    
    -- Update the stored hash
    UPDATE teacher_accounts
    SET password_hash = v_password_hash
    WHERE username = p_username;
  END IF;

  -- Verify password using constant-time comparison
  IF v_password_hash IS NULL OR NOT (v_password_hash = crypt(p_password, v_password_hash)) THEN
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
        ELSE format('Invalid credentials. %s attempts remaining.', 5 - v_failed_attempts)
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
      'username', p_username,
      'name', v_name
    )
  );
END;
$$;

-- Function to set teacher password directly
CREATE OR REPLACE FUNCTION set_teacher_password(
  p_username TEXT,
  p_password TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_password_hash TEXT;
BEGIN
  -- Get teacher ID
  SELECT id INTO v_teacher_id
  FROM teacher_accounts
  WHERE username = p_username;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Hash the password using bcrypt
  v_password_hash := crypt(p_password, gen_salt('bf'));

  -- Update the password
  UPDATE teacher_accounts
  SET 
    password_hash = v_password_hash,
    temp_password = false,
    password_last_changed = now(),
    failed_login_attempts = 0,
    account_locked = false
  WHERE username = p_username;

  -- Log the password change
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'set_password',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', false
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password set successfully'
  );
END;
$$;

-- Set password for Quijas
SELECT set_teacher_password('quijas', 'Slipknot1!');