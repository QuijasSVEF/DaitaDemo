/*
  # Show Plaintext Passwords
  
  1. Changes
    - Store plaintext passwords in teachers table
    - Return actual passwords instead of hashes
    - Keep password history
    
  2. Features
    - Direct password visibility
    - Password change tracking
    - Audit logging
*/

-- Add column for storing plaintext passwords if not exists
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS plaintext_password TEXT;

-- Function to get teacher password in plaintext
CREATE OR REPLACE FUNCTION get_teacher_password(
  p_username TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password TEXT;
  v_temp_password BOOLEAN;
  v_last_changed TIMESTAMPTZ;
BEGIN
  -- Get password info from teachers table
  SELECT 
    COALESCE(plaintext_password, temp_plaintext_password),
    temp_password,
    password_last_changed
  INTO
    v_password,
    v_temp_password,
    v_last_changed
  FROM teachers
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

  -- Return password info
  RETURN jsonb_build_object(
    'success', true,
    'password', v_password,
    'temp_password', v_temp_password,
    'last_changed', v_last_changed
  );
END;
$$;

-- Update create teacher function to store plaintext
CREATE OR REPLACE FUNCTION create_teacher_account(
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
  INSERT INTO teachers (
    username,
    name,
    email,
    password_hash,
    temp_password,
    temp_plaintext_password,
    plaintext_password,
    account_status
  ) VALUES (
    p_username,
    p_full_name,
    p_email,
    v_password_hash,
    true,
    v_temp_password,
    v_temp_password,
    'active'
  );

  -- Log the account creation
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'create_account',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'email', p_email,
      'temp_password', true
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Teacher account created successfully',
    'temp_password', v_temp_password
  );
END;
$$;

-- Update reset password function to store plaintext
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
  -- Generate random temporary password
  v_temp_password := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  
  -- Hash the password
  v_password_hash := crypt(v_temp_password, gen_salt('bf'));

  -- Update teacher account
  UPDATE teachers
  SET
    password_hash = v_password_hash,
    temp_password = true,
    password_last_changed = NULL,
    failed_login_attempts = 0,
    account_locked = false,
    temp_plaintext_password = v_temp_password,
    plaintext_password = v_temp_password
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

-- Update password update function to store plaintext
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
    account_locked = false,
    temp_plaintext_password = CASE
      WHEN p_temp_password THEN p_new_password
      ELSE NULL
    END,
    plaintext_password = p_new_password
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