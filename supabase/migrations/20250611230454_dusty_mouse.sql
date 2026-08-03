/*
  # Fix get_teacher_performance function overloading
  
  1. Changes
    - Drop existing overloaded functions
    - Create a single function with an optional district_id parameter
    - Ensure consistent return type
    
  2. Security
    - Maintain SECURITY DEFINER
    - Preserve existing functionality
*/

-- Drop existing functions to avoid overloading issues
DROP FUNCTION IF EXISTS get_teacher_performance();
DROP FUNCTION IF EXISTS get_teacher_performance(uuid);

-- Create a single function with an optional parameter
CREATE OR REPLACE FUNCTION get_teacher_performance(p_district_id uuid DEFAULT NULL)
RETURNS TABLE (
  username TEXT,
  name TEXT,
  total_students INTEGER,
  average_score NUMERIC,
  subjects TEXT[],
  student_improvement NUMERIC,
  district_id UUID,
  district_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_stats AS (
    SELECT 
      t.username,
      t.name,
      t.district_id,
      sd.name as district_name,
      COUNT(DISTINCT s.id) as student_count,
      COALESCE(AVG(et.score::NUMERIC / et.total_questions * 100), 0) as avg_score,
      array_agg(DISTINCT COALESCE(s.subject, 'Mathematics')) FILTER (WHERE s.subject IS NOT NULL) as subject_list,
      COALESCE(AVG(
        CASE 
          WHEN first_score.score IS NOT NULL AND last_score.score IS NOT NULL
          THEN (last_score.score::NUMERIC / last_score.total_questions * 100) - 
               (first_score.score::NUMERIC / first_score.total_questions * 100)
          ELSE 0
        END
      ), 0) as improvement
    FROM teachers t
    LEFT JOIN school_districts sd ON sd.id = t.district_id
    LEFT JOIN students s ON s.teacher_username = t.username
    LEFT JOIN exit_tickets et ON et.student_id = s.id AND et.teacher_username = t.username
    LEFT JOIN LATERAL (
      SELECT score, total_questions
      FROM exit_tickets
      WHERE student_id = s.id AND teacher_username = t.username
      ORDER BY created_at ASC
      LIMIT 1
    ) first_score ON true
    LEFT JOIN LATERAL (
      SELECT score, total_questions
      FROM exit_tickets
      WHERE student_id = s.id AND teacher_username = t.username
      ORDER BY created_at DESC
      LIMIT 1
    ) last_score ON true
    WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    GROUP BY t.username, t.name, t.district_id, sd.name
  )
  SELECT 
    ts.username,
    ts.name,
    ts.student_count,
    ts.avg_score,
    COALESCE(ts.subject_list, ARRAY['Mathematics']),
    ts.improvement,
    ts.district_id,
    ts.district_name
  FROM teacher_stats ts
  ORDER BY ts.name;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_teacher_performance(uuid) TO public;

-- Add comment
COMMENT ON FUNCTION get_teacher_performance(uuid) IS 'Returns teacher performance metrics with optional district filtering';