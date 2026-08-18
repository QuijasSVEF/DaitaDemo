/*
  # Fix Password Saving Function
  
  1. Changes
    - Add proper password hashing
    - Add password complexity validation
    - Improve error handling
    - Add audit logging
    
  2. Security
    - Use bcrypt for password hashing
    - Validate password requirements
    - Log all password changes
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Function to update teacher password with validation
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
    SELECT 1 FROM teacher_accounts WHERE username = p_username
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

-- Function to get teacher password info
CREATE OR REPLACE FUNCTION get_teacher_password(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash TEXT;
  v_temp_password BOOLEAN;
  v_last_changed TIMESTAMPTZ;
BEGIN
  -- Get password info
  SELECT 
    password_hash,
    temp_password,
    password_last_changed
  INTO
    v_password_hash,
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

  RETURN jsonb_build_object(
    'success', true,
    'password', v_password_hash,
    'temp_password', v_temp_password,
    'last_changed', v_last_changed
  );
END;
$$;