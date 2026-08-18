/*
  # Fix get_teacher_performance function type mismatch

  1. Function Updates
    - Drop and recreate `get_teacher_performance` function
    - Fix column 3 type mismatch (bigint vs integer)
    - Simplify function to show all teacher performance data without filtering
    - Ensure all return types match the actual query results

  2. Changes Made
    - Updated return type for total_students column to bigint
    - Simplified query to remove complex filtering that was causing issues
    - Added proper type casting where needed
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_teacher_performance();

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION get_teacher_performance()
RETURNS TABLE (
  teacher_username text,
  teacher_name text,
  total_students bigint,
  average_score numeric,
  total_assessments bigint,
  student_improvement numeric,
  last_activity timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.username::text,
    t.name::text,
    COALESCE(student_counts.total_students, 0)::bigint,
    COALESCE(quiz_stats.avg_score, 0.0)::numeric,
    COALESCE(quiz_stats.total_assessments, 0)::bigint,
    COALESCE(quiz_stats.improvement, 0.0)::numeric,
    COALESCE(quiz_stats.last_activity, t.created_at)::timestamp with time zone
  FROM teachers t
  LEFT JOIN (
    SELECT 
      teacher_username,
      COUNT(DISTINCT id) as total_students
    FROM students 
    GROUP BY teacher_username
  ) student_counts ON t.username = student_counts.teacher_username
  LEFT JOIN (
    SELECT 
      qa.teacher_username,
      AVG(CAST(qa.score AS numeric) / CAST(qa.total_questions AS numeric) * 100) as avg_score,
      COUNT(*) as total_assessments,
      CASE 
        WHEN COUNT(*) > 1 THEN
          (AVG(CAST(qa.score AS numeric) / CAST(qa.total_questions AS numeric) * 100) 
           FILTER (WHERE qa.completed_at >= NOW() - INTERVAL '30 days')) -
          (AVG(CAST(qa.score AS numeric) / CAST(qa.total_questions AS numeric) * 100) 
           FILTER (WHERE qa.completed_at < NOW() - INTERVAL '30 days'))
        ELSE 0
      END as improvement,
      MAX(qa.completed_at) as last_activity
    FROM quiz_attempts qa
    GROUP BY qa.teacher_username
  ) quiz_stats ON t.username = quiz_stats.teacher_username
  WHERE t.account_status = 'active'
  ORDER BY t.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_teacher_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_performance() TO public;