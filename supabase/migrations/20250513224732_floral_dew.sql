/*
  # Fix Teacher Account Deletion Functions
  
  1. Changes
    - Drop existing functions first
    - Recreate with proper cascade deletion
    - Fix return type issues
    
  2. Features
    - Safe deletion of all related data
    - Proper order to avoid FK violations
    - Audit logging
*/

-- Drop existing functions first
DROP FUNCTION IF EXISTS delete_all_student_data(text);
DROP FUNCTION IF EXISTS delete_teacher_account(text);

-- Function to delete all student data for a teacher
CREATE FUNCTION delete_all_student_data(
  p_teacher_username TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quiz_template_ids UUID[];
BEGIN
  -- Get all quiz template IDs for this teacher
  SELECT array_agg(id)
  INTO v_quiz_template_ids
  FROM quiz_templates
  WHERE teacher_username = p_teacher_username;
  
  -- Delete quiz questions first (to avoid FK constraint violations)
  IF v_quiz_template_ids IS NOT NULL AND array_length(v_quiz_template_ids, 1) > 0 THEN
    DELETE FROM quiz_questions
    WHERE template_id = ANY(v_quiz_template_ids);
  END IF;
  
  -- Delete quiz templates
  DELETE FROM quiz_templates
  WHERE teacher_username = p_teacher_username;
  
  -- Delete quiz attempts
  DELETE FROM quiz_attempts
  WHERE teacher_username = p_teacher_username;
  
  -- Delete group lesson plans
  DELETE FROM group_lesson_plans
  WHERE teacher_username = p_teacher_username;
  
  -- Delete weekly groups
  DELETE FROM weekly_groups
  WHERE teacher_username = p_teacher_username;
  
  -- Delete standards alignments
  DELETE FROM standards_alignments
  WHERE teacher_username = p_teacher_username;
  
  -- Delete lesson plans
  DELETE FROM lesson_plans
  WHERE teacher_username = p_teacher_username;
  
  -- Delete exit tickets
  DELETE FROM exit_tickets
  WHERE teacher_username = p_teacher_username;
  
  -- Delete classroom analytics
  DELETE FROM classroom_analytics
  WHERE teacher_username = p_teacher_username;
  
  -- Finally delete students
  DELETE FROM students
  WHERE teacher_username = p_teacher_username;
  
  -- Log the deletion
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'delete_all_student_data',
    'teacher',
    p_teacher_username,
    jsonb_build_object(
      'timestamp', now(),
      'deleted_quiz_templates', array_length(v_quiz_template_ids, 1)
    ),
    inet_client_addr()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'All student data deleted successfully'
  );
END;
$$;

-- Function to delete teacher account with proper cascade
CREATE FUNCTION delete_teacher_account(
  p_username TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_exists BOOLEAN;
  v_quiz_template_ids UUID[];
BEGIN
  -- Check if teacher exists
  SELECT EXISTS (
    SELECT 1 FROM teachers WHERE username = p_username
  ) INTO v_teacher_exists;

  IF NOT v_teacher_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Get all quiz template IDs for this teacher
  SELECT array_agg(id)
  INTO v_quiz_template_ids
  FROM quiz_templates
  WHERE teacher_username = p_username;
  
  -- Delete quiz questions first (to avoid FK constraint violations)
  IF v_quiz_template_ids IS NOT NULL AND array_length(v_quiz_template_ids, 1) > 0 THEN
    DELETE FROM quiz_questions
    WHERE template_id = ANY(v_quiz_template_ids);
  END IF;

  -- Delete quiz templates
  DELETE FROM quiz_templates
  WHERE teacher_username = p_username;

  -- Delete from tables that reference teachers
  DELETE FROM classroom_analytics
  WHERE teacher_username = p_username;

  DELETE FROM group_lesson_plans
  WHERE teacher_username = p_username;

  DELETE FROM weekly_groups
  WHERE teacher_username = p_username;

  DELETE FROM quiz_attempts
  WHERE teacher_username = p_username;

  DELETE FROM standards_alignments
  WHERE teacher_username = p_username;

  DELETE FROM lesson_plans
  WHERE teacher_username = p_username;

  DELETE FROM exit_tickets
  WHERE teacher_username = p_username;

  DELETE FROM students
  WHERE teacher_username = p_username;

  -- Delete from tables that reference teacher_accounts
  DELETE FROM teacher_sessions
  WHERE teacher_id IN (
    SELECT id FROM teacher_accounts WHERE username = p_username
  );

  DELETE FROM password_reset_requests
  WHERE teacher_id IN (
    SELECT id FROM teacher_accounts WHERE username = p_username
  );

  -- Delete teacher account
  DELETE FROM teacher_accounts
  WHERE username = p_username;

  -- Finally delete the teacher
  DELETE FROM teachers
  WHERE username = p_username;

  -- Log the deletion
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'delete_account',
    'teacher',
    p_username,
    jsonb_build_object(
      'timestamp', now(),
      'cascade_delete', true,
      'deleted_quiz_templates', array_length(v_quiz_template_ids, 1)
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Teacher account and all related data deleted successfully'
  );
END;
$$;