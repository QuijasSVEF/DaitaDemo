/*
  # Fix teacher authentication function

  1. Changes
    - Consolidate authentication logic into a single function
    - Add proper error handling and validation
    - Return structured response with success/error info
    - Add account locking after failed attempts
    - Track login statistics

  2. Security
    - Use secure password comparison
    - Implement rate limiting
    - Add audit logging
*/

-- Drop existing conflicting functions
DROP FUNCTION IF EXISTS authenticate_teacher(text, text);
DROP FUNCTION IF EXISTS authenticate_teacher(text, text, boolean);

-- Create new consolidated authentication function
CREATE OR REPLACE FUNCTION authenticate_teacher(
  p_username text,
  p_password text,
  p_remember_me boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher RECORD;
  v_account RECORD;
  v_password_valid boolean;
  v_result jsonb;
  v_max_attempts constant int := 5;
  v_lockout_minutes constant int := 30;
BEGIN
  -- Get teacher and account records
  SELECT t.*, ta.password_hash, ta.temp_password
  INTO v_teacher
  FROM teachers t
  LEFT JOIN teacher_accounts ta ON ta.username = t.username
  WHERE t.username = p_username;

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

  -- Check for too many recent failed attempts
  IF v_teacher.failed_login_attempts >= v_max_attempts 
     AND v_teacher.last_failed_login > NOW() - (v_lockout_minutes || ' minutes')::interval THEN
    
    -- Lock the account
    UPDATE teachers 
    SET account_locked = true
    WHERE username = p_username;
    
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Account has been locked due to too many failed attempts'
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
    -- Update failed login attempts
    UPDATE teachers
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = NOW()
    WHERE username = p_username;

    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;

  -- Reset failed attempts and update login stats
  UPDATE teachers
  SET 
    failed_login_attempts = 0,
    last_login = NOW(),
    login_count = COALESCE(login_count, 0) + 1,
    last_failed_login = NULL
  WHERE username = p_username;

  -- Log successful login
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    'teacher_login',
    'teacher',
    p_username,
    jsonb_build_object(
      'remember_me', p_remember_me,
      'temp_password', v_teacher.temp_password
    )
  );

  -- Return success with teacher data
  RETURN jsonb_build_object(
    'success', true,
    'teacher', jsonb_build_object(
      'username', v_teacher.username,
      'name', v_teacher.name,
      'temp_password', v_teacher.temp_password
    )
  );
END;
$$;

-- Add index to improve login performance
CREATE INDEX IF NOT EXISTS idx_teachers_username_login 
ON teachers (username, account_locked, failed_login_attempts);

-- Add index for failed login tracking
CREATE INDEX IF NOT EXISTS idx_teachers_failed_logins
ON teachers (username, failed_login_attempts, last_failed_login);