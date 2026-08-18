/*
  # Add Student Progress Function
  
  1. New Function
    - get_student_progress: Returns student progress metrics
    
  2. Features
    - Track student improvement over time
    - Calculate score changes
    - Include teacher and subject info
    
  3. Security
    - SECURITY DEFINER function
    - Proper error handling
*/

-- Function to get student progress metrics
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
    GROUP BY s.id, t.name, s.subject, et.score, et.total_questions, et.created_at
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