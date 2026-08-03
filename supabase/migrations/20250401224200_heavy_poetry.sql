/*
  # Fix teacher password

  1. Changes
    - Add function to set teacher password directly
    - Hash password properly using pgcrypto
    - Reset failed login attempts
    - Clear temporary password flag
    
  2. Security
    - Use proper password hashing with bcrypt
    - Update password change timestamp
    - Log password change in audit log
*/

-- Function to set teacher password directly
CREATE OR REPLACE FUNCTION set_teacher_password(
  p_username TEXT,
  p_password TEXT
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

  -- Hash the password using bcrypt
  v_password_hash := crypt(p_password, gen_salt('bf'));

  -- Update the password
  UPDATE teacher_accounts
  SET 
    password_hash = v_password_hash,
    temp_password = false,
    password_last_changed = now(),
    failed_login_attempts = 0,
    account_locked = false
  WHERE username = p_username;

  -- Log the password change
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'set_password',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'temp_password', false
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password set successfully'
  );
END;
$$;

-- Set password for Quijas
SELECT set_teacher_password('quijas', 'Slipknot1!');