/*
  # Enhanced Teacher Usage Analytics

  1. New Functions
    - Enhanced `get_teacher_usage_analytics()` to include usage frequency metrics
    - Added session tracking and usage pattern analysis

  2. New Metrics
    - Days since last login
    - Average sessions per week
    - Usage frequency classification
    - Total active days
*/

-- Drop existing function to recreate with enhanced metrics
DROP FUNCTION IF EXISTS get_teacher_usage_analytics(uuid);

-- Enhanced teacher usage analytics function
CREATE OR REPLACE FUNCTION get_teacher_usage_analytics(p_district_id uuid DEFAULT NULL)
RETURNS TABLE(
  username text,
  name text,
  district_name text,
  total_logins integer,
  last_login timestamp with time zone,
  assessments_created integer,
  lessons_generated integer,
  students_managed integer,
  days_since_last_login integer,
  total_active_days integer,
  average_sessions_per_week numeric,
  usage_frequency text
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH teacher_stats AS (
    SELECT 
      t.username,
      t.name,
      COALESCE(sd.name, 'No District') as district_name,
      COALESCE(t.login_count, 0) as total_logins,
      t.last_login,
      
      -- Count assessments created
      (SELECT COUNT(*) FROM quiz_templates qt WHERE qt.teacher_username = t.username) as assessments_created,
      
      -- Count lessons generated
      (SELECT COUNT(*) FROM lesson_plans lp WHERE lp.teacher_username = t.username) as lessons_generated,
      
      -- Count students managed
      (SELECT COUNT(DISTINCT s.id) FROM students s WHERE s.teacher_username = t.username) as students_managed,
      
      -- Days since last login
      CASE 
        WHEN t.last_login IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM NOW() - t.last_login)::integer
      END as days_since_last_login,
      
      -- Calculate total active days (days with any activity)
      (
        SELECT COUNT(DISTINCT DATE(activity_date))
        FROM (
          SELECT created_at as activity_date FROM quiz_templates WHERE teacher_username = t.username
          UNION ALL
          SELECT created_at as activity_date FROM lesson_plans WHERE teacher_username = t.username
          UNION ALL
          SELECT created_at as activity_date FROM exit_tickets WHERE teacher_username = t.username
          UNION ALL
          SELECT created_at as activity_date FROM students WHERE teacher_username = t.username
        ) activities
      ) as total_active_days,
      
      -- Calculate average sessions per week (based on login frequency)
      CASE 
        WHEN t.created_at IS NULL OR t.login_count = 0 THEN 0
        ELSE (t.login_count::numeric / GREATEST(1, EXTRACT(WEEK FROM NOW() - t.created_at)))
      END as avg_sessions_per_week
      
    FROM teachers t
    LEFT JOIN school_districts sd ON t.district_id = sd.id
    WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
      AND t.account_status = 'active'
  )
  SELECT 
    ts.username,
    ts.name,
    ts.district_name,
    ts.total_logins,
    ts.last_login,
    ts.assessments_created,
    ts.lessons_generated,
    ts.students_managed,
    ts.days_since_last_login,
    ts.total_active_days,
    ROUND(ts.avg_sessions_per_week, 2) as average_sessions_per_week,
    
    -- Classify usage frequency
    CASE 
      WHEN ts.total_logins = 0 THEN 'Never Used'
      WHEN ts.days_since_last_login IS NULL THEN 'Never Logged In'
      WHEN ts.days_since_last_login <= 7 AND ts.avg_sessions_per_week >= 2 THEN 'Very Active'
      WHEN ts.days_since_last_login <= 14 AND ts.avg_sessions_per_week >= 1 THEN 'Active'
      WHEN ts.days_since_last_login <= 30 AND ts.total_logins >= 5 THEN 'Moderate'
      WHEN ts.days_since_last_login <= 60 THEN 'Low Activity'
      ELSE 'Inactive'
    END as usage_frequency
    
  FROM teacher_stats ts
  ORDER BY ts.total_logins DESC, ts.last_login DESC NULLS LAST;
END;
$$;