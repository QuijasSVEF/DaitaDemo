/*
  # Fix teacher usage analytics function

  1. Database Changes
    - Drop existing get_teacher_usage_analytics function
    - Recreate with correct return type structure
    - Ensure all columns match expected types

  2. Function Updates
    - Proper handling of district filtering
    - Accurate usage frequency calculations
    - Correct data type mappings
*/

-- Drop the existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_teacher_usage_analytics(UUID);

-- Recreate the function with the correct signature
CREATE OR REPLACE FUNCTION get_teacher_usage_analytics(p_district_id UUID DEFAULT NULL)
RETURNS TABLE (
  username TEXT,
  name TEXT,
  district_name TEXT,
  district_id UUID,
  usage_frequency TEXT,
  total_logins INTEGER,
  average_sessions_per_week NUMERIC,
  total_active_days INTEGER,
  days_since_last_login INTEGER,
  last_login TIMESTAMPTZ,
  assessments_created INTEGER,
  lessons_generated INTEGER,
  students_managed INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_stats AS (
    SELECT 
      t.username,
      t.name,
      t.district_id,
      sd.name as district_name,
      t.last_login,
      t.login_count as total_logins,
      
      -- Calculate days since last login
      CASE 
        WHEN t.last_login IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM NOW() - t.last_login)::INTEGER
      END as days_since_last_login,
      
      -- Count assessments created
      COALESCE(qt_count.assessment_count, 0) as assessments_created,
      
      -- Count lessons generated
      COALESCE(lp_count.lesson_count, 0) as lessons_generated,
      
      -- Count students managed
      COALESCE(s_count.student_count, 0) as students_managed,
      
      -- Calculate total active days (days with any activity)
      COALESCE(
        (SELECT COUNT(DISTINCT DATE(created_at)) 
         FROM quiz_templates 
         WHERE teacher_username = t.username), 0
      ) + 
      COALESCE(
        (SELECT COUNT(DISTINCT DATE(created_at)) 
         FROM lesson_plans 
         WHERE teacher_username = t.username), 0
      ) + 
      COALESCE(
        (SELECT COUNT(DISTINCT DATE(completed_at)) 
         FROM quiz_attempts 
         WHERE teacher_username = t.username), 0
      ) as total_active_days,
      
      -- Calculate average sessions per week (approximate)
      CASE 
        WHEN t.last_login IS NULL OR t.login_count = 0 THEN 0
        WHEN EXTRACT(DAY FROM NOW() - t.created_at) < 7 THEN t.login_count::NUMERIC
        ELSE (t.login_count::NUMERIC * 7.0) / GREATEST(EXTRACT(DAY FROM NOW() - t.created_at), 1)
      END as average_sessions_per_week
      
    FROM teachers t
    LEFT JOIN school_districts sd ON t.district_id = sd.id
    LEFT JOIN (
      SELECT teacher_username, COUNT(*) as assessment_count
      FROM quiz_templates
      GROUP BY teacher_username
    ) qt_count ON t.username = qt_count.teacher_username
    LEFT JOIN (
      SELECT teacher_username, COUNT(*) as lesson_count
      FROM lesson_plans
      GROUP BY teacher_username
    ) lp_count ON t.username = lp_count.teacher_username
    LEFT JOIN (
      SELECT teacher_username, COUNT(DISTINCT id) as student_count
      FROM students
      GROUP BY teacher_username
    ) s_count ON t.username = s_count.teacher_username
    WHERE 
      (p_district_id IS NULL OR t.district_id = p_district_id)
      AND t.account_status = 'active'
  )
  SELECT 
    ts.username,
    ts.name,
    ts.district_name,
    ts.district_id,
    
    -- Calculate usage frequency
    CASE 
      WHEN ts.days_since_last_login IS NULL THEN 'Never Logged In'
      WHEN ts.days_since_last_login <= 7 AND ts.average_sessions_per_week >= 2 THEN 'Very Active'
      WHEN ts.days_since_last_login <= 14 AND ts.average_sessions_per_week >= 1 THEN 'Active'
      WHEN ts.days_since_last_login <= 30 AND ts.total_logins >= 5 THEN 'Moderate'
      WHEN ts.days_since_last_login <= 60 THEN 'Low Activity'
      ELSE 'Inactive'
    END as usage_frequency,
    
    ts.total_logins,
    ROUND(ts.average_sessions_per_week, 1) as average_sessions_per_week,
    ts.total_active_days,
    ts.days_since_last_login,
    ts.last_login,
    ts.assessments_created,
    ts.lessons_generated,
    ts.students_managed
    
  FROM teacher_stats ts
  ORDER BY ts.name;
END;
$$;