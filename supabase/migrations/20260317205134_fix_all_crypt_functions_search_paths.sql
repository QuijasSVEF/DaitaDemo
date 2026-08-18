/*
  # Fix search paths for all functions using pgcrypto

  1. Changes
    - Adds `extensions` to the search path for all functions that use `crypt()` and `gen_salt()`
    - Affected functions:
      1. `authenticate_coach` - coach login
      2. `authenticate_college_mentor` - mentor login
      3. `bulk_import_teachers` - bulk teacher import
      4. `create_coach` - coach creation
      5. `create_teacher_account` - teacher creation
      6. `handle_teacher_login` - teacher login
      7. `set_teacher_password` - teacher password reset
      8. `update_coach_password` - coach password update

  2. Security
    - All functions remain SECURITY DEFINER
    - No changes to RLS policies
    - Search path explicitly set to prevent schema injection
*/

-- 1. authenticate_coach
CREATE OR REPLACE FUNCTION public.authenticate_coach(p_email text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_coach coaches;
BEGIN
  SELECT * INTO v_coach FROM coaches WHERE email = p_email;
  IF v_coach.id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials'); END IF;
  IF v_coach.account_locked = true THEN RETURN jsonb_build_object('success', false, 'message', 'Account is locked. Please contact support.'); END IF;
  IF v_coach.password_hash = crypt(p_password, v_coach.password_hash) THEN
    UPDATE coaches SET failed_login_attempts = 0, last_login = now() WHERE id = v_coach.id;
    RETURN jsonb_build_object('success', true, 'message', 'Login successful', 'coach', jsonb_build_object('id', v_coach.id, 'email', v_coach.email, 'full_name', v_coach.full_name));
  ELSE
    UPDATE coaches SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, account_locked = CASE WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true ELSE false END WHERE id = v_coach.id;
    RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials');
  END IF;
END;
$function$;

-- 2. authenticate_college_mentor
CREATE OR REPLACE FUNCTION public.authenticate_college_mentor(p_email text, p_password text)
RETURNS TABLE(success boolean, message text, mentor json)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_mentor college_mentors%ROWTYPE;
  v_password_match boolean;
BEGIN
  SELECT * INTO v_mentor FROM college_mentors WHERE email = lower(p_email);
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Invalid credentials'::text, NULL::json; RETURN; END IF;
  IF v_mentor.account_locked THEN RETURN QUERY SELECT false, 'Account is locked. Please contact administrator.'::text, NULL::json; RETURN; END IF;
  IF v_mentor.account_status != 'active' THEN RETURN QUERY SELECT false, 'Account is not active.'::text, NULL::json; RETURN; END IF;
  v_password_match := v_mentor.password_hash = crypt(p_password, v_mentor.password_hash);
  IF NOT v_password_match THEN
    UPDATE college_mentors SET failed_login_attempts = failed_login_attempts + 1, account_locked = CASE WHEN failed_login_attempts + 1 >= 5 THEN true ELSE false END, updated_at = now() WHERE id = v_mentor.id;
    RETURN QUERY SELECT false, 'Invalid credentials'::text, NULL::json; RETURN;
  END IF;
  UPDATE college_mentors SET failed_login_attempts = 0, last_login = now(), updated_at = now() WHERE id = v_mentor.id;
  RETURN QUERY SELECT true, 'Login successful'::text, json_build_object('id', v_mentor.id, 'email', v_mentor.email, 'full_name', v_mentor.full_name, 'phone', v_mentor.phone, 'university', v_mentor.university, 'major', v_mentor.major);
END;
$function$;

-- 3. bulk_import_teachers
CREATE OR REPLACE FUNCTION public.bulk_import_teachers(p_teachers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_teacher jsonb;
  v_username text;
  v_email text;
  v_full_name text;
  v_password text;
  v_district_code text;
  v_district_id uuid;
  v_password_hash text;
  v_results jsonb[] := '{}';
  v_success_count integer := 0;
  v_error_count integer := 0;
BEGIN
  FOR v_teacher IN SELECT * FROM jsonb_array_elements(p_teachers)
  LOOP
    BEGIN
      v_username := trim(v_teacher->>'username');
      v_email := trim(v_teacher->>'email');
      v_full_name := trim(v_teacher->>'fullName');
      v_password := trim(v_teacher->>'password');
      v_district_code := trim(v_teacher->>'districtCode');

      IF v_username IS NULL OR v_username = '' THEN
        v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', false, 'message', 'Username is required'));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      IF v_email IS NULL OR v_email = '' THEN
        v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', false, 'message', 'Email is required'));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      IF v_full_name IS NULL OR v_full_name = '' THEN
        v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', false, 'message', 'Full name is required'));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      IF v_password IS NULL OR v_password = '' THEN
        v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', false, 'message', 'Password is required'));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;

      IF EXISTS (SELECT 1 FROM teachers WHERE username = v_username) THEN
        v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', false, 'message', 'Username already exists'));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM teachers WHERE email = v_email) THEN
        v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', false, 'message', 'Email already exists'));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;

      v_district_id := NULL;
      IF v_district_code IS NOT NULL AND v_district_code != '' THEN
        SELECT id INTO v_district_id FROM school_districts WHERE code = v_district_code;
        IF NOT FOUND THEN
          INSERT INTO school_districts (name, code) VALUES (v_district_code, v_district_code) RETURNING id INTO v_district_id;
        END IF;
      END IF;

      v_password_hash := crypt(v_password, gen_salt('bf'));
      INSERT INTO teachers (username, name, email, password_hash, temp_password, temp_plaintext_password, plaintext_password, account_status, district_id)
      VALUES (v_username, v_full_name, v_email, v_password_hash, true, v_password, v_password, 'active', v_district_id);
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
      VALUES (auth.uid(), 'create_account', 'teacher', v_username, jsonb_build_object('timestamp', now(), 'email', v_email, 'bulk_import', true), inet_client_addr());
      v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', true, 'message', 'Account created successfully'));
      v_success_count := v_success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', false, 'message', SQLERRM));
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('success', v_error_count = 0, 'total', v_success_count + v_error_count, 'success_count', v_success_count, 'error_count', v_error_count, 'results', to_jsonb(v_results));
END;
$function$;

-- 4. create_coach
CREATE OR REPLACE FUNCTION public.create_coach(p_email text, p_full_name text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_coach_id uuid;
BEGIN
  IF p_email IS NULL OR p_full_name IS NULL OR p_password IS NULL THEN RETURN json_build_object('success', false, 'message', 'All fields are required'); END IF;
  IF EXISTS (SELECT 1 FROM coaches WHERE email = p_email) THEN RETURN json_build_object('success', false, 'message', 'Email already exists'); END IF;
  INSERT INTO coaches (email, full_name, password_hash, plaintext_password) VALUES (p_email, p_full_name, crypt(p_password, gen_salt('bf')), p_password) RETURNING id INTO v_coach_id;
  RETURN json_build_object('success', true, 'coach_id', v_coach_id);
END;
$function$;

-- 5. create_teacher_account
CREATE OR REPLACE FUNCTION public.create_teacher_account(p_username text, p_email text, p_full_name text, p_password text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_temp_password TEXT;
  v_password_hash TEXT;
BEGIN
  IF p_username IS NULL OR p_email IS NULL OR p_full_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Username, email, and full name are required');
  END IF;
  IF EXISTS (SELECT 1 FROM teachers WHERE username = p_username) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Username already exists');
  END IF;
  IF EXISTS (SELECT 1 FROM teachers WHERE email = p_email) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Email already exists');
  END IF;
  v_temp_password := COALESCE(p_password, substr(md5(random()::text), 1, 8));
  v_password_hash := crypt(v_temp_password, gen_salt('bf'));
  INSERT INTO teachers (username, name, email, password_hash, temp_password, temp_plaintext_password, plaintext_password, account_status)
  VALUES (p_username, p_full_name, p_email, v_password_hash, true, v_temp_password, v_temp_password, 'active');
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
  VALUES (auth.uid(), 'create_account', 'teacher', p_username, jsonb_build_object('timestamp', now(), 'email', p_email, 'temp_password', true), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', 'Teacher account created successfully', 'temp_password', v_temp_password);
END;
$function$;

-- 6. handle_teacher_login
CREATE OR REPLACE FUNCTION public.handle_teacher_login(p_username text, p_password text, p_remember_me boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_account_locked BOOLEAN;
  v_failed_attempts INTEGER;
  v_temp_password BOOLEAN;
  v_password_hash TEXT;
  v_name TEXT;
BEGIN
  SELECT account_locked, failed_login_attempts, temp_password, password_hash, name
  INTO v_account_locked, v_failed_attempts, v_temp_password, v_password_hash, v_name
  FROM teachers WHERE username = p_username;

  IF NOT FOUND THEN
    INSERT INTO admin_audit_logs (action, target_type, target_id, details, ip_address)
    VALUES ('failed_login', 'teacher', p_username, jsonb_build_object('reason', 'account_not_found', 'timestamp', now()), inet_client_addr());
    PERFORM crypt('dummy-password', gen_salt('bf'));
    RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials');
  END IF;

  IF v_account_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'Account is locked. Please contact an administrator.');
  END IF;

  IF v_password_hash = p_password THEN
    v_password_hash := crypt(p_password, gen_salt('bf'));
    UPDATE teachers SET password_hash = v_password_hash WHERE username = p_username;
  END IF;

  IF v_password_hash IS NULL OR NOT (v_password_hash = crypt(p_password, v_password_hash)) THEN
    UPDATE teachers SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, account_locked = CASE WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true ELSE false END, last_failed_login = now() WHERE username = p_username RETURNING failed_login_attempts INTO v_failed_attempts;
    INSERT INTO admin_audit_logs (action, target_type, target_id, details, ip_address)
    VALUES ('failed_login', 'teacher', p_username, jsonb_build_object('reason', 'invalid_password', 'attempts', v_failed_attempts, 'timestamp', now()), inet_client_addr());
    RETURN jsonb_build_object('success', false, 'message', format('Invalid credentials. %s attempts remaining.', 5 - v_failed_attempts));
  END IF;

  UPDATE teachers SET last_login = now(), login_count = COALESCE(login_count, 0) + 1, failed_login_attempts = 0, last_failed_login = NULL WHERE username = p_username;
  INSERT INTO admin_audit_logs (action, target_type, target_id, details, ip_address)
  VALUES ('login', 'teacher', p_username, jsonb_build_object('timestamp', now(), 'remember_me', p_remember_me, 'temp_password', v_temp_password), inet_client_addr());

  RETURN jsonb_build_object('success', true, 'message', 'Login successful', 'teacher', jsonb_build_object('username', p_username, 'name', v_name));
END;
$function$;

-- 7. set_teacher_password
CREATE OR REPLACE FUNCTION public.set_teacher_password(p_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  v_teacher_id UUID;
  v_password_hash TEXT;
BEGIN
  SELECT id INTO v_teacher_id FROM teacher_accounts WHERE username = p_username;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Teacher not found');
  END IF;
  v_password_hash := crypt(p_password, gen_salt('bf'));
  UPDATE teacher_accounts SET password_hash = v_password_hash, temp_password = false, password_last_changed = now(), failed_login_attempts = 0, account_locked = false WHERE username = p_username;
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
  VALUES (auth.uid(), 'set_password', 'teacher', p_username, jsonb_build_object('timestamp', now(), 'temp_password', false), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', 'Password set successfully');
END;
$function$;

-- 8. update_coach_password
CREATE OR REPLACE FUNCTION public.update_coach_password(p_coach_id uuid, p_new_password text, p_is_temp boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
BEGIN
  UPDATE coaches SET password_hash = crypt(p_new_password, gen_salt('bf')), plaintext_password = CASE WHEN p_is_temp THEN p_new_password ELSE NULL END, temp_password = p_is_temp, password_last_changed = now() WHERE id = p_coach_id;
  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
END;
$function$;
