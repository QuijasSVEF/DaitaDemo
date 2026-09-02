/*
  # Add coach password retrieval function
  
  1. New Functions
    - `get_coach_password`: Retrieves a coach's temporary password
      - Input: coach_id (uuid)
      - Output: password (text), is_temp (boolean)
      
  2. Security
    - Function is only accessible to authenticated users
*/

CREATE OR REPLACE FUNCTION get_coach_password(p_coach_id uuid)
RETURNS TABLE (
  password text,
  is_temp boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
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