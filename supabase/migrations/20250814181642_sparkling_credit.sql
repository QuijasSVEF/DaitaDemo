/*
  # Fix data type mismatch in get_teacher_usage_analytics function

  1. Changes
    - Update the return type for column 8 from integer to bigint to match actual query results
    - This resolves the PostgreSQL error 42804 about type mismatch

  2. Notes
    - The function was returning bigint values but declared as integer
    - Changing return type is safer than casting large numbers to integer
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_teacher_usage_analytics(text);

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION get_teacher_usage_analytics(teacher_username_param text)
RETURNS TABLE (
  total_students integer,
  total_assessments integer,
  average_score numeric,
  total_exit_tickets integer,
  total_lesson_plans integer,
  active_students integer,
  recent_activity_count integer,
  total_quiz_attempts bigint  -- Changed from integer to bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*)::integer FROM students WHERE students.teacher_username = teacher_username_param), 0) as total_students,
    COALESCE((SELECT COUNT(*)::integer FROM quiz_attempts WHERE quiz_attempts.teacher_username = teacher_username_param), 0) as total_assessments,
    COALESCE((SELECT AVG(score::numeric) FROM quiz_attempts WHERE quiz_attempts.teacher_username = teacher_username_param), 0) as average_score,
    COALESCE((SELECT COUNT(*)::integer FROM exit_tickets WHERE exit_tickets.teacher_username = teacher_username_param), 0) as total_exit_tickets,
    COALESCE((SELECT COUNT(*)::integer FROM lesson_plans WHERE lesson_plans.teacher_username = teacher_username_param), 0) as total_lesson_plans,
    COALESCE((SELECT COUNT(*)::integer FROM students WHERE students.teacher_username = teacher_username_param AND students.last_seen > NOW() - INTERVAL '7 days'), 0) as active_students,
    COALESCE((SELECT COUNT(*)::integer FROM quiz_attempts WHERE quiz_attempts.teacher_username = teacher_username_param AND quiz_attempts.completed_at > NOW() - INTERVAL '7 days'), 0) as recent_activity_count,
    COALESCE((SELECT COUNT(*) FROM quiz_attempts WHERE quiz_attempts.teacher_username = teacher_username_param), 0) as total_quiz_attempts  -- This returns bigint naturally
  ;
END;
$$;