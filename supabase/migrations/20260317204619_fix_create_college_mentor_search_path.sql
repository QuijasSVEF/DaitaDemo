/*
  # Fix create_college_mentor function search path

  1. Changes
    - Recreates the `create_college_mentor` function with the correct search path
    - Adds `extensions` schema to search path so `crypt()` and `gen_salt()` from pgcrypto are accessible
  
  2. Security
    - Function remains SECURITY DEFINER
    - No changes to RLS policies
*/

CREATE OR REPLACE FUNCTION public.create_college_mentor(
  p_email text,
  p_full_name text,
  p_password text,
  p_phone text DEFAULT NULL,
  p_university text DEFAULT NULL,
  p_major text DEFAULT NULL
)
RETURNS TABLE(success boolean, message text, mentor_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_mentor_id uuid;
  v_hashed_password text;
BEGIN
  v_hashed_password := crypt(p_password, gen_salt('bf'));

  INSERT INTO college_mentors (
    email, full_name, password_hash, phone, university, major, account_status, account_locked
  ) VALUES (
    lower(p_email), p_full_name, v_hashed_password, p_phone, p_university, p_major, 'active', false
  ) RETURNING id INTO v_mentor_id;

  RETURN QUERY SELECT true, 'Mentor created successfully'::text, v_mentor_id;
EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT false, 'A mentor with this email already exists'::text, NULL::uuid;
  WHEN OTHERS THEN
    RETURN QUERY SELECT false, ('Failed to create mentor: ' || SQLERRM)::text, NULL::uuid;
END;
$function$;
