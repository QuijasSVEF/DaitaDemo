/*
  # Coach Password Management Updates
  
  1. Schema Changes
    - Add temp_password and plaintext_password columns to coaches table
  
  2. Functions
    - Drop and recreate get_coach_password function with updated return type
    - Create update_coach_password function for password management
*/

-- Add new columns to coaches table
ALTER TABLE coaches 
ADD COLUMN IF NOT EXISTS temp_password boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS plaintext_password text;

-- Drop existing function before recreating with new return type
DROP FUNCTION IF EXISTS get_coach_password(uuid);

-- Create or replace the get_coach_password function
CREATE FUNCTION get_coach_password(p_coach_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach coaches;
BEGIN
  -- Get the coach record
  SELECT * INTO v_coach
  FROM coaches
  WHERE id = p_coach_id;
  
  -- Return password info
  RETURN jsonb_build_object(
    'password', v_coach.plaintext_password,
    'is_temp', v_coach.temp_password,
    'last_changed', v_coach.password_last_changed
  );
END;
$$;

-- Create function to update coach password
CREATE OR REPLACE FUNCTION update_coach_password(
  p_coach_id uuid,
  p_new_password text,
  p_is_temp boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the coach's password
  UPDATE coaches
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    plaintext_password = CASE WHEN p_is_temp THEN p_new_password ELSE NULL END,
    temp_password = p_is_temp,
    password_last_changed = now()
  WHERE id = p_coach_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password updated successfully'
  );
END;
$$;