/*
  # Teacher Authentication System

  1. Tables
    - `teacher_sessions` for managing authenticated sessions
    - Includes session token, expiration, and activity tracking

  2. Security
    - Row Level Security (RLS) enabled
    - Secure session validation
    - Activity tracking
    - Automatic cleanup of expired sessions

  3. Functions
    - Session validation
    - Session creation
    - Expired session cleanup
*/

-- First ensure the teachers table has the required columns
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teachers' AND column_name = 'username'
  ) THEN
    ALTER TABLE teachers ADD COLUMN username text PRIMARY KEY;
  END IF;
END $$;

-- Create teacher sessions table
CREATE TABLE IF NOT EXISTS public.teacher_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text REFERENCES teachers(username) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  user_agent text,
  ip_address text
);

-- Enable RLS
ALTER TABLE public.teacher_sessions ENABLE ROW LEVEL SECURITY;

-- Create session validation function
CREATE OR REPLACE FUNCTION public.validate_teacher_session(
  p_session_token text,
  p_username text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valid boolean;
BEGIN
  -- Update last activity and check validity
  UPDATE teacher_sessions
  SET last_activity = now()
  WHERE session_token = p_session_token
    AND username = p_username
    AND expires_at > now()
  RETURNING true INTO v_valid;

  -- Return validation result
  RETURN COALESCE(v_valid, false);
END;
$$;

-- Create session cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM teacher_sessions
  WHERE expires_at < now()
    OR last_activity < now() - interval '24 hours';
END;
$$;

-- Create function to create new session
CREATE OR REPLACE FUNCTION public.create_teacher_session(
  p_username text,
  p_user_agent text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_token text;
BEGIN
  -- Verify teacher exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM teachers
    WHERE username = p_username
      AND account_status = 'active'
      AND account_locked = false
  ) THEN
    RAISE EXCEPTION 'Invalid teacher account';
  END IF;

  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- Create session
  INSERT INTO teacher_sessions (
    username,
    session_token,
    expires_at,
    user_agent,
    ip_address
  ) VALUES (
    p_username,
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
  WHERE username = p_username;

  RETURN v_session_token;
END;
$$;

-- Add RLS policies
CREATE POLICY "Teachers can view their own sessions"
  ON teacher_sessions
  FOR SELECT
  TO authenticated
  USING (username = current_user);

CREATE POLICY "Teachers can delete their own sessions"
  ON teacher_sessions
  FOR DELETE
  TO authenticated
  USING (username = current_user);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_teacher_session(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_session(text, text, text) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.teacher_sessions IS 'Stores active teacher sessions with expiration and activity tracking';
COMMENT ON FUNCTION public.validate_teacher_session IS 'Validates and updates activity for a teacher session';
COMMENT ON FUNCTION public.create_teacher_session IS 'Creates a new session for a teacher and returns the session token';
COMMENT ON FUNCTION public.cleanup_expired_sessions IS 'Removes expired and inactive sessions';