/*
  # Fix create_teacher_session function
  
  1. Changes
    - Drop existing function with incorrect parameters
    - Recreate function with correct parameter names
    - Add proper error handling
    
  2. Security
    - Maintain SECURITY DEFINER
    - Add proper validation
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_teacher_session(text, text, text);

-- Create function with correct parameters
CREATE OR REPLACE FUNCTION create_teacher_session(
  p_teacher_username TEXT,
  p_user_agent TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_id UUID;
  v_session_token TEXT;
BEGIN
  -- Get teacher ID from username
  SELECT id INTO v_teacher_id
  FROM teachers
  WHERE username = p_teacher_username;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Teacher not found';
  END IF;

  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- Create session
  INSERT INTO teacher_sessions (
    teacher_id,
    session_token,
    expires_at,
    user_agent,
    ip_address
  ) VALUES (
    v_teacher_id,
    v_session_token,
    now() + interval '24 hours',
    p_user_agent,
    p_ip_address
  );

  -- Update teacher last login
  UPDATE teachers
  SET 
    last_login = now(),
    failed_login_attempts = 0
  WHERE id = v_teacher_id;

  RETURN v_session_token;
END;
$$;