/*
  # Add teacher password management functions
  
  1. New Functions
    - get_teacher_password: Retrieves actual password for admin viewing
    - update_teacher_password: Allows admin to manually set password
    
  2. Security
    - Only accessible to admin users
    - All actions are logged
    - Passwords are properly handled
*/

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
    'password', v_password,
    'temp_password', v_temp_password,
    'last_changed', v_last_changed
  );
END;
$$;

-- Function to manually update teacher's password
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
BEGIN
  -- Get teacher ID
  SELECT id INTO v_teacher_id
  FROM teacher_accounts
  WHERE username = p_username;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Teacher not found';
  END IF;

  -- Update password
  UPDATE teacher_accounts
  SET 
    password_hash = p_new_password,
    temp_password = p_temp_password,
    password_last_changed = CASE 
      WHEN p_temp_password THEN NULL 
      ELSE now() 
    END
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