/*
  # Fix delete_teacher_account RPC

  The existing function references `teacher_id` columns in `teacher_sessions` and
  `password_reset_requests`, but those tables now use `teacher_username` columns.
  This also adds deletion of `student_session_logs`, `generation_status`, and
  `analytics_error_logs` which were added after the original function was written.

  1. Changes
    - Recreates `delete_teacher_account` with correct column references
    - Adds cleanup for: student_session_logs, generation_status, analytics_error_logs
*/

CREATE OR REPLACE FUNCTION delete_teacher_account(p_username TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  DELETE FROM student_session_logs WHERE teacher_username = p_username;
  DELETE FROM generation_status WHERE teacher_username = p_username;
  DELETE FROM analytics_error_logs WHERE teacher_username = p_username;
  DELETE FROM students WHERE teacher_username = p_username;
  DELETE FROM teacher_sessions WHERE teacher_username = p_username;
  DELETE FROM password_reset_requests WHERE teacher_username = p_username;
  DELETE FROM teacher_accounts WHERE username = p_username;
  DELETE FROM teachers WHERE username = p_username;

  INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, details, ip_address)
  VALUES (auth.uid(), 'delete_account', 'teacher', p_username,
    jsonb_build_object('timestamp', now(), 'cascade_delete', true), inet_client_addr());

  RETURN jsonb_build_object('success', true, 'message', 'Teacher account and all related data deleted successfully');
END;
$$;
