/*
  # Add Reset Password RPCs for Coaches and College Mentors

  1. New Functions
    - `reset_coach_password(p_coach_id uuid)` - Generates a random temp password, hashes with bcrypt, stores plaintext for retrieval, unlocks account
    - `reset_college_mentor_password(p_mentor_id uuid)` - Generates a random temp password, hashes with bcrypt, unlocks account, resets failed attempts

  2. Security
    - Both functions use SECURITY DEFINER to allow admin portal access
    - Passwords are hashed with bcrypt using gen_salt('bf')

  3. Important Notes
    - For coaches: stores plaintext_password for temp retrieval, sets temp_password = true
    - For mentors: since no plaintext_password column exists, the temp password is returned directly and must be noted immediately
*/

-- Reset coach password function
CREATE OR REPLACE FUNCTION reset_coach_password(p_coach_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_temp_password TEXT;
  v_coach_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM coaches WHERE id = p_coach_id) INTO v_coach_exists;
  
  IF NOT v_coach_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Coach not found');
  END IF;

  v_temp_password := 'temp_' || substr(md5(random()::text), 0, 9);

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
$$;

-- Reset college mentor password function
CREATE OR REPLACE FUNCTION reset_college_mentor_password(p_mentor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_temp_password TEXT;
  v_mentor_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM college_mentors WHERE id = p_mentor_id) INTO v_mentor_exists;
  
  IF NOT v_mentor_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mentor not found');
  END IF;

  v_temp_password := 'temp_' || substr(md5(random()::text), 0, 9);

  UPDATE college_mentors
  SET 
    password_hash = crypt(v_temp_password, gen_salt('bf')),
    account_locked = false,
    failed_login_attempts = 0,
    updated_at = now()
  WHERE id = p_mentor_id;

  RETURN jsonb_build_object('success', true, 'temp_password', v_temp_password);
END;
$$;
