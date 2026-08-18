/*
  # Authentication Implementation Check
  
  1. Changes
    - Add session validation function
    - Add session token handling
    - Update teacher authentication checks
    
  2. Security
    - Add RLS policies for session management
    - Ensure proper token validation
*/

-- Function to validate teacher session
CREATE OR REPLACE FUNCTION validate_teacher_session(p_session_token text)
RETURNS boolean AS $$
BEGIN
  -- Check if session exists and is not expired
  RETURN EXISTS (
    SELECT 1 
    FROM teacher_sessions 
    WHERE session_token = p_session_token
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create teacher session
CREATE OR REPLACE FUNCTION create_teacher_session(
  p_teacher_username text,
  p_user_agent text,
  p_ip_address text DEFAULT NULL
) RETURNS text AS $$
DECLARE
  v_session_token text;
  v_teacher_id uuid;
BEGIN
  -- Get teacher ID
  SELECT id INTO v_teacher_id
  FROM teacher_accounts
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

-- Add RLS policies
ALTER TABLE teacher_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can access their own sessions"
  ON teacher_sessions
  FOR ALL
  TO authenticated
  USING (teacher_id IN (
    SELECT id 
    FROM teacher_accounts 
    WHERE username = current_user
  ));