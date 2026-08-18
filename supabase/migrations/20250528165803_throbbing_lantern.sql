/*
  # Fix admin session management

  1. New Tables
    - admin_sessions table for tracking admin login sessions
  
  2. Security
    - Enable RLS on admin_sessions
    - Add policy for admin access
    
  3. Functions
    - Add validate_admin_session function
    - Add create_admin_session function
*/

-- Add new columns to admin_users if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_users' 
    AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE admin_users 
      ADD COLUMN failed_login_attempts integer DEFAULT 0,
      ADD COLUMN account_locked boolean DEFAULT false,
      ADD COLUMN last_login timestamptz,
      ADD COLUMN last_failed_login timestamptz;
  END IF;
END $$;

-- Create admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Enable RLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DROP POLICY IF EXISTS "Admin users can manage their sessions" ON admin_sessions;
CREATE POLICY "Admin users can manage their sessions"
  ON admin_sessions
  FOR ALL
  TO authenticated
  USING (admin_id IN (
    SELECT id 
    FROM admin_users 
    WHERE email = current_user
  ));

-- Function to validate admin session
CREATE OR REPLACE FUNCTION validate_admin_session(p_session_token text)
RETURNS boolean AS $$
DECLARE
  v_admin_id uuid;
  v_account_locked boolean;
BEGIN
  SELECT s.admin_id, u.account_locked
  INTO v_admin_id, v_account_locked
  FROM admin_sessions s
  JOIN admin_users u ON u.id = s.admin_id
  WHERE s.session_token = p_session_token
  AND s.expires_at > now();

  RETURN v_admin_id IS NOT NULL AND NOT v_account_locked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin session
CREATE OR REPLACE FUNCTION create_admin_session(
  p_admin_id uuid,
  p_user_agent text,
  p_ip_address text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  v_session_token text;
BEGIN
  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Create session
  INSERT INTO admin_sessions (
    admin_id,
    session_token,
    expires_at,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    v_session_token,
    now() + interval '24 hours',
    p_ip_address,
    p_user_agent
  );
  
  RETURN v_session_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;