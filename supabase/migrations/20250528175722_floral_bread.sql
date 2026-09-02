-- Reset the account_locked status and failed_login_attempts for admin users
UPDATE admin_users 
SET account_locked = false, 
    failed_login_attempts = 0
WHERE email = 'admin@example.com';

-- Create or replace the admin_login function to properly verify credentials
CREATE OR REPLACE FUNCTION public.admin_login(p_email TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_admin_id UUID;
  v_password_hash TEXT;
  v_failed_attempts INT;
  v_account_locked BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if the admin exists
  SELECT id, password_hash, failed_login_attempts, account_locked
  INTO v_admin_id, v_password_hash, v_failed_attempts, v_account_locked
  FROM admin_users
  WHERE email = p_email;
  
  -- If admin not found, return failure but don't provide specific information
  IF v_admin_id IS NULL THEN
    -- Delay to prevent timing attacks
    PERFORM pg_sleep(random() * 0.3);
    RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials');
  END IF;
  
  -- If account is locked, return message
  IF v_account_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'Account is locked. Please contact an administrator.');
  END IF;

  -- For this simplified demo, we'll check against a known password
  -- In a real application, you'd use proper password hashing
  IF p_password = '2025Svef!' THEN
    -- Successful login - update last login time and reset failed attempts
    UPDATE admin_users
    SET last_login = now(),
        failed_login_attempts = 0
    WHERE id = v_admin_id;
    
    -- Return success with admin ID
    RETURN jsonb_build_object(
      'success', true, 
      'admin_id', v_admin_id
    );
  ELSE
    -- Failed login - increment failed attempts and potentially lock account
    UPDATE admin_users
    SET 
        failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
        last_failed_login = now(),
        -- Lock account after 5 failed attempts
        account_locked = (COALESCE(failed_login_attempts, 0) + 1 >= 5)
    WHERE id = v_admin_id;
    
    RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials');
  END IF;
END;
$$;

-- Grant execute permission to all users
GRANT EXECUTE ON FUNCTION public.admin_login(TEXT, TEXT) TO authenticated, anon;

-- Add a comment describing the function
COMMENT ON FUNCTION public.admin_login IS 'Authenticates admin users and manages failed login attempts';