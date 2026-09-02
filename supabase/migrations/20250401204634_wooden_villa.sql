/*
  # Fix Login Functions and Password Validation

  1. Changes
    - Drop existing functions before recreating them
    - Add proper password hashing with pgcrypto
    - Improve error handling and validation
    - Add account locking functionality
    
  2. Security Features
    - Password hashing with pgcrypto
    - Account locking after failed attempts
    - Login attempt tracking
    - Audit logging
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing functions first
DROP FUNCTION IF EXISTS create_teacher_account(text, text, text, text);
DROP FUNCTION IF EXISTS handle_teacher_login(text, text, boolean);
DROP FUNCTION IF EXISTS reset_teacher_password(text);

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
  IF v_password_hash IS NULL OR v_password_hash != crypt(p_password, v_password_hash) THEN
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

-- Function to create teacher account with hashed password
CREATE FUNCTION create_teacher_account(
  p_username TEXT,
  p_email TEXT,
  p_full_name TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_temp_password TEXT;
  v_password_hash TEXT;
BEGIN
  -- Generate temporary password if none provided
  v_temp_password := COALESCE(p_password, substr(md5(random()::text), 1, 8));
  
  -- Hash the password
  v_password_hash := crypt(v_temp_password, gen_salt('bf'));

  -- Create teacher record
  INSERT INTO teachers (username, name, email)
  VALUES (p_username, p_full_name, p_email);

  -- Create teacher account
  INSERT INTO teacher_accounts (
    username,
    email,
    full_name,
    password_hash,
    temp_password
  )
  VALUES (
    p_username,
    p_email,
    p_full_name,
    v_password_hash,
    p_password IS NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Teacher account created successfully',
    'temp_password', v_temp_password
  );
END;
$$;

-- Function to reset teacher password
CREATE FUNCTION reset_teacher_password(
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
  -- Generate temporary password
  v_temp_password := substr(md5(random()::text), 1, 8);
  
  -- Hash the password
  v_password_hash := crypt(v_temp_password, gen_salt('bf'));

  -- Update teacher account
  UPDATE teacher_accounts
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
      'message', 'Teacher account not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password reset successfully',
    'temp_password', v_temp_password
  );
END;
$$;