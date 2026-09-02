/*
  # Update coach password retrieval function
  
  1. Changes
    - Drop existing function
    - Recreate function with correct return type
    - Return only necessary fields (password and temp status)
  
  2. Security
    - Maintain SECURITY DEFINER
    - Restrict to specific coach records
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_coach_password(uuid);

-- Recreate the function with correct return type
CREATE OR REPLACE FUNCTION get_coach_password(p_coach_id uuid)
RETURNS TABLE (
  password text,
  is_temp boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.plaintext_password as password,
    c.temp_password as is_temp
  FROM coaches c
  WHERE c.id = p_coach_id;
END;
$$;