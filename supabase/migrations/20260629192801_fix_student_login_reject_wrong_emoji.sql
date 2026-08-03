
-- Fix student login: reject wrong emoji instead of creating a new account
-- Previously, if a student entered the wrong emoji, a new student record was created.
-- Now, if the name exists but emoji doesn't match, raise an error.

CREATE OR REPLACE FUNCTION register_or_login_student(
  p_teacher_username text,
  p_first_name text,
  p_last_initial text,
  p_emoji_password text,
  p_grade_level text DEFAULT '6'
)
RETURNS TABLE(student_id integer, first_name text, last_initial char(1))
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_first text;
  v_initial char(1);
  v_existing_id integer;
  v_new_id integer;
  v_name_exists boolean;
BEGIN
  -- Input validation
  IF p_first_name IS NULL OR btrim(p_first_name) = '' THEN
    RAISE EXCEPTION 'First name is required';
  END IF;
  IF p_last_initial IS NULL OR btrim(p_last_initial) = '' THEN
    RAISE EXCEPTION 'Last initial is required';
  END IF;
  IF p_emoji_password IS NULL OR btrim(p_emoji_password) = '' THEN
    RAISE EXCEPTION 'Emoji password is required';
  END IF;
  IF p_first_name !~ '^[A-Za-z]+$' THEN
    RAISE EXCEPTION 'First name must contain only letters';
  END IF;
  IF p_last_initial !~ '^[A-Za-z]$' THEN
    RAISE EXCEPTION 'Last initial must be a single letter';
  END IF;

  -- Normalize
  v_first := initcap(lower(btrim(p_first_name)));
  v_initial := upper(btrim(p_last_initial));

  -- Exact match (teacher + first + initial + emoji) = authenticated
  SELECT s.id INTO v_existing_id
  FROM students s
  WHERE s.teacher_username = p_teacher_username
    AND lower(s.first_name) = lower(v_first)
    AND upper(s.last_initial) = v_initial
    AND s.emoji_password = p_emoji_password
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE students SET last_seen = now() WHERE id = v_existing_id AND teacher_username = p_teacher_username;
    RETURN QUERY SELECT v_existing_id, v_first, v_initial;
    RETURN;
  END IF;

  -- Check if name exists under this teacher (with ANY emoji)
  SELECT EXISTS (
    SELECT 1 FROM students s
    WHERE s.teacher_username = p_teacher_username
      AND lower(s.first_name) = lower(v_first)
      AND upper(s.last_initial) = v_initial
      AND s.emoji_password IS NOT NULL
      AND s.emoji_password != ''
  ) INTO v_name_exists;

  IF v_name_exists THEN
    -- Name exists but emoji doesn't match -> WRONG PASSWORD, reject login
    RAISE EXCEPTION 'Wrong emoji password. Please pick the emoji you chose when you first logged in.';
  END IF;

  -- Name does NOT exist at all -> first-time login, create new student
  INSERT INTO students (teacher_username, first_name, last_initial, emoji_password, grade_level)
  VALUES (p_teacher_username, v_first, v_initial, p_emoji_password, COALESCE(p_grade_level, '6'))
  RETURNING id INTO v_new_id;

  RETURN QUERY SELECT v_new_id, v_first, v_initial;
END;
$$;

GRANT EXECUTE ON FUNCTION register_or_login_student(text, text, text, text, text) TO anon, authenticated;
