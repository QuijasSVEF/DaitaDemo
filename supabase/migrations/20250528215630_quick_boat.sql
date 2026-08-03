/*
  # Improve delete_all_student_data function
  
  1. Changes
    - Improve the delete_all_student_data function to properly handle all related data
    - Ensure proper deletion order to avoid foreign key constraint violations
    - Add proper error handling and transaction support
    
  2. Security
    - Function is SECURITY DEFINER to ensure proper permissions
    - Proper search_path setting to prevent SQL injection
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS delete_all_student_data(text);

-- Create improved function to delete all student data
CREATE OR REPLACE FUNCTION delete_all_student_data(
  p_teacher_username TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quiz_template_ids UUID[];
  v_deleted_count RECORD;
BEGIN
  -- Start a transaction to ensure all or nothing
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
    
    -- Delete quiz attempts
    WITH deleted AS (
      DELETE FROM quiz_attempts
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Delete quiz templates
    WITH deleted AS (
      DELETE FROM quiz_templates
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Delete group lesson plans
    WITH deleted AS (
      DELETE FROM group_lesson_plans
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Delete weekly groups
    WITH deleted AS (
      DELETE FROM weekly_groups
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Delete standards alignments
    WITH deleted AS (
      DELETE FROM standards_alignments
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Delete lesson plans
    WITH deleted AS (
      DELETE FROM lesson_plans
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Delete exit tickets
    WITH deleted AS (
      DELETE FROM exit_tickets
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Delete classroom analytics
    WITH deleted AS (
      DELETE FROM classroom_analytics
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Finally delete students
    WITH deleted AS (
      DELETE FROM students
      WHERE teacher_username = p_teacher_username
      RETURNING *
    )
    SELECT count(*) INTO v_deleted_count FROM deleted;
    
    -- Log the deletion
    INSERT INTO admin_audit_logs (
      action,
      target_type,
      target_id,
      details,
      ip_address
    ) VALUES (
      'delete_all_student_data',
      'teacher',
      p_teacher_username,
      jsonb_build_object(
        'timestamp', now(),
        'deleted_quiz_templates', array_length(v_quiz_template_ids, 1)
      ),
      inet_client_addr()
    );
    
    -- Return success
    RETURN jsonb_build_object(
      'success', true,
      'message', 'All student data deleted successfully'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Return error
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Failed to delete student data: ' || SQLERRM
    );
  END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_all_student_data(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_all_student_data IS 'Deletes all student data for a teacher, including quiz attempts, lesson plans, and related data';