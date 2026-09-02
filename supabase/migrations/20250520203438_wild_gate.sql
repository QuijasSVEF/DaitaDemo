/*
  # Add verify_teacher_login function

  1. New Functions
    - `verify_teacher_login(p_email text, p_password text)`
      - Verifies teacher login credentials
      - Returns boolean indicating if login is valid
      - Checks:
        - Email exists
        - Password matches
        - Account is active and not locked
  
  2. Security
    - Function is accessible to public role
    - Password verification uses secure comparison
*/

CREATE OR REPLACE FUNCTION public.verify_teacher_login(p_email text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_exists boolean;
  v_password_matches boolean;
  v_account_active boolean;
BEGIN
  -- Check if teacher exists and get account status
  SELECT 
    EXISTS(SELECT 1 FROM teachers WHERE email = p_email),
    EXISTS(
      SELECT 1 
      FROM teachers 
      WHERE email = p_email 
      AND password_hash = crypt(p_password, password_hash)
    ),
    EXISTS(
      SELECT 1 
      FROM teachers 
      WHERE email = p_email 
      AND account_status = 'active' 
      AND account_locked = false
    )
  INTO v_teacher_exists, v_password_matches, v_account_active;

  -- If teacher doesn't exist, return false
  IF NOT v_teacher_exists THEN
    RETURN false;
  END IF;

  -- If password doesn't match, increment failed attempts
  IF NOT v_password_matches THEN
    UPDATE teachers 
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = now(),
      -- Lock account after 5 failed attempts
      account_locked = CASE 
        WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true 
        ELSE account_locked 
      END
    WHERE email = p_email;
    
    RETURN false;
  END IF;

  -- If account is not active or is locked, return false
  IF NOT v_account_active THEN
    RETURN false;
  END IF;

  -- Successful login - reset failed attempts and update last login
  UPDATE teachers 
  SET 
    failed_login_attempts = 0,
    last_failed_login = NULL,
    last_login = now()
  WHERE email = p_email;

  RETURN true;
END;
$$;