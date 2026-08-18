/*
  # Fix Student Emoji Login Validation

  1. Changes
    - Modified `validate_and_create_student_record` function
    - First-time login (student doesn't exist): creates student and sets their emoji password
    - Subsequent logins (student exists): verifies the provided emoji matches the stored one
    - Returns FALSE if the emoji doesn't match on subsequent logins (wrong password)
    
  2. Security
    - Students can no longer overwrite their emoji password by logging in again
    - Emoji is only set once during first login, then acts as authentication
*/

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
  v_existing_emoji TEXT;
BEGIN
  SELECT emoji_password INTO v_existing_emoji
  FROM students
  WHERE id = p_student_id AND teacher_username = p_teacher_username;

  IF NOT FOUND THEN
    INSERT INTO students (id, teacher_username, grade_level, subject, emoji_password, last_seen)
    VALUES (p_student_id, p_teacher_username, p_grade_level, 'Mathematics', p_emoji_password, now());
    RETURN TRUE;
  END IF;

  IF v_existing_emoji IS NOT NULL AND v_existing_emoji != '' THEN
    IF p_emoji_password IS NULL OR p_emoji_password != v_existing_emoji THEN
      RETURN FALSE;
    END IF;
  ELSE
    IF p_emoji_password IS NOT NULL THEN
      UPDATE students SET emoji_password = p_emoji_password, last_seen = now()
      WHERE id = p_student_id AND teacher_username = p_teacher_username;
      RETURN TRUE;
    END IF;
  END IF;

  UPDATE students SET last_seen = now()
  WHERE id = p_student_id AND teacher_username = p_teacher_username;

  RETURN TRUE;
END;
$$;
