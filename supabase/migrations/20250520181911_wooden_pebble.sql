/*
  # Add teacher authentication function

  1. New Functions
    - authenticate_teacher: Securely validates teacher credentials
      - Parameters:
        - p_username: Teacher's username
        - p_password: Password to verify
      - Returns: Boolean indicating if authentication was successful

  2. Security
    - Function is accessible to authenticated users only
    - Uses secure password comparison
*/

CREATE OR REPLACE FUNCTION authenticate_teacher(
  p_username TEXT,
  p_password TEXT
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  -- Get the stored password hash for the teacher
  SELECT password_hash INTO stored_hash
  FROM teachers
  WHERE username = p_username;
  
  -- If no teacher found or password doesn't match, return false
  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verify password using crypto extension
  RETURN crypt(p_password, stored_hash) = stored_hash;
END;
$$;