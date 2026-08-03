/*
  # Teacher Usage Analytics Function

  1. New Function
    - `get_teacher_usage_analytics` - Returns comprehensive teacher usage statistics
    - Tracks logins, assessments created, lessons generated, and students managed
    - Includes district information for filtering

  2. Analytics Provided
    - Total login count per teacher
    - Last login timestamp
    - Number of assessments created
    - Number of lessons generated
    - Number of students managed
    - District association
*/

CREATE OR REPLACE FUNCTION get_teacher_usage_analytics(p_district_id UUID DEFAULT NULL)
RETURNS TABLE (
  username TEXT,
  name TEXT,
  district_name TEXT,
  total_logins INTEGER,
  last_login TIMESTAMPTZ,
  assessments_created INTEGER,
  lessons_generated INTEGER,
  students_managed INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.username,
    t.name,
    COALESCE(sd.name, 'No District') as district_name,
    COALESCE(t.login_count, 0) as total_logins,
    t.last_login,
    COALESCE(quiz_count.count, 0)::INTEGER as assessments_created,
    COALESCE(lesson_count.count, 0)::INTEGER as lessons_generated,
    COALESCE(student_count.count, 0)::INTEGER as students_managed
  FROM teachers t
  LEFT JOIN school_districts sd ON t.district_id = sd.id
  LEFT JOIN (
    SELECT 
      teacher_username,
      COUNT(*) as count
    FROM quiz_templates
    GROUP BY teacher_username
  ) quiz_count ON t.username = quiz_count.teacher_username
  LEFT JOIN (
    SELECT 
      teacher_username,
      COUNT(*) as count
    FROM lesson_plans
    GROUP BY teacher_username
  ) lesson_count ON t.username = lesson_count.teacher_username
  LEFT JOIN (
    SELECT 
      teacher_username,
      COUNT(DISTINCT id) as count
    FROM students
    GROUP BY teacher_username
  ) student_count ON t.username = student_count.teacher_username
  WHERE 
    (p_district_id IS NULL OR t.district_id = p_district_id)
    AND t.account_status = 'active'
  ORDER BY 
    COALESCE(t.login_count, 0) DESC,
    COALESCE(lesson_count.count, 0) DESC,
    COALESCE(quiz_count.count, 0) DESC;
END;
$$;