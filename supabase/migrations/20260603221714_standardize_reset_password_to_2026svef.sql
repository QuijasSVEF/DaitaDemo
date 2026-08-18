/*
  # Standardize reset password to 2026Svef!

  1. Modified Functions
    - `reset_coach_password` - Always resets to '2026Svef!' instead of random
    - `reset_college_mentor_password` - Always resets to '2026Svef!' instead of random
    - `reset_teacher_password` - Always resets to '2026Svef!' instead of random

  2. Important Notes
    - All reset password operations now use a consistent default password
    - The password is still marked as temporary so users are prompted to change it
*/

CREATE OR REPLACE FUNCTION public.reset_coach_password(p_coach_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_temp_password TEXT := '2026Svef!';
  v_coach_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM coaches WHERE id = p_coach_id) INTO v_coach_exists;

  IF NOT v_coach_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Coach not found');
  END IF;

  UPDATE coaches
  SET 
    password_hash = crypt(v_temp_password, gen_salt('bf')),
    plaintext_password = v_temp_password,
    temp_password = true,
    account_locked = false,
    failed_login_attempts = 0,
    password_last_changed = now()
  WHERE id = p_coach_id;

  RETURN jsonb_build_object('success', true, 'temp_password', v_temp_password);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_college_mentor_password(p_mentor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_temp_password TEXT := '2026Svef!';
  v_mentor_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM college_mentors WHERE id = p_mentor_id) INTO v_mentor_exists;

  IF NOT v_mentor_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mentor not found');
  END IF;

  UPDATE college_mentors
  SET 
    password_hash = crypt(v_temp_password, gen_salt('bf')),
    plaintext_password = v_temp_password,
    account_locked = false,
    failed_login_attempts = 0,
    updated_at = now()
  WHERE id = p_mentor_id;

  RETURN jsonb_build_object('success', true, 'temp_password', v_temp_password);
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_teacher_password(p_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_temp_password TEXT := '2026Svef!';
BEGIN
  UPDATE teacher_accounts
  SET 
    password_hash = v_temp_password,
    temp_password = true,
    password_last_changed = NULL,
    updated_at = now()
  WHERE username = p_username;

  UPDATE teachers
  SET 
    password_hash = v_temp_password,
    temp_password = true,
    plaintext_password = v_temp_password,
    account_locked = false,
    failed_login_attempts = 0,
    updated_at = now()
  WHERE username = p_username;

  RETURN jsonb_build_object('success', true, 'temp_password', v_temp_password);
END;
$function$;
