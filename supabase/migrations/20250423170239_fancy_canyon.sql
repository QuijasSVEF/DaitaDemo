/*
  # Fix Create Teacher Account Function
  
  1. Changes
    - Drop existing overloaded functions
    - Create single function with optional password parameter
    - Add proper error handling and validation
    
  2. Security
    - Password hashing with bcrypt
    - Audit logging
    - Input validation
*/

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop existing overloaded functions
DROP FUNCTION IF EXISTS create_teacher_account(text, text, text);
DROP FUNCTION IF EXISTS create_teacher_account(text, text, text, text);

-- Create single function with optional password parameter
CREATE OR REPLACE FUNCTION create_teacher_account(
  p_username TEXT,
  p_email TEXT,
  p_full_name TEXT,
  p_password TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_temp_password TEXT;
  v_password_hash TEXT;
BEGIN
  -- Input validation
  IF p_username IS NULL OR p_email IS NULL OR p_full_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Username, email, and full name are required'
    );
  END IF;

  -- Check if username already exists
  IF EXISTS (SELECT 1 FROM teachers WHERE username = p_username) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Username already exists'
    );
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM teachers WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Email already exists'
    );
  END IF;

  -- Generate temporary password if none provided
  v_temp_password := COALESCE(p_password, substr(md5(random()::text), 1, 8));
  
  -- Hash the password
  v_password_hash := crypt(v_temp_password, gen_salt('bf'));

  -- Create teacher record
  INSERT INTO teachers (
    username,
    name,
    email,
    password_hash,
    temp_password,
    account_status
  ) VALUES (
    p_username,
    p_full_name,
    p_email,
    v_password_hash,
    p_password IS NULL,
    'active'
  );

  -- Log the account creation
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'create_account',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'email', p_email,
      'temp_password', p_password IS NULL
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Teacher account created successfully',
    'temp_password', CASE WHEN p_password IS NULL THEN v_temp_password ELSE NULL END
  );
END;
$$;