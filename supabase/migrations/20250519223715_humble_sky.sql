/*
  # Add Coaches Management Schema
  
  1. New Tables
    - `coaches`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `full_name` (text)
      - `created_at` (timestamp)
      - `last_login` (timestamp)
    - `coach_teacher_assignments`
      - Links coaches to teachers they can manage
      
  2. Security
    - Enable RLS on both tables
    - Add policies for secure access
*/

-- Create coaches table
CREATE TABLE IF NOT EXISTS coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  account_locked boolean DEFAULT false
);

-- Create coach-teacher assignments table
CREATE TABLE IF NOT EXISTS coach_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  teacher_username text REFERENCES teachers(username) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, teacher_username)
);

-- Enable RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_teacher_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for coaches
CREATE POLICY "Coaches can view their own data"
  ON coaches
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Policies for assignments
CREATE POLICY "Coaches can view their assignments"
  ON coach_teacher_assignments
  FOR SELECT
  USING (coach_id = auth.uid()::uuid);

-- Function to authenticate coach
CREATE OR REPLACE FUNCTION authenticate_coach(
  p_email text,
  p_password text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_coach coaches;
  v_success boolean;
  v_message text;
BEGIN
  -- Get coach by email
  SELECT * INTO v_coach
  FROM coaches
  WHERE email = p_email;
  
  -- Check if coach exists and password matches
  IF v_coach.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid credentials'
    );
  END IF;
  
  -- Check if account is locked
  IF v_coach.account_locked THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is locked'
    );
  END IF;
  
  -- Verify password
  IF v_coach.password_hash = crypt(p_password, v_coach.password_hash) THEN
    -- Update last login
    UPDATE coaches 
    SET last_login = now()
    WHERE id = v_coach.id;
    
    RETURN json_build_object(
      'success', true,
      'coach', json_build_object(
        'id', v_coach.id,
        'email', v_coach.email,
        'full_name', v_coach.full_name
      )
    );
  END IF;
  
  RETURN json_build_object(
    'success', false,
    'message', 'Invalid credentials'
  );
END;
$$;