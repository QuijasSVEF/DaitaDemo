/*
  # Fix Analytics Functions
  
  1. Changes
    - Fix ambiguous subject column reference in get_student_progress
    - Add get_subject_breakdown function
    
  2. Features
    - Proper table aliases
    - Clear column references
    - Efficient aggregation
*/

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

-- Function to get student progress with fixed column references
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
    SELECT DISTINCT ON (s.id)
      s.id,
      t.name as teacher_name,
      s.subject as student_subject,
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
  SELECT
    id,
    teacher_name,
    student_subject,
    first_score,
    last_score,
    last_score - first_score as score_improvement
  FROM student_scores
  WHERE first_score IS NOT NULL AND last_score IS NOT NULL
  ORDER BY score_improvement DESC;
END;
$$;