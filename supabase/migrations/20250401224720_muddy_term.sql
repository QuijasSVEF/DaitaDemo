/*
  # Fix Password Management Functions
  
  1. Changes
    - Fix temporary password generation
    - Fix manual password updates
    - Add proper password hashing
    - Improve error handling and validation
    
  2. Security
    - Use bcrypt for password hashing
    - Proper audit logging
    - Input validation
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to reset teacher password with temporary password
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

-- Function to update teacher password manually
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
  -- Input validation
  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Password must be at least 8 characters long'
    );
  END IF;

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

  -- Hash the new password
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