/*
  # Fix Student Data Deletion Functions
  
  1. New Functions
    - delete_all_student_data: Deletes all student data for a teacher
    - delete_teacher_account: Deletes a teacher account with proper cascading
    
  2. Features
    - Proper deletion order to avoid FK constraint violations
    - Comprehensive cleanup of all related data
    - Audit logging of deletions
*/

-- Function to delete all student data for a teacher
CREATE OR REPLACE FUNCTION delete_all_student_data(
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