/*
  # Fix DOK Lesson Plan Function
  
  1. Changes
    - Drop existing function first
    - Recreate with correct parameters
    - Add proper DOK level calculation
    - Add standard alignment
    
  2. Features
    - Grade-appropriate DOK levels
    - Standard alignment
    - Detailed activity suggestions
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS generate_dok_lesson_plan(text, text, text[]);

-- Create function with proper parameters
CREATE FUNCTION generate_dok_lesson_plan(
  p_grade_level TEXT,
  p_standard_code TEXT,
  p_struggle_areas TEXT[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_standard_description TEXT;
  v_domain TEXT;
  v_cluster TEXT;
BEGIN
  -- Get standard details if provided
  IF p_standard_code IS NOT NULL THEN
    SELECT 
      description,
      domain,
      cluster
    INTO
      v_standard_description,
      v_domain,
      v_cluster
    FROM ca_standards
    WHERE standard_code = p_standard_code
    AND grade_level = p_grade_level;
  END IF;

  -- Generate appropriate DOK levels based on grade level
  RETURN jsonb_build_object(
    'objective', CASE 
      WHEN v_standard_description IS NOT NULL 
      THEN 'Master ' || v_standard_description
      ELSE 'Master ' || array_to_string(p_struggle_areas, ' and ')
    END,
    'engagement', ARRAY[
      'Interactive concept exploration',
      'Guided discovery activities',
      'Real-world connections',
      'Student-led discussions'
    ],
    'representation', ARRAY[
      'Visual models and diagrams',
      'Multiple solution strategies',
      'Concrete manipulatives',
      'Digital tools and simulations'
    ],
    'action_expression', ARRAY[
      'Hands-on problem solving',
      'Collaborative projects',
      'Student presentations',
      'Peer teaching opportunities'
    ],
    'wrapup', ARRAY[
      'Concept synthesis',
      'Self-reflection',
      'Exit ticket completion',
      'Next steps planning'
    ],
    'duration', 25,
    'aligned_standards', CASE 
      WHEN p_standard_code IS NOT NULL THEN
        jsonb_build_array(jsonb_build_object(
          'code', p_standard_code,
          'description', v_standard_description,
          'domain', v_domain,
          'cluster', v_cluster
        ))
      ELSE '[]'::jsonb
    END,
    'dok_levels', jsonb_build_object(
      'engagement', CASE 
        WHEN p_grade_level::int >= 6 THEN 2
        ELSE 1
      END,
      'representation', CASE 
        WHEN p_grade_level::int >= 7 THEN 3
        ELSE 2
      END,
      'action_expression', CASE 
        WHEN p_grade_level::int >= 8 THEN 4
        ELSE 3
      END,
      'wrapup', 2
    )
  );
END;
$$;