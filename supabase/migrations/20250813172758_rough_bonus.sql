/*
  # Fix authenticate_teacher_by_email function

  This migration ensures the authenticate_teacher_by_email function exists and works properly
  for the teacher login system.

  1. Functions
    - authenticate_teacher_by_email: Validates teacher credentials and returns auth result
  
  2. Security
    - Function uses SECURITY DEFINER for proper access
    - Validates account status and lock status
    - Returns structured JSON response
*/

-- Drop existing function if it exists to avoid conflicts
DROP FUNCTION IF EXISTS authenticate_teacher_by_email(text, text);

-- Create the authenticate_teacher_by_email function
CREATE OR REPLACE FUNCTION authenticate_teacher_by_email(
  p_email text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_record record;
  v_password_valid boolean := false;
  v_result json;
BEGIN
  -- Input validation
  IF p_email IS NULL OR trim(p_email) = '' THEN
    SELECT json_build_object(
      'success', false,
      'message', 'Email is required'
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  IF p_password IS NULL OR trim(p_password) = '' THEN
    SELECT json_build_object(
      'success', false,
      'message', 'Password is required'
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  -- Get teacher record
  SELECT username, name, email, password_hash, account_status, account_locked, temp_password, plaintext_password
  INTO v_teacher_record
  FROM teachers
  WHERE email = trim(lower(p_email));
  
  -- Check if teacher exists
  IF NOT FOUND THEN
    SELECT json_build_object(
      'success', false,
      'message', 'Invalid email or password'
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  -- Check account status
  IF v_teacher_record.account_locked THEN
    SELECT json_build_object(
      'success', false,
      'message', 'Account is locked. Please contact an administrator.'
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  IF v_teacher_record.account_status != 'active' THEN
    SELECT json_build_object(
      'success', false,
      'message', 'Account is not active. Please contact an administrator.'
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  -- Validate password
  -- First try plaintext password for temp passwords
  IF v_teacher_record.temp_password AND v_teacher_record.plaintext_password IS NOT NULL THEN
    v_password_valid := (p_password = v_teacher_record.plaintext_password);
  END IF;
  
  -- If plaintext didn't match or doesn't exist, try hashed password
  IF NOT v_password_valid AND v_teacher_record.password_hash IS NOT NULL THEN
    v_password_valid := (crypt(p_password, v_teacher_record.password_hash) = v_teacher_record.password_hash);
  END IF;
  
  -- Check password validity
  IF NOT v_password_valid THEN
    -- Update failed login attempts
    UPDATE teachers 
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = now()
    WHERE email = trim(lower(p_email));
    
    SELECT json_build_object(
      'success', false,
      'message', 'Invalid email or password'
    ) INTO v_result;
    RETURN v_result;
  END IF;
  
  -- Update login tracking
  UPDATE teachers 
  SET 
    last_login = now(),
    login_count = COALESCE(login_count, 0) + 1,
    failed_login_attempts = 0,
    last_failed_login = NULL
  WHERE email = trim(lower(p_email));
  
  -- Return success with teacher data
  SELECT json_build_object(
    'success', true,
    'message', 'Authentication successful',
    'teacher', json_build_object(
      'username', v_teacher_record.username,
      'name', v_teacher_record.name,
      'email', v_teacher_record.email
    )
  ) INTO v_result;
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    SELECT json_build_object(
      'success', false,
      'message', 'Authentication error: ' || SQLERRM
    ) INTO v_result;
    RETURN v_result;
END;
$$;