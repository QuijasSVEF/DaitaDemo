/*
  # Fix Password Reset Function
  
  1. Changes
    - Add proper teacher existence validation
    - Improve error handling and logging
    - Ensure consistent password hashing
    
  2. Security
    - Use bcrypt for password hashing
    - Proper audit logging
    - Input validation
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to reset teacher password with proper validation
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
  v_teacher_exists BOOLEAN;
  v_account_exists BOOLEAN;
BEGIN
  -- Check if teacher exists in teachers table
  SELECT EXISTS (
    SELECT 1 FROM teachers WHERE username = p_username
  ) INTO v_teacher_exists;

  -- Check if teacher account exists
  SELECT EXISTS (
    SELECT 1 FROM teacher_accounts WHERE username = p_username
  ) INTO v_account_exists;

  -- Handle missing records
  IF NOT v_teacher_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher record not found'
    );
  END IF;

  IF NOT v_account_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher account not found'
    );
  END IF;

  -- Generate random temporary password (8 characters)
  v_temp_password := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  
  -- Hash the temporary password
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

  -- Log password reset
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'reset_password',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', true,
      'teacher_exists', v_teacher_exists,
      'account_exists', v_account_exists
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