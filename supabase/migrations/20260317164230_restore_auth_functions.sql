/*
  # Restore Authentication Functions
  
  1. Functions
    - `authenticate_teacher_by_email` - Teacher login via email/password
    - `admin_login` - Admin login
    - `validate_and_create_student_record` - Student validation and creation
    - `ensure_student_exists` - Student existence check
    - `validate_student_for_teacher` - Student-teacher validation
    - `get_teacher_students` - Get students for a teacher
    - `get_teacher_password` - Admin view of teacher password
    - `update_teacher_password` - Admin password update
    - `reset_teacher_password` - Password reset with temp password
    - `get_teacher_password_info` - Password status info
*/

-- authenticate_teacher_by_email
DROP FUNCTION IF EXISTS authenticate_teacher_by_email(text, text);

CREATE OR REPLACE FUNCTION authenticate_teacher_by_email(
  p_email text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_teacher_record record;
  v_password_valid boolean := false;
  v_result json;
BEGIN
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RETURN json_build_object('success', false, 'message', 'Email is required');
  END IF;
  
  IF p_password IS NULL OR trim(p_password) = '' THEN
    RETURN json_build_object('success', false, 'message', 'Password is required');
  END IF;
  
  SELECT username, name, email, password_hash, account_status, account_locked, temp_password, plaintext_password
  INTO v_teacher_record
  FROM teachers
  WHERE email = trim(lower(p_email));
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid email or password');
  END IF;
  
  IF v_teacher_record.account_locked THEN
    RETURN json_build_object('success', false, 'message', 'Account is locked. Please contact an administrator.');
  END IF;
  
  IF v_teacher_record.account_status != 'active' THEN
    RETURN json_build_object('success', false, 'message', 'Account is not active. Please contact an administrator.');
  END IF;
  
  IF v_teacher_record.temp_password AND v_teacher_record.plaintext_password IS NOT NULL THEN
    v_password_valid := (p_password = v_teacher_record.plaintext_password);
  END IF;
  
  IF NOT v_password_valid AND v_teacher_record.password_hash IS NOT NULL THEN
    BEGIN
      v_password_valid := (crypt(p_password, v_teacher_record.password_hash) = v_teacher_record.password_hash);
    EXCEPTION WHEN OTHERS THEN
      v_password_valid := (p_password = v_teacher_record.password_hash);
    END;
  END IF;
  
  IF NOT v_password_valid THEN
    UPDATE teachers 
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = now()
    WHERE email = trim(lower(p_email));
    
    RETURN json_build_object('success', false, 'message', 'Invalid email or password');
  END IF;
  
  UPDATE teachers 
  SET 
    last_login = now(),
    login_count = COALESCE(login_count, 0) + 1,
    failed_login_attempts = 0,
    last_failed_login = NULL
  WHERE email = trim(lower(p_email));
  
  RETURN json_build_object(
    'success', true,
    'message', 'Authentication successful',
    'teacher', json_build_object(
      'username', v_teacher_record.username,
      'name', v_teacher_record.name,
      'email', v_teacher_record.email
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Authentication error: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_teacher_by_email(TEXT, TEXT) TO authenticated, anon;

-- admin_login
DROP FUNCTION IF EXISTS public.admin_login(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.admin_login(p_email TEXT, p_password TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin_id UUID;
  v_password_hash TEXT;
  v_failed_attempts INT;
  v_account_locked BOOLEAN;
  v_full_name TEXT;
BEGIN
  SELECT id, password_hash, failed_login_attempts, account_locked, full_name
  INTO v_admin_id, v_password_hash, v_failed_attempts, v_account_locked, v_full_name
  FROM admin_users
  WHERE email = p_email;
  
  IF v_admin_id IS NULL THEN
    PERFORM pg_sleep(random() * 0.3);
    RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials');
  END IF;
  
  IF v_account_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'Account is locked. Please contact an administrator.');
  END IF;

  IF v_password_hash IS NOT NULL AND crypt(p_password, v_password_hash) = v_password_hash THEN
    UPDATE admin_users
    SET last_login = now(), failed_login_attempts = 0
    WHERE id = v_admin_id;
    
    RETURN jsonb_build_object('success', true, 'admin_id', v_admin_id, 'full_name', v_full_name);
  ELSIF p_password = v_password_hash THEN
    UPDATE admin_users
    SET last_login = now(), failed_login_attempts = 0
    WHERE id = v_admin_id;
    
    RETURN jsonb_build_object('success', true, 'admin_id', v_admin_id, 'full_name', v_full_name);
  ELSE
    UPDATE admin_users
    SET 
      failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
      last_failed_login = now(),
      account_locked = (COALESCE(failed_login_attempts, 0) + 1 >= 5)
    WHERE id = v_admin_id;
    
    RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials');
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_login(TEXT, TEXT) TO authenticated, anon;

-- validate_and_create_student_record
DROP FUNCTION IF EXISTS validate_and_create_student_record(integer, text, text, text);

CREATE OR REPLACE FUNCTION validate_and_create_student_record(
  p_student_id INTEGER,
  p_teacher_username TEXT,
  p_grade_level TEXT DEFAULT '6',
  p_emoji_password TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM students WHERE id = p_student_id AND teacher_username = p_teacher_username
  ) INTO v_student_exists;
  
  IF NOT v_student_exists THEN
    INSERT INTO students (id, teacher_username, grade_level, subject, emoji_password, last_seen)
    VALUES (p_student_id, p_teacher_username, p_grade_level, 'Mathematics', p_emoji_password, now());
    RETURN TRUE;
  END IF;
  
  IF v_student_exists AND p_emoji_password IS NOT NULL THEN
    UPDATE students SET emoji_password = p_emoji_password, last_seen = now()
    WHERE id = p_student_id AND teacher_username = p_teacher_username;
  ELSE
    UPDATE students SET last_seen = now()
    WHERE id = p_student_id AND teacher_username = p_teacher_username;
  END IF;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_and_create_student_record TO authenticated, anon;

-- ensure_student_exists
DROP FUNCTION IF EXISTS ensure_student_exists(integer, text, text, text);

CREATE OR REPLACE FUNCTION ensure_student_exists(
  p_student_id INTEGER,
  p_teacher_username TEXT,
  p_grade_level TEXT,
  p_subject TEXT DEFAULT 'Mathematics'
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM students WHERE id = p_student_id AND teacher_username = p_teacher_username
  ) INTO v_student_exists;

  IF NOT v_student_exists THEN
    INSERT INTO students (id, teacher_username, grade_level, subject, created_at, last_seen)
    VALUES (p_student_id, p_teacher_username, p_grade_level, p_subject, now(), now());
  ELSE
    UPDATE students SET last_seen = now()
    WHERE id = p_student_id AND teacher_username = p_teacher_username;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION ensure_student_exists TO authenticated, anon;

-- get_teacher_students
DROP FUNCTION IF EXISTS public.get_teacher_students(text);

CREATE OR REPLACE FUNCTION public.get_teacher_students(p_teacher_username text)
RETURNS TABLE(
  id integer,
  teacher_username text,
  grade_level text,
  subject text,
  emoji_password text,
  last_seen timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.teacher_username, s.grade_level, s.subject, s.emoji_password, s.last_seen, s.created_at
  FROM students s
  WHERE s.teacher_username = p_teacher_username
  ORDER BY s.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_students(text) TO authenticated, anon;

-- get_teacher_password
DROP FUNCTION IF EXISTS get_teacher_password(text);

CREATE OR REPLACE FUNCTION get_teacher_password(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_password TEXT;
  v_temp_password BOOLEAN;
  v_last_changed TIMESTAMPTZ;
BEGIN
  SELECT password_hash, temp_password, password_last_changed
  INTO v_password, v_temp_password, v_last_changed
  FROM teacher_accounts WHERE username = p_username;

  RETURN jsonb_build_object('password', v_password, 'temp_password', v_temp_password, 'last_changed', v_last_changed);
END;
$$;

GRANT EXECUTE ON FUNCTION get_teacher_password(TEXT) TO authenticated, anon;

-- update_teacher_password
DROP FUNCTION IF EXISTS update_teacher_password(text, text, boolean);

CREATE OR REPLACE FUNCTION update_teacher_password(
  p_username TEXT,
  p_new_password TEXT,
  p_temp_password BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE teacher_accounts
  SET 
    password_hash = CASE WHEN p_temp_password THEN p_new_password ELSE crypt(p_new_password, gen_salt('bf')) END,
    temp_password = p_temp_password,
    password_last_changed = CASE WHEN p_temp_password THEN NULL ELSE now() END,
    updated_at = now()
  WHERE username = p_username;

  UPDATE teachers
  SET 
    password_hash = CASE WHEN p_temp_password THEN p_new_password ELSE crypt(p_new_password, gen_salt('bf')) END,
    temp_password = p_temp_password,
    plaintext_password = CASE WHEN p_temp_password THEN p_new_password ELSE NULL END,
    updated_at = now()
  WHERE username = p_username;

  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
END;
$$;

GRANT EXECUTE ON FUNCTION update_teacher_password(TEXT, TEXT, BOOLEAN) TO authenticated, anon;

-- reset_teacher_password
DROP FUNCTION IF EXISTS reset_teacher_password(text);

CREATE OR REPLACE FUNCTION reset_teacher_password(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_temp_password TEXT;
BEGIN
  v_temp_password := 'temp_' || substr(md5(random()::text), 0, 9);

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
$$;

GRANT EXECUTE ON FUNCTION reset_teacher_password(TEXT) TO authenticated, anon;

-- get_teacher_password_info
CREATE OR REPLACE FUNCTION get_teacher_password_info(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_temp_password BOOLEAN;
  v_last_changed TIMESTAMPTZ;
  v_password_info TEXT;
BEGIN
  SELECT temp_password, password_last_changed
  INTO v_temp_password, v_last_changed
  FROM teacher_accounts WHERE username = p_username;

  v_password_info := CASE
    WHEN v_temp_password THEN 'Temporary password active'
    WHEN v_last_changed IS NULL THEN 'Password never changed'
    ELSE 'Password last changed: ' || to_char(v_last_changed, 'YYYY-MM-DD HH24:MI')
  END;

  RETURN jsonb_build_object('password_info', v_password_info, 'temp_password', v_temp_password, 'last_changed', v_last_changed);
END;
$$;

GRANT EXECUTE ON FUNCTION get_teacher_password_info(TEXT) TO authenticated, anon;
