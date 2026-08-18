/*
  # Fix Teacher Account Deletion
  
  1. Changes
    - Add cascading delete function for teacher accounts
    - Handle all related records properly
    - Maintain audit logging
    
  2. Security
    - Ensure proper order of deletion
    - Log all deletions
*/

-- Function to delete teacher account with proper cascading
CREATE OR REPLACE FUNCTION delete_teacher_account(
  p_username TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_exists BOOLEAN;
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

  -- Start with child tables that reference teacher_accounts
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

  -- Delete from tables that reference teachers
  DELETE FROM classroom_analytics
  WHERE teacher_username = p_username;

  DELETE FROM group_lesson_plans
  WHERE teacher_username = p_username;

  DELETE FROM weekly_groups
  WHERE teacher_username = p_username;

  DELETE FROM quiz_attempts
  WHERE teacher_username = p_username;

  DELETE FROM quiz_templates
  WHERE teacher_username = p_username;

  DELETE FROM standards_alignments
  WHERE teacher_username = p_username;

  DELETE FROM lesson_plans
  WHERE teacher_username = p_username;

  DELETE FROM exit_tickets
  WHERE teacher_username = p_username;

  DELETE FROM students
  WHERE teacher_username = p_username;

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
      'cascade_delete', true
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Teacher account and all related data deleted successfully'
  );
END;
$$;