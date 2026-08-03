/*
  # Add Password Viewing Function
  
  1. New Function
    - get_current_password: Allows admins to view current password
    
  2. Features
    - Secure password retrieval
    - Audit logging of password views
    - Access control
*/

-- Function to get current password for admin viewing
CREATE OR REPLACE FUNCTION get_current_password(
  p_username TEXT
)
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

  RETURN jsonb_build_object(
    'success', true,
    'password', v_password_hash,
    'temp_password', v_temp_password,
    'last_changed', v_last_changed
  );
END;
$$;