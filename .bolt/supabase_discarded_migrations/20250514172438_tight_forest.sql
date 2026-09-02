-- Add timestamp columns to quiz_attempts table
ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS completion_time TIMESTAMPTZ DEFAULT now();

-- Add duration column (in seconds)
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS duration INTEGER;

-- Create function to calculate duration
CREATE OR REPLACE FUNCTION calculate_assessment_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculate duration in seconds
  NEW.duration := EXTRACT(EPOCH FROM (NEW.completion_time - NEW.start_time))::INTEGER;
  RETURN NEW;
END;
$$;

-- Create trigger to calculate duration on update/insert
CREATE TRIGGER set_assessment_duration
BEFORE INSERT OR UPDATE OF completion_time
ON quiz_attempts
FOR EACH ROW
EXECUTE FUNCTION calculate_assessment_duration();

-- Create index for faster queries on timestamps
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_timestamps
ON quiz_attempts(student_id, start_time, completion_time);

-- Function to get student duration analysis
CREATE OR REPLACE FUNCTION get_student_duration_analysis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH duration_stats AS (
    SELECT
      student_id,
      AVG(duration)::integer as avg_duration,
      MIN(duration)::integer as min_duration,
      MAX(duration)::integer as max_duration,
      COUNT(*) as attempt_count
    FROM quiz_attempts
    WHERE duration IS NOT NULL
    GROUP BY student_id
  ),
  overall_avg AS (
    SELECT AVG(duration)::integer as avg_duration
    FROM quiz_attempts
    WHERE duration IS NOT NULL
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
    WHERE qa.duration IS NOT NULL
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
    WHERE 
      qa.duration IS NOT NULL AND
      (
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