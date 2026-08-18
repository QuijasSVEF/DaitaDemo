-- Function to create a new coach account
CREATE OR REPLACE FUNCTION create_coach(
  p_email text,
  p_full_name text,
  p_password text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  -- Validate input
  IF p_email IS NULL OR p_full_name IS NULL OR p_password IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'All fields are required'
    );
  END IF;

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM coaches WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Email already exists'
    );
  END IF;

  -- Create coach account
  INSERT INTO coaches (
    email,
    full_name,
    password_hash
  ) VALUES (
    p_email,
    p_full_name,
    crypt(p_password, gen_salt('bf'))
  )
  RETURNING id INTO v_coach_id;

  RETURN json_build_object(
    'success', true,
    'coach_id', v_coach_id
  );
END;
$$;