/*
  # Fix Teacher Session Creation
  
  1. Changes
    - Create a new function to create teacher sessions using email instead of username
    - Add proper error handling and validation
    - Fix parameter types and names
    
  2. Security
    - Maintain SECURITY DEFINER
    - Set proper search_path
    - Add proper error handling
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS create_teacher_session(text, text, text);

-- Create function with email parameter instead of username
CREATE OR REPLACE FUNCTION create_teacher_session(
  p_teacher_email TEXT,
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
  v_teacher_username TEXT;
  v_session_token TEXT;
BEGIN
  -- Get teacher ID and username from email
  SELECT id, username INTO v_teacher_id, v_teacher_username
  FROM teachers
  WHERE email = p_teacher_email
  AND account_status = 'active'
  AND account_locked = false;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Teacher not found or account inactive/locked';
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_teacher_session(TEXT, TEXT, TEXT) TO authenticated, anon;