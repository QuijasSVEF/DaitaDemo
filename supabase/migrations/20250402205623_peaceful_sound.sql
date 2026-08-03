/*
  # Fix Teacher Performance Function
  
  1. Changes
    - Fix ambiguous username column reference
    - Add table aliases to all column references
    - Improve query performance with proper joins
    
  2. Features
    - Clear column references
    - Efficient joins
    - Proper NULL handling
*/

-- Function to get teacher performance metrics with fixed column references
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
      t.username AS teacher_username,
      t.name AS teacher_name,
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
    LEFT JOIN exit_tickets et ON et.student_id = s.id AND et.teacher_username = t.username
    LEFT JOIN LATERAL (
      SELECT score, total_questions
      FROM exit_tickets e
      WHERE e.student_id = s.id 
      AND e.teacher_username = t.username
      ORDER BY e.created_at ASC
      LIMIT 1
    ) first_score ON true
    LEFT JOIN LATERAL (
      SELECT score, total_questions
      FROM exit_tickets e
      WHERE e.student_id = s.id
      AND e.teacher_username = t.username
      ORDER BY e.created_at DESC
      LIMIT 1
    ) last_score ON true
    GROUP BY t.username, t.name
  )
  SELECT 
    teacher_username,
    teacher_name,
    student_count,
    avg_score,
    subject_list,
    improvement
  FROM teacher_stats;
END;
$$;