/*
  # Fix coach authentication and password management

  1. Schema Changes
    - Add `failed_login_attempts` column to `coaches` table (required by authenticate_coach)
    - Add `password_last_changed` column to `coaches` table (referenced by get_coach_password)

  2. Function Updates
    - Update `create_coach` to store plaintext_password and set temp_password = true
    - Replace `get_coach_password` to return rows (SETOF) for consistent frontend handling

  3. Notes
    - The authenticate_coach function was failing because failed_login_attempts column was missing
    - Coaches created via create_coach were missing plaintext_password, making "View Password" fail
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaches' AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE coaches ADD COLUMN failed_login_attempts integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coaches' AND column_name = 'password_last_changed'
  ) THEN
    ALTER TABLE coaches ADD COLUMN password_last_changed timestamptz DEFAULT now();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_coach(p_email text, p_full_name text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  IF p_email IS NULL OR p_full_name IS NULL OR p_password IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'All fields are required'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM coaches WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Email already exists'
    );
  END IF;

  INSERT INTO coaches (
    email,
    full_name,
    password_hash,
    plaintext_password,
    temp_password,
    failed_login_attempts,
    password_last_changed
  ) VALUES (
    p_email,
    p_full_name,
    crypt(p_password, gen_salt('bf')),
    p_password,
    true,
    0,
    now()
  )
  RETURNING id INTO v_coach_id;

  RETURN json_build_object(
    'success', true,
    'coach_id', v_coach_id
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_coach_password(uuid);

CREATE FUNCTION public.get_coach_password(p_coach_id uuid)
RETURNS TABLE(password text, is_temp boolean, last_changed timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.plaintext_password,
    c.temp_password,
    c.password_last_changed
  FROM coaches c
  WHERE c.id = p_coach_id;
END;
$$;
