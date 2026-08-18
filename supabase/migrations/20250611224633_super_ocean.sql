/*
  # Add district filtering to analytics functions
  
  1. Changes
    - Update all analytics functions to accept district_id parameter
    - Filter results by district when parameter is provided
    - Maintain existing functionality when no district is specified
    
  2. Security
    - Maintain SECURITY DEFINER for all functions
    - Ensure proper error handling
*/

-- Update get_system_analytics function to filter by district
CREATE OR REPLACE FUNCTION get_system_analytics(p_district_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_teachers', (
      SELECT COUNT(*) 
      FROM teachers
      WHERE (p_district_id IS NULL OR district_id = p_district_id)
    ),
    'total_students', (
      SELECT COUNT(*) 
      FROM students s
      JOIN teachers t ON t.username = s.teacher_username
      WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    ),
    'total_assessments', (
      SELECT COUNT(*) 
      FROM quiz_attempts qa
      JOIN teachers t ON t.username = qa.teacher_username
      WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    ),
    'total_lessons', (
      SELECT COUNT(*) 
      FROM lesson_plans lp
      JOIN teachers t ON t.username = lp.teacher_username
      WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    ),
    'active_teachers', (
      SELECT COUNT(*) 
      FROM teachers
      WHERE last_login >= NOW() - INTERVAL '30 days'
      AND (p_district_id IS NULL OR district_id = p_district_id)
    ),
    'locked_accounts', (
      SELECT COUNT(*) 
      FROM teachers
      WHERE account_locked = true
      AND (p_district_id IS NULL OR district_id = p_district_id)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Update get_assessment_history function to filter by district
CREATE OR REPLACE FUNCTION get_assessment_history(p_district_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH recent_assessments AS (
    SELECT 
      et.student_id,
      et.score,
      et.total_questions,
      et.last_lesson,
      et.created_at,
      t.district_id
    FROM exit_tickets et
    JOIN teachers t ON t.username = et.teacher_username
    WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    ORDER BY et.created_at DESC
    LIMIT 50
  )
  SELECT jsonb_build_object(
    'all_assessments', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'student_id', ra.student_id,
          'score', ra.score,
          'total_questions', ra.total_questions,
          'last_lesson', ra.last_lesson,
          'created_at', to_char(ra.created_at, 'YYYY-MM-DD HH24:MI:SS')
        )
      )
      FROM recent_assessments ra
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Update get_lesson_timeline function to filter by district
CREATE OR REPLACE FUNCTION get_lesson_timeline(p_district_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH recent_lessons AS (
    SELECT 
      lp.student_id,
      lp.objective,
      lp.created_at,
      lp.updated_at,
      t.district_id
    FROM lesson_plans lp
    JOIN teachers t ON t.username = lp.teacher_username
    WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    ORDER BY lp.created_at DESC
    LIMIT 50
  )
  SELECT jsonb_build_object(
    'lessons', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'student_id', rl.student_id,
          'objective', rl.objective,
          'created_at', to_char(rl.created_at, 'YYYY-MM-DD HH24:MI:SS'),
          'updated_at', to_char(rl.updated_at, 'YYYY-MM-DD HH24:MI:SS')
        )
      )
      FROM recent_lessons rl
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Update get_student_duration_analysis function to filter by district
CREATE OR REPLACE FUNCTION get_student_duration_analysis(p_district_id UUID DEFAULT NULL)
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

-- Update get_teacher_performance function to filter by district
CREATE OR REPLACE FUNCTION get_teacher_performance(p_district_id UUID DEFAULT NULL)
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
      AVG(et.score::NUMERIC / et.total_questions * 100) as avg_score,
      array_agg(DISTINCT s.subject) as subject_list,
      AVG(
        CASE 
          WHEN first_score.score IS NOT NULL AND last_score.score IS NOT NULL
          THEN (last_score.score::NUMERIC / last_score.total_questions * 100) - 
               (first_score.score::NUMERIC / first_score.total_questions * 100)
          ELSE 0
        END
      ) as improvement
    FROM teachers t
    LEFT JOIN school_districts sd ON sd.id = t.district_id
    LEFT JOIN students s ON s.teacher_username = t.username
    LEFT JOIN exit_tickets et ON et.student_id = s.id
    LEFT JOIN LATERAL (
      SELECT score, total_questions
      FROM exit_tickets
      WHERE student_id = s.id
      ORDER BY created_at ASC
      LIMIT 1
    ) first_score ON true
    LEFT JOIN LATERAL (
      SELECT score, total_questions
      FROM exit_tickets
      WHERE student_id = s.id
      ORDER BY created_at DESC
      LIMIT 1
    ) last_score ON true
    WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    GROUP BY t.username, t.name, t.district_id, sd.name
  )
  SELECT 
    username,
    name,
    student_count,
    COALESCE(avg_score, 0),
    subject_list,
    COALESCE(improvement, 0),
    district_id,
    district_name
  FROM teacher_stats;
END;
$$;

-- Update get_subject_breakdown function to filter by district
CREATE OR REPLACE FUNCTION get_subject_breakdown(p_district_id UUID DEFAULT NULL)
RETURNS TABLE (
  subject TEXT,
  student_count INTEGER,
  average_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.subject,
    COUNT(DISTINCT s.id) as total_students,
    COALESCE(AVG(et.score::NUMERIC / et.total_questions * 100), 0) as avg_score
  FROM students s
  JOIN teachers t ON t.username = s.teacher_username
  LEFT JOIN exit_tickets et ON et.student_id = s.id
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
  GROUP BY s.subject
  ORDER BY total_students DESC;
END;
$$;

-- Update get_student_progress function to filter by district
CREATE OR REPLACE FUNCTION get_student_progress(p_district_id UUID DEFAULT NULL)
RETURNS TABLE (
  student_id INTEGER,
  teacher TEXT,
  subject TEXT,
  initial_score NUMERIC,
  current_score NUMERIC,
  improvement NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH student_scores AS (
    SELECT 
      s.id,
      t.name as teacher_name,
      s.subject,
      t.district_id,
      FIRST_VALUE(et.score::NUMERIC / et.total_questions * 100) OVER (
        PARTITION BY s.id 
        ORDER BY et.created_at ASC
      ) as first_score,
      FIRST_VALUE(et.score::NUMERIC / et.total_questions * 100) OVER (
        PARTITION BY s.id 
        ORDER BY et.created_at DESC
      ) as last_score
    FROM students s
    JOIN teachers t ON t.username = s.teacher_username
    JOIN exit_tickets et ON et.student_id = s.id
    WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
  )
  SELECT DISTINCT
    id,
    teacher_name,
    subject,
    first_score,
    last_score,
    last_score - first_score as score_improvement
  FROM student_scores
  WHERE first_score IS NOT NULL AND last_score IS NOT NULL
  ORDER BY score_improvement DESC;
END;
$$;