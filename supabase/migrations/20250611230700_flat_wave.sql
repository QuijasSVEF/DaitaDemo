/*
  # Fix Student Duration Analysis Function
  
  1. Changes
    - Drop existing overloaded functions
    - Create a single function with an optional district_id parameter
    - Fix return type issues
    
  2. Security
    - Maintain SECURITY DEFINER
    - Preserve existing permissions
*/

-- Drop existing functions to avoid overloading issues
DROP FUNCTION IF EXISTS get_student_duration_analysis();
DROP FUNCTION IF EXISTS get_student_duration_analysis(uuid);

-- Create a single function with an optional parameter
CREATE OR REPLACE FUNCTION get_student_duration_analysis(p_district_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH duration_stats AS (
    SELECT
      qa.student_id,
      AVG(qa.duration)::integer as avg_duration,
      MIN(qa.duration)::integer as min_duration,
      MAX(qa.duration)::integer as max_duration,
      COUNT(*) as attempt_count
    FROM quiz_attempts qa
    JOIN teachers t ON t.username = qa.teacher_username
    WHERE qa.duration IS NOT NULL
    AND (p_district_id IS NULL OR t.district_id = p_district_id)
    GROUP BY qa.student_id
  ),
  overall_avg AS (
    SELECT AVG(duration)::integer as avg_duration
    FROM quiz_attempts qa
    JOIN teachers t ON t.username = qa.teacher_username
    WHERE qa.duration IS NOT NULL
    AND (p_district_id IS NULL OR t.district_id = p_district_id)
  ),
  student_attempts AS (
    SELECT
      qa.student_id,
      jsonb_agg(
        jsonb_build_object(
          'score', qa.score,
          'total_questions', qa.total_questions,
          'duration', qa.duration,
          'start_time', to_char(qa.start_time, 'YYYY-MM-DD HH24:MI:SS'),
          'completion_time', to_char(qa.completion_time, 'YYYY-MM-DD HH24:MI:SS')
        ) ORDER BY qa.completion_time DESC
      ) as attempts
    FROM quiz_attempts qa
    JOIN teachers t ON t.username = qa.teacher_username
    WHERE qa.duration IS NOT NULL
    AND (p_district_id IS NULL OR t.district_id = p_district_id)
    GROUP BY qa.student_id
  ),
  outliers AS (
    SELECT
      qa.student_id,
      qa.score,
      qa.total_questions,
      qa.duration,
      to_char(qa.start_time, 'YYYY-MM-DD HH24:MI:SS') as start_time,
      to_char(qa.completion_time, 'YYYY-MM-DD HH24:MI:SS') as completion_time,
      CASE
        WHEN qa.duration > (SELECT avg_duration * 2 FROM overall_avg) THEN 'long'
        WHEN qa.duration < (SELECT avg_duration / 2 FROM overall_avg) THEN 'short'
      END as type
    FROM quiz_attempts qa
    JOIN teachers t ON t.username = qa.teacher_username
    WHERE 
      qa.duration IS NOT NULL
      AND (p_district_id IS NULL OR t.district_id = p_district_id)
      AND (
        qa.duration > (SELECT avg_duration * 2 FROM overall_avg) OR
        qa.duration < (SELECT avg_duration / 2 FROM overall_avg)
      )
    ORDER BY 
      CASE WHEN qa.duration > (SELECT avg_duration * 2 FROM overall_avg) THEN qa.duration END DESC,
      CASE WHEN qa.duration < (SELECT avg_duration / 2 FROM overall_avg) THEN qa.duration END ASC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'average_duration', to_char((SELECT avg_duration FROM overall_avg) * interval '1 second', 'HH24:MI:SS'),
    'student_breakdown', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'student_id', ds.student_id,
          'average_duration', to_char(ds.avg_duration * interval '1 second', 'HH24:MI:SS'),
          'min_duration', to_char(ds.min_duration * interval '1 second', 'HH24:MI:SS'),
          'max_duration', to_char(ds.max_duration * interval '1 second', 'HH24:MI:SS'),
          'attempt_count', ds.attempt_count,
          'attempts', COALESCE(sa.attempts, '[]'::jsonb)
        )
      )
      FROM duration_stats ds
      LEFT JOIN student_attempts sa ON ds.student_id = sa.student_id
    ),
    'outliers', (
      SELECT jsonb_agg(o.*)
      FROM outliers o
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_student_duration_analysis(uuid) TO public;

-- Add comment
COMMENT ON FUNCTION get_student_duration_analysis(uuid) IS 'Returns student assessment duration analysis with optional district filtering';