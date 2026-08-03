/*
  # Fix Password Update Function

  1. Changes
    - Add proper password hashing with pgcrypto
    - Add teacher existence validation
    - Add audit logging
    - Fix return type consistency
    
  2. Security Features
    - Password hashing with bcrypt
    - Audit logging of password changes
    - Input validation
*/

-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS update_teacher_password(text, text, boolean);

-- Function to update teacher password with proper hashing
CREATE FUNCTION update_teacher_password(
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
  v_password_hash TEXT;
BEGIN
  -- Check if teacher exists
  SELECT EXISTS (
    SELECT 1 
    FROM teacher_accounts 
    WHERE username = p_username
  ) INTO v_teacher_exists;

  IF NOT v_teacher_exists THEN
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