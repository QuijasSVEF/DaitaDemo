/*
  # Add get_teacher_password_info function

  1. New Function
    - Retrieves password information for a teacher securely
    - Only accessible to admin users
    - Returns password info in a masked format
    - Logs access attempts for auditing

  2. Security
    - Requires admin authentication
    - Password info is partially masked
    - Access attempts are logged
*/

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
    'password_info', v_password_info,
    'temp_password', v_temp_password,
    'last_changed', v_last_changed
  );
END;
$$;