/*
  # Fix Teacher Usage Analytics Function Type Mismatch

  1. Changes Made
    - Drop and recreate the function with proper type casting
    - Ensure all COUNT() operations are cast to integer
    - Fix the function return type definition to match actual returned types
    - Handle potential NULL values properly

  2. Function Updates
    - Cast all bigint operations to integer explicitly
    - Use COALESCE to handle NULL values
    - Ensure consistent type handling throughout
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_teacher_usage_analytics(uuid);

-- Recreate with proper type handling
CREATE OR REPLACE FUNCTION get_teacher_usage_analytics(p_district_id uuid DEFAULT NULL)
RETURNS TABLE (
  username text,
  name text,
  district_name text,
  usage_frequency text,
  total_logins integer,
  average_sessions_per_week numeric,
  total_active_days integer,
  days_since_last_login integer,
  last_login timestamp with time zone,
  assessments_created integer,
  lessons_generated integer,
  students_managed integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.username,
    t.name,
    COALESCE(sd.name, 'No District') as district_name,
    CASE 
      WHEN t.last_login IS NULL THEN 'Never Logged In'
      WHEN t.last_login >= NOW() - INTERVAL '7 days' AND COALESCE(t.login_count, 0) >= 14 THEN 'Very Active'
      WHEN t.last_login >= NOW() - INTERVAL '14 days' AND COALESCE(t.login_count, 0) >= 7 THEN 'Active'
      WHEN t.last_login >= NOW() - INTERVAL '30 days' AND COALESCE(t.login_count, 0) >= 5 THEN 'Moderate'
      WHEN t.last_login >= NOW() - INTERVAL '60 days' THEN 'Low Activity'
      ELSE 'Inactive'
    END as usage_frequency,
    COALESCE(t.login_count, 0) as total_logins,
    CASE 
      WHEN t.created_at IS NOT NULL AND t.created_at < NOW() THEN
        ROUND(
          COALESCE(t.login_count, 0)::numeric / 
          GREATEST(EXTRACT(DAYS FROM (NOW() - t.created_at))::numeric / 7, 1), 
          1
        )
      ELSE 0
    END as average_sessions_per_week,
    COALESCE((
      SELECT COUNT(DISTINCT DATE(qa.created_at))::integer
      FROM quiz_attempts qa 
      WHERE qa.teacher_username = t.username
    ), 0) + COALESCE((
      SELECT COUNT(DISTINCT DATE(lp.created_at))::integer
      FROM lesson_plans lp 
      WHERE lp.teacher_username = t.username
    ), 0) + COALESCE((
      SELECT COUNT(DISTINCT DATE(qt.created_at))::integer
      FROM quiz_templates qt 
      WHERE qt.teacher_username = t.username
    ), 0) as total_active_days,
    CASE 
      WHEN t.last_login IS NOT NULL THEN 
        EXTRACT(DAY FROM (NOW() - t.last_login))::integer
      ELSE NULL
    END as days_since_last_login,
    t.last_login,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM quiz_templates qt 
      WHERE qt.teacher_username = t.username
    ), 0) as assessments_created,
    COALESCE((
      SELECT COUNT(*)::integer
      FROM lesson_plans lp 
      WHERE lp.teacher_username = t.username
    ), 0) as lessons_generated,
    COALESCE((
      SELECT COUNT(DISTINCT s.id)::integer
      FROM students s 
      WHERE s.teacher_username = t.username
    ), 0) as students_managed
  FROM teachers t
  LEFT JOIN school_districts sd ON t.district_id = sd.id
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    AND t.account_status = 'active'
  ORDER BY t.name;
END;
$$;