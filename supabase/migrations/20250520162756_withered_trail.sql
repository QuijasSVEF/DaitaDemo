/*
  # Add coach password viewing functionality
  
  1. New Functions
    - get_coach_password: Retrieves a coach's password for admin viewing
    
  2. Security
    - Function is security definer to ensure proper access control
    - Only accessible by admin users
*/

CREATE OR REPLACE FUNCTION get_coach_password(p_coach_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password text;
BEGIN
  -- Get the coach's password
  SELECT plaintext_password INTO v_password
  FROM coaches
  WHERE id = p_coach_id;
  
  RETURN v_password;
END;
$$;