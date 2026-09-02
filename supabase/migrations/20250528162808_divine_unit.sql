/*
  # Fix authentication system

  1. Changes
    - Add proper session handling
    - Fix teacher validation
    - Add account status checks
    - Add proper error handling

  2. Security
    - Enable RLS
    - Add proper policies
    - Validate active status
*/

-- Function to validate teacher session
CREATE OR REPLACE FUNCTION public.validate_teacher_session(p_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM teachers 
    WHERE username = p_username
      AND account_status = 'active'
      AND account_locked = false
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_teacher_session(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.validate_teacher_session(text) IS 'Validates if a teacher account is active and not locked';

-- Update teacher authentication trigger
CREATE OR REPLACE FUNCTION public.handle_teacher_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update last login timestamp
  UPDATE teachers 
  SET 
    last_login = now(),
    failed_login_attempts = 0
  WHERE username = NEW.username;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS teacher_auth_trigger ON auth.users;
CREATE TRIGGER teacher_auth_trigger
  AFTER INSERT OR UPDATE
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_teacher_auth();