/*
  # Add Analytics Functions
  
  1. New Functions
    - get_teacher_performance: Retrieves performance metrics for each teacher
    - get_subject_breakdown: Gets statistics for each subject
    - get_student_progress: Tracks student improvement over time
    
  2. Features
    - Teacher performance tracking
    - Subject-wise analysis
    - Student progress monitoring
    - Score improvement calculations
*/

-- Function to get teacher performance metrics
CREATE OR REPLACE FUNCTION get_teacher_performance()
RETURNS TABLE (
  username TEXT,
  name TEXT,
  total_students INTEGER,
  average_score NUMERIC,
  subjects TEXT[],
  student_improvement NUMERIC
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
    GROUP BY t.username, t.name
  )
  SELECT 
    username,
    name,
    student_count,
    COALESCE(avg_score, 0),
    subject_list,
    COALESCE(improvement, 0)
  FROM teacher_stats;
END;
$$;

-- Function to get subject breakdown
CREATE OR REPLACE FUNCTION get_subject_breakdown()
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
  LEFT JOIN exit_tickets et ON et.student_id = s.id
  GROUP BY s.subject
  ORDER BY total_students DESC;
END;
$$;

-- Function to get student progress
CREATE OR REPLACE FUNCTION get_student_progress()
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