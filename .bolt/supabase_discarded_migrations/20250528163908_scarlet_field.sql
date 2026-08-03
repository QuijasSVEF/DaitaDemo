/*
  # Teacher Sessions Implementation

  1. New Tables
    - `teacher_sessions`: Stores active teacher sessions with expiration tracking
      - `id` (uuid, primary key)
      - `teacher_id` (uuid, references teachers)
      - `session_token` (text, unique)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `last_activity` (timestamptz)
      - `user_agent` (text)
      - `ip_address` (text)

  2. Functions
    - `validate_teacher_session`: Validates and updates session activity
    - `cleanup_expired_sessions`: Removes expired/inactive sessions
    - `create_teacher_session`: Creates new teacher sessions

  3. Security
    - RLS enabled on teacher_sessions table
    - Policies for session management
    - Function permissions granted to authenticated users
*/

-- Create teacher sessions table
CREATE TABLE IF NOT EXISTS public.teacher_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  user_agent text,
  ip_address text,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.teacher_sessions ENABLE ROW LEVEL SECURITY;

-- Create session validation function
CREATE OR REPLACE FUNCTION public.validate_teacher_session(
  p_session_token text,
  p_teacher_id uuid
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
    AND teacher_id = p_teacher_id
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
SET search_path = public
AS $$
BEGIN
  DELETE FROM teacher_sessions
  WHERE expires_at < now()
    OR last_activity < now() - interval '24 hours';
END;
$$;

-- Create function to create new session
CREATE OR REPLACE FUNCTION public.create_teacher_session(
  p_teacher_id uuid,
  p_user_agent text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_token text;
BEGIN
  -- Verify teacher exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM teachers
    WHERE id = p_teacher_id
      AND account_status = 'active'
      AND account_locked = false
  ) THEN
    RAISE EXCEPTION 'Invalid teacher account';
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
    p_teacher_id,
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
  WHERE id = p_teacher_id;

  RETURN v_session_token;
END;
$$;

-- Add RLS policies
CREATE POLICY "Teachers can view their own sessions"
  ON teacher_sessions
  FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete their own sessions"
  ON teacher_sessions
  FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_teacher_session(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_session(uuid, text, text) TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.teacher_sessions IS 'Stores active teacher sessions with expiration and activity tracking';
COMMENT ON FUNCTION public.validate_teacher_session IS 'Validates and updates activity for a teacher session';
COMMENT ON FUNCTION public.create_teacher_session IS 'Creates a new session for a teacher and returns the session token';
COMMENT ON FUNCTION public.cleanup_expired_sessions IS 'Removes expired and inactive sessions';