/*
  # Fix Quiz Standards Retrieval
  
  1. New Function
    - `get_quiz_standards_for_attempt`: Retrieves standards for a quiz attempt with proper error handling
    
  2. Features
    - Handles missing data gracefully
    - Returns empty array instead of error when no data found
    - Properly joins quiz templates and questions
*/

-- Function to get standards for a quiz attempt
CREATE OR REPLACE FUNCTION get_quiz_standards_for_attempt(p_attempt_id UUID)
RETURNS TABLE (
  question_id TEXT,
  standard_code TEXT,
  description TEXT,
  match_confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH attempt_data AS (
    SELECT 
      qa.id,
      qa.answers,
      qt.grade_level,
      qt.questions
    FROM quiz_attempts qa
    JOIN quiz_templates qt ON qt.id = qa.template_id
    WHERE qa.id = p_attempt_id
  ),
  question_subtopics AS (
    SELECT 
      a.id AS attempt_id,
      q->>'id' AS question_id,
      q->>'subtopic' AS subtopic
    FROM attempt_data a,
    jsonb_array_elements(COALESCE(a.questions, '[]'::jsonb)) AS q
  ),
  standards_match AS (
    SELECT
      qs.question_id,
      s.standard_code,
      s.description,
      greatest(
        similarity(qs.subtopic, s.description),
        similarity(qs.subtopic, s.domain),
        similarity(qs.subtopic, s.cluster)
      ) AS match_confidence
    FROM question_subtopics qs
    JOIN ca_standards s ON s.grade_level = (
      SELECT grade_level FROM attempt_data LIMIT 1
    )
    WHERE s.subject = 'Mathematics'
  )
  SELECT 
    sm.question_id,
    sm.standard_code,
    sm.description,
    sm.match_confidence
  FROM standards_match sm
  WHERE sm.match_confidence > 0.3
  ORDER BY sm.match_confidence DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_quiz_standards_for_attempt(UUID) TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_quiz_standards_for_attempt IS 'Returns standards matching the questions in a quiz attempt';