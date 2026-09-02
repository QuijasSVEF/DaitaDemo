/*
  # Fix teacher session validation

  1. Changes
    - Add proper session validation with teacher account check
    - Add session cleanup function
    - Update RLS policies
*/

-- Drop existing functions
DROP FUNCTION IF EXISTS validate_teacher_session(text);
DROP FUNCTION IF EXISTS create_teacher_session(text, text, text);

-- Function to validate teacher session with account check
CREATE OR REPLACE FUNCTION validate_teacher_session(p_session_token text)
RETURNS boolean AS $$
DECLARE
  v_teacher_id uuid;
  v_account_status text;
  v_account_locked boolean;
BEGIN
  -- Get teacher info from session
  SELECT ta.id, ta.account_status, ta.account_locked
  INTO v_teacher_id, v_account_status, v_account_locked
  FROM teacher_sessions ts
  JOIN teacher_accounts ta ON ta.id = ts.teacher_id
  WHERE ts.session_token = p_session_token
  AND ts.expires_at > NOW();

  -- Return false if no valid session or teacher found
  IF v_teacher_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check account status
  RETURN v_account_status = 'active' AND NOT v_account_locked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create teacher session with proper checks
CREATE OR REPLACE FUNCTION create_teacher_session(
  p_teacher_username text,
  p_user_agent text,
  p_ip_address text DEFAULT NULL
) RETURNS text AS $$
DECLARE
  v_session_token text;
  v_teacher_id uuid;
  v_account_status text;
  v_account_locked boolean;
BEGIN
  -- Get teacher ID and status
  SELECT id, account_status, account_locked 
  INTO v_teacher_id, v_account_status, v_account_locked
  FROM teacher_accounts
  WHERE username = p_teacher_username;

  IF v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Teacher not found';
  END IF;

  IF v_account_locked THEN
    RAISE EXCEPTION 'Account is locked';
  END IF;

  IF v_account_status != 'active' THEN
    RAISE EXCEPTION 'Account is not active';
  END IF;

  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- Delete any existing sessions for this teacher
  DELETE FROM teacher_sessions WHERE teacher_id = v_teacher_id;

  -- Create new session
  INSERT INTO teacher_sessions (
    teacher_id,
    session_token,
    expires_at,
    remember_me,
    user_agent,
    created_at
  ) VALUES (
    v_teacher_id,
    v_session_token,
    NOW() + INTERVAL '24 hours',
    true,
    p_user_agent,
    NOW()
  );

  RETURN v_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM teacher_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies
ALTER TABLE teacher_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can access their own sessions" ON teacher_sessions;

CREATE POLICY "Teachers can access their own sessions"
  ON teacher_sessions
  FOR ALL
  TO authenticated
  USING (teacher_id IN (
    SELECT id 
    FROM teacher_accounts 
    WHERE username = current_user
    AND account_status = 'active' 
    AND NOT account_locked
  ));