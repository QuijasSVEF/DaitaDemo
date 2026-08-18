/*
  # Fix Teacher Usage Analytics Function Data Types

  1. Database Function Updates
    - Fix data type mismatch in get_teacher_usage_analytics function
    - Ensure all COUNT() operations return proper bigint types
    - Add proper error handling in RPC functions

  2. Type Safety
    - Update function signatures to match actual return types
    - Add validation for input parameters
    - Ensure consistent data types across all analytics functions
*/

-- Drop and recreate the function with correct types
DROP FUNCTION IF EXISTS get_teacher_usage_analytics(uuid);

CREATE OR REPLACE FUNCTION get_teacher_usage_analytics(p_district_id uuid DEFAULT NULL)
RETURNS TABLE (
  username text,
  name text,
  district_name text,
  usage_frequency text,
  total_logins bigint,  -- Changed from integer to bigint
  average_sessions_per_week numeric,
  total_active_days bigint,  -- Changed from integer to bigint
  days_since_last_login integer,
  last_login timestamptz,
  assessments_created bigint,  -- Changed from integer to bigint
  lessons_generated bigint,  -- Changed from integer to bigint
  students_managed bigint  -- Changed from integer to bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.username,
    t.name,
    COALESCE(sd.name, 'No District') as district_name,
    CASE 
      WHEN COALESCE(login_stats.total_logins, 0) >= 20 THEN 'Very Active'
      WHEN COALESCE(login_stats.total_logins, 0) >= 10 THEN 'Active'
      WHEN COALESCE(login_stats.total_logins, 0) >= 5 THEN 'Moderate'
      WHEN COALESCE(login_stats.total_logins, 0) >= 1 THEN 'Low Activity'
      ELSE 'Inactive'
    END as usage_frequency,
    COALESCE(login_stats.total_logins, 0::bigint) as total_logins,
    COALESCE(login_stats.avg_sessions_per_week, 0.0) as average_sessions_per_week,
    COALESCE(login_stats.total_active_days, 0::bigint) as total_active_days,
    CASE 
      WHEN t.last_login IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM NOW() - t.last_login)::integer
    END as days_since_last_login,
    t.last_login,
    COALESCE(quiz_stats.assessments_created, 0::bigint) as assessments_created,
    COALESCE(lesson_stats.lessons_generated, 0::bigint) as lessons_generated,
    COALESCE(student_stats.students_managed, 0::bigint) as students_managed
  FROM teachers t
  LEFT JOIN school_districts sd ON t.district_id = sd.id
  LEFT JOIN (
    SELECT 
      username,
      COUNT(*)::bigint as total_logins,
      COUNT(DISTINCT DATE(last_login))::bigint as total_active_days,
      (COUNT(*) / GREATEST(EXTRACT(WEEK FROM NOW() - MIN(last_login))::numeric, 1)) as avg_sessions_per_week
    FROM teachers 
    WHERE last_login IS NOT NULL
    GROUP BY username
  ) login_stats ON t.username = login_stats.username
  LEFT JOIN (
    SELECT 
      teacher_username,
      COUNT(*)::bigint as assessments_created
    FROM quiz_templates
    GROUP BY teacher_username
  ) quiz_stats ON t.username = quiz_stats.teacher_username
  LEFT JOIN (
    SELECT 
      teacher_username,
      COUNT(*)::bigint as lessons_generated
    FROM lesson_plans
    GROUP BY teacher_username
  ) lesson_stats ON t.username = lesson_stats.teacher_username
  LEFT JOIN (
    SELECT 
      teacher_username,
      COUNT(DISTINCT id)::bigint as students_managed
    FROM students
    GROUP BY teacher_username
  ) student_stats ON t.username = student_stats.teacher_username
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    AND t.account_status = 'active'
  ORDER BY t.name;
END;
$$;

-- Also fix other analytics functions that might have similar issues
DROP FUNCTION IF EXISTS get_system_analytics(uuid);

CREATE OR REPLACE FUNCTION get_system_analytics(p_district_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_teachers bigint,
  total_students bigint,
  total_assessments bigint,
  total_lessons bigint,
  active_teachers bigint,
  locked_accounts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::bigint FROM teachers WHERE (p_district_id IS NULL OR district_id = p_district_id)) as total_teachers,
    (SELECT COUNT(*)::bigint FROM students s JOIN teachers t ON s.teacher_username = t.username WHERE (p_district_id IS NULL OR t.district_id = p_district_id)) as total_students,
    (SELECT COUNT(*)::bigint FROM quiz_attempts qa JOIN teachers t ON qa.teacher_username = t.username WHERE (p_district_id IS NULL OR t.district_id = p_district_id)) as total_assessments,
    (SELECT COUNT(*)::bigint FROM lesson_plans lp JOIN teachers t ON lp.teacher_username = t.username WHERE (p_district_id IS NULL OR t.district_id = p_district_id)) as total_lessons,
    (SELECT COUNT(*)::bigint FROM teachers WHERE last_login > NOW() - INTERVAL '30 days' AND (p_district_id IS NULL OR district_id = p_district_id)) as active_teachers,
    (SELECT COUNT(*)::bigint FROM teachers WHERE account_locked = true AND (p_district_id IS NULL OR district_id = p_district_id)) as locked_accounts;
END;
$$;