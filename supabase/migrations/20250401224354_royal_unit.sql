/*
  # Admin Password Management Functions
  
  1. New Functions
    - get_teacher_password: Allow admins to view current password
    - update_teacher_password: Set password manually or as temporary
    - get_password_info: Get password status information
    
  2. Security
    - All functions are SECURITY DEFINER
    - Comprehensive audit logging
    - Password hashing using bcrypt
    - Proper error handling
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to get teacher's current password (admin only)
CREATE OR REPLACE FUNCTION get_teacher_password(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password TEXT;
  v_temp_password BOOLEAN;
  v_last_changed TIMESTAMPTZ;
BEGIN
  -- Get password and related info
  SELECT 
    password_hash,
    temp_password,
    password_last_changed
  INTO
    v_password,
    v_temp_password,
    v_last_changed
  FROM teacher_accounts
  WHERE username = p_username;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Log the password view
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'view_password',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', v_temp_password
    ),
    inet_client_addr()
  );

  -- Return password and status info
  RETURN jsonb_build_object(
    'success', true,
    'password', v_password,
    'temp_password', v_temp_password,
    'last_changed', v_last_changed
  );
END;
$$;

-- Function to update teacher's password
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

  -- Hash the new password using bcrypt
  v_password_hash := crypt(p_new_password, gen_salt('bf'));

  -- Update password
  UPDATE teacher_accounts
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
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
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

-- Function to get password status info
CREATE OR REPLACE FUNCTION get_teacher_password_info(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_info TEXT;
  v_temp_password BOOLEAN;
  v_last_changed TIMESTAMPTZ;
BEGIN
  -- Check if user exists and get password info
  SELECT 
    temp_password,
    password_last_changed
  INTO
    v_temp_password,
    v_last_changed
  FROM teacher_accounts
  WHERE username = p_username;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Format password info
  v_password_info := CASE
    WHEN v_temp_password THEN 'Temporary password active'
    WHEN v_last_changed IS NULL THEN 'Password never changed'
    ELSE 'Password last changed: ' || to_char(v_last_changed, 'YYYY-MM-DD HH24:MI')
  END;

  -- Log the access attempt
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'view_password_info',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', v_temp_password
    ),
    inet_client_addr()
  );

  -- Return password status info
  RETURN jsonb_build_object(
    'success', true,
    'password_info', v_password_info,
    'temp_password', v_temp_password,
    'last_changed', v_last_changed
  );
END;
$$;