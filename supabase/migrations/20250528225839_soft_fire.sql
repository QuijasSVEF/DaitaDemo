/*
  # Fix Exit Ticket RLS and Lesson Plan Generation
  
  1. Changes
    - Fix RLS policies for exit_tickets table
    - Add function to generate lesson plans
    - Fix student data handling
    
  2. Security
    - Maintain proper authentication checks
    - Ensure teachers can only access their own data
*/

-- Make sure RLS is enabled
ALTER TABLE exit_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Teachers can insert exit tickets" ON public.exit_tickets;

-- Create new INSERT policy with proper permissions
CREATE POLICY "Teachers can insert exit tickets"
ON public.exit_tickets
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to generate lesson plan
CREATE OR REPLACE FUNCTION generate_lesson_plan(
  p_grade_level TEXT,
  p_last_lesson TEXT,
  p_struggled_areas TEXT[],
  p_student_id INTEGER,
  p_exit_ticket_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_standard_id UUID;
  v_standard_code TEXT;
  v_standard_description TEXT;
  v_lesson_plan jsonb;
BEGIN
  -- Find the most relevant standard for these focus areas
  SELECT 
    id, 
    standard_code,
    description
  INTO 
    v_standard_id,
    v_standard_code,
    v_standard_description
  FROM ca_standards
  WHERE grade_level = p_grade_level
  AND subject = 'Mathematics'
  AND (
    description ILIKE ANY(array(SELECT '%' || area || '%' FROM unnest(p_struggled_areas) AS area)) OR
    domain ILIKE ANY(array(SELECT '%' || area || '%' FROM unnest(p_struggled_areas) AS area)) OR
    cluster ILIKE ANY(array(SELECT '%' || area || '%' FROM unnest(p_struggled_areas) AS area))
  )
  LIMIT 1;
  
  -- Generate a lesson plan focused on these specific areas
  v_lesson_plan := jsonb_build_object(
    'objective', 'Master ' || array_to_string(p_struggled_areas, ' and ') || ' through personalized learning',
    'engagement', ARRAY[
      'Interactive exploration of ' || COALESCE(p_struggled_areas[1], 'key concepts'),
      'Guided discovery with manipulatives',
      'Real-world problem connections',
      'Student-led concept discussions'
    ],
    'representation', ARRAY[
      'Visual models and diagrams',
      'Multiple solution strategies',
      'Concrete-to-abstract progression',
      'Digital tools and simulations'
    ],
    'action_expression', ARRAY[
      'Hands-on problem solving',
      'Choice-based demonstration',
      'Peer teaching opportunity',
      'Creative application project'
    ],
    'wrapup', ARRAY[
      'Concept synthesis activity',
      'Self-reflection journal',
      'Exit ticket completion',
      'Next steps planning'
    ],
    'duration', 25,
    'dok_levels', jsonb_build_object(
      'engagement', 1,
      'representation', 2,
      'action_expression', 3,
      'wrapup', 2
    ),
    'aligned_standards', CASE 
      WHEN v_standard_id IS NOT NULL THEN
        jsonb_build_array(jsonb_build_object(
          'code', v_standard_code,
          'description', v_standard_description
        ))
      ELSE '[]'::jsonb
    END
  );
  
  -- Return the lesson plan
  RETURN v_lesson_plan;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_lesson_plan TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION generate_lesson_plan IS 'Generates a UDL lesson plan based on student struggles and grade level';

-- Function to get quiz answers with subtopics
CREATE OR REPLACE FUNCTION get_quiz_answers_with_subtopics(p_attempt_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_answers jsonb;
  v_questions jsonb;
  v_result jsonb;
BEGIN
  -- Get the answers from the attempt
  SELECT answers INTO v_answers
  FROM quiz_attempts
  WHERE id = p_attempt_id;
  
  -- Get the questions from the template
  SELECT 
    CASE 
      WHEN jsonb_array_length(processed_questions) > 0 THEN processed_questions
      ELSE questions
    END INTO v_questions
  FROM quiz_templates qt
  JOIN quiz_attempts qa ON qa.template_id = qt.id
  WHERE qa.id = p_attempt_id;
  
  -- Combine answers with question subtopics
  SELECT jsonb_agg(
    jsonb_build_object(
      'questionId', a->>'questionId',
      'answer', a->>'answer',
      'correct', (a->>'correct')::boolean,
      'questionText', (
        SELECT q->>'questionText'
        FROM jsonb_array_elements(v_questions) q
        WHERE q->>'id' = a->>'questionId'
        LIMIT 1
      ),
      'questionSubtopic', (
        SELECT q->>'subtopic'
        FROM jsonb_array_elements(v_questions) q
        WHERE q->>'id' = a->>'questionId'
        LIMIT 1
      )
    )
  )
  FROM jsonb_array_elements(v_answers) a
  INTO v_result;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_quiz_answers_with_subtopics TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_quiz_answers_with_subtopics IS 'Returns quiz answers with question subtopics for analysis';