/*
  # Fix teacher usage analytics type mismatch

  1. Changes
    - Cast bigint columns to integer to match expected return types
    - Fix total_active_days (column 6) bigint to integer conversion
    - Fix other COUNT operations that return bigint

  2. Affected Columns
    - total_active_days: COUNT(DISTINCT) returns bigint, cast to integer
    - assessments_created: COUNT returns bigint, cast to integer  
    - lessons_generated: COUNT returns bigint, cast to integer
    - students_managed: COUNT returns bigint, cast to integer
*/

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
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.username,
    t.name,
    COALESCE(sd.name, 'No District') as district_name,
    CASE 
      WHEN t.last_login IS NULL THEN 'Never Logged In'
      WHEN t.last_login >= NOW() - INTERVAL '7 days' AND 
           (t.login_count::numeric / GREATEST(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 604800, 1)) >= 2 
           THEN 'Very Active'
      WHEN t.last_login >= NOW() - INTERVAL '14 days' AND 
           (t.login_count::numeric / GREATEST(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 604800, 1)) >= 1 
           THEN 'Active'
      WHEN t.last_login >= NOW() - INTERVAL '30 days' AND t.login_count >= 5 THEN 'Moderate'
      WHEN t.last_login >= NOW() - INTERVAL '60 days' THEN 'Low Activity'
      ELSE 'Inactive'
    END as usage_frequency,
    COALESCE(t.login_count, 0) as total_logins,
    ROUND(
      t.login_count::numeric / GREATEST(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 604800, 1), 
      1
    ) as average_sessions_per_week,
    COALESCE(
      (SELECT COUNT(DISTINCT DATE(qa.created_at))::integer
       FROM quiz_attempts qa 
       WHERE qa.teacher_username = t.username), 
      0
    ) +
    COALESCE(
      (SELECT COUNT(DISTINCT DATE(lp.created_at))::integer
       FROM lesson_plans lp 
       WHERE lp.teacher_username = t.username), 
      0
    ) +
    COALESCE(
      (SELECT COUNT(DISTINCT DATE(qt.created_at))::integer
       FROM quiz_templates qt 
       WHERE qt.teacher_username = t.username), 
      0
    ) as total_active_days,
    CASE 
      WHEN t.last_login IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM NOW() - t.last_login)::integer
    END as days_since_last_login,
    t.last_login,
    COALESCE(
      (SELECT COUNT(*)::integer FROM quiz_templates qt WHERE qt.teacher_username = t.username), 
      0
    ) as assessments_created,
    COALESCE(
      (SELECT COUNT(*)::integer FROM lesson_plans lp WHERE lp.teacher_username = t.username), 
      0
    ) as lessons_generated,
    COALESCE(
      (SELECT COUNT(DISTINCT s.id)::integer FROM students s WHERE s.teacher_username = t.username), 
      0
    ) as students_managed
  FROM teachers t
  LEFT JOIN school_districts sd ON t.district_id = sd.id
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    AND t.account_status = 'active'
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql;