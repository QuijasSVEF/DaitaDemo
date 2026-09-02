/*
  # Fix Password Update Functionality
  
  1. Changes
    - Modify update_teacher_password to properly hash passwords
    - Add proper error handling and validation
    - Ensure password updates are logged correctly
    
  2. Security
    - Use bcrypt for password hashing
    - Proper audit logging
    - Input validation
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS update_teacher_password(text, text, boolean);

-- Function to update teacher's password with proper hashing
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