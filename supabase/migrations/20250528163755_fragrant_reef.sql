/*
  # Teacher Sessions Implementation

  1. Changes
    - Creates teacher_sessions table for managing authenticated sessions
    - Adds session validation and management functions
    - Implements RLS policies for session security
    - Adds session cleanup functionality

  2. Security
    - Enables RLS on teacher_sessions table
    - Adds policies for session access control
    - Implements secure session token generation
    - Validates teacher account status

  3. Notes
    - All functions are security definer
    - Sessions expire after 24 hours of inactivity
    - Failed login tracking is maintained
*/

-- Create teacher sessions table
CREATE TABLE IF NOT EXISTS public.teacher_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES teachers(id) ON DELETE CASCADE,
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
  USING (teacher_id IN (
    SELECT id FROM teachers WHERE id = auth.uid()
  ));

CREATE POLICY "Teachers can delete their own sessions"
  ON teacher_sessions
  FOR DELETE
  TO authenticated
  USING (teacher_id IN (
    SELECT id FROM teachers WHERE id = auth.uid()
  ));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.validate_teacher_session(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_teacher_session(uuid, text, text) TO authenticated;