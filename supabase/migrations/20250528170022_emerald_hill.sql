/*
  # Fix admin authentication

  1. Changes
    - Drop problematic admin session functions and recreate them
    - Fix RLS policies for admin sessions
    - Ensure proper column types and defaults
    - Clean up any invalid session data
    
  2. Security
    - Maintain proper RLS policies
    - Keep security checks for account status
*/

-- First clean up any existing problematic functions/policies
DROP FUNCTION IF EXISTS validate_admin_session(text);
DROP FUNCTION IF EXISTS create_admin_session(uuid, text, text);
DROP POLICY IF EXISTS "Admin users can manage their sessions" ON admin_sessions;

-- Ensure admin_users has all required columns
DO $$ 
BEGIN
  ALTER TABLE admin_users 
    ADD COLUMN IF NOT EXISTS failed_login_attempts integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS account_locked boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS last_login timestamptz,
    ADD COLUMN IF NOT EXISTS last_failed_login timestamptz;
END $$;

-- Recreate admin sessions table with proper structure
DROP TABLE IF EXISTS admin_sessions;
CREATE TABLE admin_sessions (
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

-- Add proper RLS policy
CREATE POLICY "Admin users can manage their sessions"
  ON admin_sessions
  FOR ALL
  TO authenticated
  USING (admin_id IN (
    SELECT id 
    FROM admin_users 
    WHERE email = auth.jwt() ->> 'email'
  ));

-- Recreate validation function with proper error handling
CREATE OR REPLACE FUNCTION validate_admin_session(p_session_token text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.admin_id
    WHERE s.session_token = p_session_token
    AND s.expires_at > now()
    AND NOT u.account_locked
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate session creation function with proper validation
CREATE OR REPLACE FUNCTION create_admin_session(
  p_admin_id uuid,
  p_user_agent text,
  p_ip_address text DEFAULT NULL
)
RETURNS text AS $$
DECLARE
  v_session_token text;
  v_is_locked boolean;
BEGIN
  -- Check if admin account is locked
  SELECT account_locked INTO v_is_locked
  FROM admin_users
  WHERE id = p_admin_id;

  IF v_is_locked THEN
    RAISE EXCEPTION 'Account is locked';
  END IF;

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