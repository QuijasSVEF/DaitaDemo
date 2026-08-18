/*
  # Fix PostgreSQL interval weeks error

  1. Database Function Updates
    - Replace 'weeks' interval unit with '7 days'
    - Fix date arithmetic for weekly calculations
    - Ensure proper type casting for all numeric operations

  2. Error Handling
    - Add proper error handling in analytics functions
    - Provide fallback values for failed calculations
*/

-- Drop and recreate the problematic function with correct interval syntax
DROP FUNCTION IF EXISTS get_teacher_usage_analytics(uuid);

CREATE OR REPLACE FUNCTION get_teacher_usage_analytics(p_district_id uuid DEFAULT NULL)
RETURNS TABLE (
  username text,
  name text,
  total_logins bigint,
  last_login timestamptz,
  assessments_created bigint,
  lessons_generated bigint,
  students_managed bigint,
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
    COALESCE(login_stats.total_logins, 0::bigint) as total_logins,
    t.last_login,
    COALESCE(quiz_stats.assessments_created, 0::bigint) as assessments_created,
    COALESCE(lesson_stats.lessons_generated, 0::bigint) as lessons_generated,
    COALESCE(student_stats.students_managed, 0::bigint) as students_managed,
    COALESCE(sd.name, 'No District') as district_name,
    CASE 
      WHEN t.last_login IS NULL THEN NULL
      ELSE EXTRACT(days FROM (NOW() - t.last_login))::integer
    END as days_since_last_login,
    COALESCE(login_stats.total_active_days, 0::bigint) as total_active_days,
    CASE 
      WHEN login_stats.total_active_days > 0 THEN 
        ROUND((login_stats.total_logins::numeric / GREATEST(login_stats.total_active_days::numeric / 7.0, 1)), 2)
      ELSE 0
    END as average_sessions_per_week,
    CASE 
      WHEN t.last_login IS NULL OR t.last_login < (NOW() - INTERVAL '30 days') THEN 'Inactive'
      WHEN login_stats.total_logins >= 20 AND t.last_login > (NOW() - INTERVAL '7 days') THEN 'Very Active'
      WHEN login_stats.total_logins >= 10 AND t.last_login > (NOW() - INTERVAL '14 days') THEN 'Active'
      WHEN login_stats.total_logins >= 5 AND t.last_login > (NOW() - INTERVAL '21 days') THEN 'Moderate'
      ELSE 'Low Activity'
    END as usage_frequency
  FROM teachers t
  LEFT JOIN school_districts sd ON t.district_id = sd.id
  LEFT JOIN (
    SELECT 
      t_inner.username,
      COUNT(DISTINCT DATE(t_inner.last_login)) as total_active_days,
      COUNT(*) as total_logins
    FROM teachers t_inner 
    WHERE t_inner.last_login IS NOT NULL
    GROUP BY t_inner.username
  ) login_stats ON t.username = login_stats.username
  LEFT JOIN (
    SELECT 
      qt.teacher_username,
      COUNT(*) as assessments_created
    FROM quiz_templates qt
    GROUP BY qt.teacher_username
  ) quiz_stats ON t.username = quiz_stats.teacher_username
  LEFT JOIN (
    SELECT 
      lp.teacher_username,
      COUNT(*) as lessons_generated
    FROM lesson_plans lp
    GROUP BY lp.teacher_username
  ) lesson_stats ON t.username = lesson_stats.teacher_username
  LEFT JOIN (
    SELECT 
      s.teacher_username,
      COUNT(DISTINCT s.id) as students_managed
    FROM students s
    GROUP BY s.teacher_username
  ) student_stats ON t.username = student_stats.teacher_username
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM teachers t WHERE (p_district_id IS NULL OR t.district_id = p_district_id))::bigint as total_teachers,
    (SELECT COUNT(*) FROM students s 
     JOIN teachers t ON s.teacher_username = t.username 
     WHERE (p_district_id IS NULL OR t.district_id = p_district_id))::bigint as total_students,
    (SELECT COUNT(*) FROM quiz_attempts qa 
     JOIN teachers t ON qa.teacher_username = t.username 
     WHERE (p_district_id IS NULL OR t.district_id = p_district_id))::bigint as total_assessments,
    (SELECT COUNT(*) FROM lesson_plans lp 
     JOIN teachers t ON lp.teacher_username = t.username 
     WHERE (p_district_id IS NULL OR t.district_id = p_district_id))::bigint as total_lessons,
    (SELECT COUNT(*) FROM teachers t 
     WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
     AND t.last_login > (NOW() - INTERVAL '30 days'))::bigint as active_teachers,
    (SELECT COUNT(*) FROM teachers t 
     WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
     AND t.account_locked = true)::bigint as locked_accounts;
END;
$$;

-- Fix assessment history function
DROP FUNCTION IF EXISTS get_assessment_history(uuid);

CREATE OR REPLACE FUNCTION get_assessment_history(p_district_id uuid DEFAULT NULL)
RETURNS TABLE (
  all_assessments json
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    json_agg(
      json_build_object(
        'last_lesson', et.last_lesson,
        'student_id', et.student_id,
        'score', et.score,
        'total_questions', et.total_questions,
        'created_at', et.created_at::text
      ) ORDER BY et.created_at DESC
    ) as all_assessments
  FROM exit_tickets et
  JOIN teachers t ON et.teacher_username = t.username
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
  AND et.created_at > (NOW() - INTERVAL '30 days');
END;
$$;

-- Fix lesson timeline function
DROP FUNCTION IF EXISTS get_lesson_timeline();

CREATE OR REPLACE FUNCTION get_lesson_timeline()
RETURNS TABLE (
  lessons json
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    json_agg(
      json_build_object(
        'objective', lp.objective,
        'student_id', lp.student_id,
        'created_at', lp.created_at::text,
        'updated_at', lp.updated_at::text
      ) ORDER BY lp.created_at DESC
    ) as lessons
  FROM lesson_plans lp
  WHERE lp.created_at > (NOW() - INTERVAL '30 days')
  LIMIT 50;
END;
$$;