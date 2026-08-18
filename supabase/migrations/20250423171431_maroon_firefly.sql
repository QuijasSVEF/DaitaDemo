/*
  # Fix Password Retrieval Function
  
  1. Changes
    - Update get_teacher_password to properly retrieve from teachers table
    - Add proper error handling
    - Improve password info formatting
    
  2. Security
    - Maintain audit logging
    - Proper error handling
    - Clear return format
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS get_teacher_password(text);

-- Function to get teacher password info
CREATE OR REPLACE FUNCTION get_teacher_password(
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
  -- Get password info from teachers table
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

  -- Return password info
  RETURN jsonb_build_object(
    'success', true,
    'password', v_password_hash,
    'temp_password', v_temp_password,
    'last_changed', v_last_changed
  );
END;
$$;