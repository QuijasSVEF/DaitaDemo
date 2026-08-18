/*
  # Add generate_lesson_plan function
  
  1. New Function
    - generate_lesson_plan: Creates a personalized lesson plan based on student needs
    
  2. Features
    - Takes student ID, grade level, and struggle areas as input
    - Finds relevant standards for the struggle areas
    - Generates appropriate activities for each section
    - Returns a complete lesson plan with DOK levels
*/

-- Create function to generate lesson plans
CREATE OR REPLACE FUNCTION generate_lesson_plan(
  p_grade_level TEXT,
  p_last_lesson TEXT,
  p_struggled_areas TEXT[],
  p_student_id INTEGER,
  p_exit_ticket_id UUID DEFAULT NULL
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