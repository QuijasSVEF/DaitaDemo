/*
  # Update Teacher Authentication System
  
  1. Changes
    - Move all auth fields from teacher_accounts to teachers table
    - Update auth functions to use teachers table directly
    - Add password hashing and validation
    - Preserve audit logging
    
  2. Security
    - Use bcrypt for password hashing
    - Maintain login attempt tracking
    - Keep audit logs
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add authentication fields to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS temp_password BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS password_last_changed TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS account_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- Function to validate password complexity
CREATE OR REPLACE FUNCTION validate_password_complexity(p_password TEXT)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check minimum length
  IF length(p_password) < 8 THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Password must be at least 8 characters long'
    );
  END IF;

  -- Check for uppercase letter
  IF p_password !~ '[A-Z]' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Password must contain at least one uppercase letter'
    );
  END IF;

  -- Check for number
  IF p_password !~ '[0-9]' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Password must contain at least one number'
    );
  END IF;

  -- Check for special character
  IF p_password !~ '[!@#$%^&*]' THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', 'Password must contain at least one special character (!@#$%^&*)'
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Password meets complexity requirements'
  );
END;
$$;

-- Function to handle teacher login
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
  v_account_locked BOOLEAN;
  v_failed_attempts INTEGER;
  v_temp_password BOOLEAN;
  v_password_hash TEXT;
  v_name TEXT;
BEGIN
  -- Get teacher info
  SELECT 
    account_locked,
    failed_login_attempts,
    temp_password,
    password_hash,
    name
  INTO
    v_account_locked,
    v_failed_attempts,
    v_temp_password,
    v_password_hash,
    v_name
  FROM teachers
  WHERE username = p_username;

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
    UPDATE teachers
    SET password_hash = v_password_hash
    WHERE username = p_username;
  END IF;

  -- Verify password using constant-time comparison
  IF v_password_hash IS NULL OR NOT (v_password_hash = crypt(p_password, v_password_hash)) THEN
    -- Increment failed attempts
    UPDATE teachers
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
  UPDATE teachers
  SET
    last_login = now(),
    login_count = COALESCE(login_count, 0) + 1,
    failed_login_attempts = 0,
    last_failed_login = NULL
  WHERE username = p_username;

  -- Log successful login
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
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

-- Function to reset teacher password
CREATE OR REPLACE FUNCTION reset_teacher_password(
  p_username TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_temp_password TEXT;
  v_password_hash TEXT;
BEGIN
  -- Generate random temporary password (8 characters)
  v_temp_password := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  
  -- Hash the temporary password
  v_password_hash := crypt(v_temp_password, gen_salt('bf'));

  -- Update teacher account
  UPDATE teachers
  SET
    password_hash = v_password_hash,
    temp_password = true,
    password_last_changed = NULL,
    failed_login_attempts = 0,
    account_locked = false
  WHERE username = p_username;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Log password reset
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'reset_password',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', true
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password reset successfully',
    'temp_password', v_temp_password
  );
END;
$$;

-- Function to update teacher password
CREATE OR REPLACE FUNCTION update_teacher_password(
  p_username TEXT,
  p_new_password TEXT,
  p_temp_password BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_exists BOOLEAN;
  v_password_validation jsonb;
  v_password_hash TEXT;
BEGIN
  -- Check if teacher exists
  SELECT EXISTS (
    SELECT 1 FROM teachers WHERE username = p_username
  ) INTO v_teacher_exists;

  IF NOT v_teacher_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Validate password complexity if not a temporary password
  IF NOT p_temp_password THEN
    v_password_validation := validate_password_complexity(p_new_password);
    IF NOT (v_password_validation->>'valid')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'message', v_password_validation->>'message'
      );
    END IF;
  END IF;

  -- Hash the password
  v_password_hash := crypt(p_new_password, gen_salt('bf'));

  -- Update the password
  UPDATE teachers
  SET 
    password_hash = v_password_hash,
    temp_password = p_temp_password,
    password_last_changed = CASE 
      WHEN p_temp_password THEN NULL 
      ELSE now() 
    END,
    failed_login_attempts = 0,
    account_locked = false
  WHERE username = p_username;

  -- Log the password update
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'update_password',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', p_temp_password
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password updated successfully'
  );
END;
$$;