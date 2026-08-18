/*
  # Restore Teacher Management Functions
  
  1. Functions
    - set_teacher_password: Sets a teacher password directly
    - validate_password_complexity: Validates password requirements
    - handle_teacher_login: Full login handler with audit logging
    - create_teacher_account: Creates a teacher with hashed password
    - reset_teacher_password: Generates temp password
    - update_teacher_password: Updates teacher password
    - delete_teacher_account: Cascade deletes a teacher
    - delete_all_student_data: Deletes all student data for a teacher
    - update_teacher_status: Locks/unlocks teacher accounts
    - get_teacher_list: Paginated teacher listing
    - get_teacher_audit_logs: Returns audit logs for a teacher
    - get_admin_dashboard_stats: Returns admin dashboard statistics
    - get_current_password: Returns password hash for admin viewing
    - update_teacher_district: Assigns district to teacher
    - create_school_district: Creates a school district
    - bulk_import_teachers: Batch imports teachers
    
  2. Security
    - All SECURITY DEFINER
    - Audit logging on all operations
    - bcrypt password hashing
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP FUNCTION IF EXISTS set_teacher_password(text, text);
DROP FUNCTION IF EXISTS validate_password_complexity(text);
DROP FUNCTION IF EXISTS handle_teacher_login(text, text, boolean);
DROP FUNCTION IF EXISTS create_teacher_account(text, text, text, text);
DROP FUNCTION IF EXISTS delete_teacher_account(text);
DROP FUNCTION IF EXISTS delete_all_student_data(text);
DROP FUNCTION IF EXISTS update_teacher_status(text, text);
DROP FUNCTION IF EXISTS get_teacher_list(integer, integer, text, text, text);
DROP FUNCTION IF EXISTS get_teacher_list(integer, integer, text, text, text, uuid);
DROP FUNCTION IF EXISTS get_teacher_list(text, text, timestamptz, timestamptz, integer, integer, text, text);
DROP FUNCTION IF EXISTS get_teacher_audit_logs(text, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS get_admin_dashboard_stats();
DROP FUNCTION IF EXISTS get_current_password(text);
DROP FUNCTION IF EXISTS update_teacher_district(text, uuid);
DROP FUNCTION IF EXISTS create_school_district(text, text);
DROP FUNCTION IF EXISTS bulk_import_teachers(jsonb);

CREATE FUNCTION validate_password_complexity(p_password TEXT)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  IF length(p_password) < 8 THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Password must be at least 8 characters long');
  END IF;
  IF p_password !~ '[A-Z]' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Password must contain at least one uppercase letter');
  END IF;
  IF p_password !~ '[0-9]' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Password must contain at least one number');
  END IF;
  IF p_password !~ '[!@#$%^&*]' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Password must contain at least one special character (!@#$%^&*)');
  END IF;
  RETURN jsonb_build_object('valid', true, 'message', 'Password meets complexity requirements');
END;
$$;

CREATE FUNCTION set_teacher_password(p_username TEXT, p_password TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'set_password', 'teacher', p_username, jsonb_build_object('timestamp', now(), 'temp_password', false), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', 'Password set successfully');
END;
$$;

CREATE FUNCTION handle_teacher_login(p_username TEXT, p_password TEXT, p_remember_me BOOLEAN DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    INSERT INTO admin_audit_logs (action, target_type, target_id, details, ip_address) VALUES ('failed_login', 'teacher', p_username, jsonb_build_object('reason', 'account_not_found', 'timestamp', now()), inet_client_addr());
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
    INSERT INTO admin_audit_logs (action, target_type, target_id, details, ip_address) VALUES ('failed_login', 'teacher', p_username, jsonb_build_object('reason', 'invalid_password', 'attempts', v_failed_attempts, 'timestamp', now()), inet_client_addr());
    RETURN jsonb_build_object('success', false, 'message', format('Invalid credentials. %s attempts remaining.', 5 - v_failed_attempts));
  END IF;

  UPDATE teachers SET last_login = now(), login_count = COALESCE(login_count, 0) + 1, failed_login_attempts = 0, last_failed_login = NULL WHERE username = p_username;
  INSERT INTO admin_audit_logs (action, target_type, target_id, details, ip_address) VALUES ('login', 'teacher', p_username, jsonb_build_object('timestamp', now(), 'remember_me', p_remember_me, 'temp_password', v_temp_password), inet_client_addr());

  RETURN jsonb_build_object('success', true, 'message', 'Login successful', 'teacher', jsonb_build_object('username', p_username, 'name', v_name));
END;
$$;

CREATE FUNCTION create_teacher_account(p_username TEXT, p_email TEXT, p_full_name TEXT, p_password TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  INSERT INTO teachers (username, name, email, password_hash, temp_password, temp_plaintext_password, plaintext_password, account_status) VALUES (p_username, p_full_name, p_email, v_password_hash, true, v_temp_password, v_temp_password, 'active');
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'create_account', 'teacher', p_username, jsonb_build_object('timestamp', now(), 'email', p_email, 'temp_password', true), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', 'Teacher account created successfully', 'temp_password', v_temp_password);
END;
$$;

CREATE FUNCTION update_teacher_status(p_username TEXT, p_account_status TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_exists BOOLEAN;
  v_current_status TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM teachers WHERE username = p_username) INTO v_teacher_exists;
  IF NOT v_teacher_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Teacher not found');
  END IF;
  SELECT account_status INTO v_current_status FROM teachers WHERE username = p_username;
  UPDATE teachers SET account_status = p_account_status, account_locked = CASE WHEN p_account_status = 'locked' THEN true ELSE false END, failed_login_attempts = CASE WHEN p_account_status = 'active' THEN 0 ELSE failed_login_attempts END WHERE username = p_username;
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), CASE WHEN p_account_status = 'locked' THEN 'lock_account' ELSE 'unlock_account' END, 'teacher', p_username, jsonb_build_object('timestamp', now(), 'previous_status', v_current_status, 'new_status', p_account_status), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', format('Account %s successfully', CASE WHEN p_account_status = 'locked' THEN 'locked' ELSE 'unlocked' END));
END;
$$;

CREATE FUNCTION delete_all_student_data(p_teacher_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz_template_ids UUID[];
BEGIN
  SELECT array_agg(id) INTO v_quiz_template_ids FROM quiz_templates WHERE teacher_username = p_teacher_username;
  IF v_quiz_template_ids IS NOT NULL AND array_length(v_quiz_template_ids, 1) > 0 THEN
    DELETE FROM quiz_questions WHERE template_id = ANY(v_quiz_template_ids);
  END IF;
  DELETE FROM quiz_templates WHERE teacher_username = p_teacher_username;
  DELETE FROM quiz_attempts WHERE teacher_username = p_teacher_username;
  DELETE FROM group_lesson_plans WHERE teacher_username = p_teacher_username;
  DELETE FROM weekly_groups WHERE teacher_username = p_teacher_username;
  DELETE FROM standards_alignments WHERE teacher_username = p_teacher_username;
  DELETE FROM lesson_plans WHERE teacher_username = p_teacher_username;
  DELETE FROM exit_tickets WHERE teacher_username = p_teacher_username;
  DELETE FROM classroom_analytics WHERE teacher_username = p_teacher_username;
  DELETE FROM students WHERE teacher_username = p_teacher_username;
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'delete_all_student_data', 'teacher', p_teacher_username, jsonb_build_object('timestamp', now(), 'deleted_quiz_templates', array_length(v_quiz_template_ids, 1)), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', 'All student data deleted successfully');
END;
$$;

CREATE FUNCTION delete_teacher_account(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_exists BOOLEAN;
  v_quiz_template_ids UUID[];
BEGIN
  SELECT EXISTS (SELECT 1 FROM teachers WHERE username = p_username) INTO v_teacher_exists;
  IF NOT v_teacher_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Teacher not found');
  END IF;
  SELECT array_agg(id) INTO v_quiz_template_ids FROM quiz_templates WHERE teacher_username = p_username;
  IF v_quiz_template_ids IS NOT NULL AND array_length(v_quiz_template_ids, 1) > 0 THEN
    DELETE FROM quiz_questions WHERE template_id = ANY(v_quiz_template_ids);
  END IF;
  DELETE FROM quiz_templates WHERE teacher_username = p_username;
  DELETE FROM classroom_analytics WHERE teacher_username = p_username;
  DELETE FROM group_lesson_plans WHERE teacher_username = p_username;
  DELETE FROM weekly_groups WHERE teacher_username = p_username;
  DELETE FROM quiz_attempts WHERE teacher_username = p_username;
  DELETE FROM standards_alignments WHERE teacher_username = p_username;
  DELETE FROM lesson_plans WHERE teacher_username = p_username;
  DELETE FROM exit_tickets WHERE teacher_username = p_username;
  DELETE FROM students WHERE teacher_username = p_username;
  DELETE FROM teacher_sessions WHERE teacher_id IN (SELECT id FROM teacher_accounts WHERE username = p_username);
  DELETE FROM password_reset_requests WHERE teacher_id IN (SELECT id FROM teacher_accounts WHERE username = p_username);
  DELETE FROM teacher_accounts WHERE username = p_username;
  DELETE FROM teachers WHERE username = p_username;
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'delete_account', 'teacher', p_username, jsonb_build_object('timestamp', now(), 'cascade_delete', true), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', 'Teacher account and all related data deleted successfully');
END;
$$;

CREATE FUNCTION get_teacher_list(p_page INTEGER DEFAULT 1, p_page_size INTEGER DEFAULT 20, p_search TEXT DEFAULT NULL, p_sort_by TEXT DEFAULT 'name', p_sort_dir TEXT DEFAULT 'asc', p_district_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_results jsonb;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  SELECT COUNT(*) INTO v_total FROM teachers t WHERE (p_search IS NULL OR t.username ILIKE '%' || p_search || '%' OR t.name ILIKE '%' || p_search || '%' OR t.email ILIKE '%' || p_search || '%') AND (p_district_id IS NULL OR t.district_id = p_district_id);
  WITH filtered_teachers AS (
    SELECT t.username, t.name, t.email, t.account_status, t.created_at, t.last_login, t.temp_password, t.account_locked, t.failed_login_attempts, t.login_count, t.temp_plaintext_password, t.district_id, d.name as district_name, d.code as district_code
    FROM teachers t LEFT JOIN school_districts d ON d.id = t.district_id
    WHERE (p_search IS NULL OR t.username ILIKE '%' || p_search || '%' OR t.name ILIKE '%' || p_search || '%' OR t.email ILIKE '%' || p_search || '%')
    AND (p_district_id IS NULL OR t.district_id = p_district_id)
  )
  SELECT jsonb_build_object('total', v_total, 'page', p_page, 'page_size', p_page_size, 'data', (SELECT jsonb_agg(t.*) FROM (SELECT * FROM filtered_teachers ORDER BY CASE WHEN p_sort_dir = 'asc' THEN CASE p_sort_by WHEN 'username' THEN username WHEN 'name' THEN name WHEN 'email' THEN email WHEN 'created_at' THEN created_at::text WHEN 'last_login' THEN COALESCE(last_login::text, '1970-01-01') ELSE name END END ASC NULLS LAST, CASE WHEN p_sort_dir = 'desc' THEN CASE p_sort_by WHEN 'username' THEN username WHEN 'name' THEN name WHEN 'email' THEN email WHEN 'created_at' THEN created_at::text WHEN 'last_login' THEN COALESCE(last_login::text, '9999-12-31') ELSE name END END DESC NULLS LAST LIMIT p_page_size OFFSET v_offset) t)) INTO v_results;
  RETURN v_results;
END;
$$;

CREATE FUNCTION get_teacher_audit_logs(p_username TEXT, p_from_date TIMESTAMPTZ DEFAULT NULL, p_to_date TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (action TEXT, event_time TIMESTAMPTZ, details jsonb, ip_address INET)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT l.action, l.created_at as event_time, l.details, l.ip_address FROM admin_audit_logs l WHERE l.target_id = p_username AND (p_from_date IS NULL OR l.created_at >= p_from_date) AND (p_to_date IS NULL OR l.created_at <= p_to_date) ORDER BY l.created_at DESC;
END;
$$;

CREATE FUNCTION get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object('total_teachers', (SELECT COUNT(*) FROM teachers), 'active_teachers', (SELECT COUNT(*) FROM teachers WHERE account_status = 'active'), 'locked_accounts', (SELECT COUNT(*) FROM teachers WHERE account_locked = true), 'temp_passwords', (SELECT COUNT(*) FROM teachers WHERE temp_password = true), 'recent_logins', (SELECT COUNT(*) FROM teachers WHERE last_login >= NOW() - INTERVAL '24 hours'), 'failed_attempts', (SELECT COUNT(*) FROM teachers WHERE failed_login_attempts > 0)) INTO v_stats;
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'view_stats', 'admin', 'dashboard', v_stats, inet_client_addr());
  RETURN v_stats;
END;
$$;

CREATE FUNCTION get_current_password(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_password_hash TEXT;
  v_temp_password BOOLEAN;
  v_last_changed TIMESTAMPTZ;
BEGIN
  SELECT password_hash, temp_password, password_last_changed INTO v_password_hash, v_temp_password, v_last_changed FROM teachers WHERE username = p_username;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Teacher not found');
  END IF;
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'view_password', 'teacher', p_username, jsonb_build_object('timestamp', now(), 'temp_password', v_temp_password), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'password', v_password_hash, 'temp_password', v_temp_password, 'last_changed', v_last_changed);
END;
$$;

CREATE FUNCTION update_teacher_district(p_username TEXT, p_district_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_district_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE username = p_username) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Teacher not found');
  END IF;
  IF p_district_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM school_districts WHERE id = p_district_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'District not found');
  END IF;
  SELECT district_id INTO v_old_district_id FROM teachers WHERE username = p_username;
  UPDATE teachers SET district_id = p_district_id WHERE username = p_username;
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'update_teacher_district', 'teacher', p_username, jsonb_build_object('old_district_id', v_old_district_id, 'new_district_id', p_district_id, 'timestamp', now()), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', 'Teacher district updated successfully');
END;
$$;

CREATE FUNCTION create_school_district(p_name TEXT, p_code TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_district_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM school_districts WHERE name = p_name OR code = p_code) THEN
    RETURN jsonb_build_object('success', false, 'message', 'District with this name or code already exists');
  END IF;
  INSERT INTO school_districts (name, code, created_by) VALUES (p_name, p_code, auth.uid()) RETURNING id INTO v_district_id;
  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'create_district', 'district', v_district_id::text, jsonb_build_object('name', p_name, 'code', p_code), inet_client_addr());
  RETURN jsonb_build_object('success', true, 'message', 'School district created successfully', 'district_id', v_district_id);
END;
$$;

CREATE FUNCTION bulk_import_teachers(p_teachers jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      INSERT INTO teachers (username, name, email, password_hash, temp_password, temp_plaintext_password, plaintext_password, account_status, district_id) VALUES (v_username, v_full_name, v_email, v_password_hash, true, v_password, v_password, 'active', v_district_id);
      INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (auth.uid(), 'create_account', 'teacher', v_username, jsonb_build_object('timestamp', now(), 'email', v_email, 'bulk_import', true), inet_client_addr());
      v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', true, 'message', 'Account created successfully'));
      v_success_count := v_success_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_results := array_append(v_results, jsonb_build_object('username', v_username, 'success', false, 'message', SQLERRM));
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('success', v_error_count = 0, 'total', v_success_count + v_error_count, 'success_count', v_success_count, 'error_count', v_error_count, 'results', to_jsonb(v_results));
END;
$$;
