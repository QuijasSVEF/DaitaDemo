/*
  # Fix ambiguous username column reference in get_teacher_usage_analytics

  1. Database Function Fix
    - Update `get_teacher_usage_analytics` function to properly qualify all username column references
    - Add table aliases to remove ambiguity between teachers.username and other username columns
    - Ensure all column references are explicit and unambiguous

  2. Function Improvements
    - Maintain existing functionality while fixing the column reference issue
    - Preserve all existing return columns and data types
    - Add proper table aliasing throughout the query
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_teacher_usage_analytics(uuid);

-- Recreate with proper column qualification
CREATE OR REPLACE FUNCTION get_teacher_usage_analytics(p_district_id uuid DEFAULT NULL)
RETURNS TABLE (
  username text,
  name text,
  total_logins bigint,
  last_login timestamp with time zone,
  assessments_created bigint,
  lessons_generated bigint,
  students_managed bigint,
  total_quiz_attempts bigint,
  district_name text,
  days_since_last_login integer,
  total_active_days bigint,
  average_sessions_per_week numeric,
  usage_frequency text
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.username,
    t.name,
    COALESCE(t.login_count, 0)::bigint as total_logins,
    t.last_login,
    COALESCE(qt_count.count, 0)::bigint as assessments_created,
    COALESCE(lp_count.count, 0)::bigint as lessons_generated,
    COALESCE(s_count.count, 0)::bigint as students_managed,
    COALESCE(qa_count.count, 0)::bigint as total_quiz_attempts,
    COALESCE(sd.name, 'No District') as district_name,
    CASE 
      WHEN t.last_login IS NULL THEN NULL
      ELSE EXTRACT(days FROM (NOW() - t.last_login))::integer
    END as days_since_last_login,
    COALESCE(
      (SELECT COUNT(DISTINCT DATE(qa.created_at))::bigint 
       FROM quiz_attempts qa 
       WHERE qa.teacher_username = t.username), 
      0
    ) as total_active_days,
    CASE 
      WHEN t.created_at IS NULL OR t.created_at > NOW() - INTERVAL '1 week' THEN 0
      ELSE COALESCE(t.login_count, 0)::numeric / 
           GREATEST(1, EXTRACT(weeks FROM (NOW() - t.created_at))::numeric)
    END as average_sessions_per_week,
    CASE 
      WHEN COALESCE(t.login_count, 0) >= 20 THEN 'Very Active'
      WHEN COALESCE(t.login_count, 0) >= 10 THEN 'Active'
      WHEN COALESCE(t.login_count, 0) >= 5 THEN 'Moderate'
      WHEN COALESCE(t.login_count, 0) >= 1 THEN 'Low Activity'
      ELSE 'Inactive'
    END as usage_frequency
  FROM teachers t
  LEFT JOIN school_districts sd ON t.district_id = sd.id
  LEFT JOIN (
    SELECT teacher_username, COUNT(*)::bigint as count
    FROM quiz_templates 
    GROUP BY teacher_username
  ) qt_count ON qt_count.teacher_username = t.username
  LEFT JOIN (
    SELECT teacher_username, COUNT(*)::bigint as count
    FROM lesson_plans 
    GROUP BY teacher_username
  ) lp_count ON lp_count.teacher_username = t.username
  LEFT JOIN (
    SELECT teacher_username, COUNT(*)::bigint as count
    FROM students 
    GROUP BY teacher_username
  ) s_count ON s_count.teacher_username = t.username
  LEFT JOIN (
    SELECT teacher_username, COUNT(*)::bigint as count
    FROM quiz_attempts 
    GROUP BY teacher_username
  ) qa_count ON qa_count.teacher_username = t.username
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
  ORDER BY t.name;
END;
$$;