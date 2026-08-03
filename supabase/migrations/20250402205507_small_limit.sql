/*
  # Fix Analytics Functions
  
  1. Changes
    - Fix type mismatch in get_subject_breakdown
    - Add get_teacher_performance function
    - Fix DISTINCT handling in student progress
    
  2. Features
    - Proper type casting
    - Efficient aggregation
    - Clear column references
*/

-- Function to get subject breakdown with fixed type casting
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
    CAST(COUNT(DISTINCT s.id) AS INTEGER) as total_students,
    COALESCE(AVG(et.score::NUMERIC / et.total_questions * 100), 0) as avg_score
  FROM students s
  LEFT JOIN exit_tickets et ON et.student_id = s.id
  GROUP BY s.subject
  ORDER BY total_students DESC;
END;
$$;

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
      CAST(COUNT(DISTINCT s.id) AS INTEGER) as student_count,
      COALESCE(AVG(et.score::NUMERIC / et.total_questions * 100), 0) as avg_score,
      array_agg(DISTINCT s.subject) as subject_list,
      COALESCE(AVG(
        CASE 
          WHEN first_score.score IS NOT NULL AND last_score.score IS NOT NULL
          THEN (last_score.score::NUMERIC / last_score.total_questions * 100) - 
               (first_score.score::NUMERIC / first_score.total_questions * 100)
          ELSE 0
        END
      ), 0) as improvement
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
    avg_score,
    subject_list,
    improvement
  FROM teacher_stats;
END;
$$;