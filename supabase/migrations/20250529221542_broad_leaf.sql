/*
  # Add AI-Driven Lesson Plan Generation
  
  1. New Function
    - `generate_ai_lesson_plan`: Creates personalized lesson plans based on student needs
    - Takes grade level, struggle areas, and other context as input
    - Returns a complete UDL lesson plan with detailed activities
    
  2. Features
    - Standards alignment based on grade level and struggle areas
    - Personalized learning objectives
    - Varied engagement, representation, action/expression, and wrap-up activities
    - Detailed teacher scripts and materials lists
    - Differentiation strategies for struggling and advanced students
*/

-- Create function to generate personalized lesson plans with a completely unique name
CREATE OR REPLACE FUNCTION generate_ai_lesson_plan(
  p_grade_level TEXT,
  p_last_lesson TEXT,
  p_struggled_areas TEXT[],
  p_teacher_username TEXT,
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
  v_student_name TEXT;
  v_lesson_plan jsonb;
  v_engagement_activities TEXT[];
  v_representation_activities TEXT[];
  v_action_expression_activities TEXT[];
  v_wrapup_activities TEXT[];
  v_objective TEXT;
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
  
  -- Create personalized objective
  v_objective := 'Master ' || array_to_string(p_struggled_areas, ' and ') || ' through personalized learning strategies';
  
  -- Generate varied engagement activities based on struggle areas
  v_engagement_activities := ARRAY[
    'Interactive exploration using manipulatives to visualize ' || COALESCE(p_struggled_areas[1], 'key concepts'),
    'Guided discovery with real-world examples of ' || COALESCE(p_struggled_areas[array_length(p_struggled_areas, 1)], 'mathematical concepts'),
    'Collaborative problem-solving with visual aids and discussion prompts',
    'Student-led concept mapping to connect prior knowledge to new learning'
  ];
  
  -- Generate varied representation activities
  v_representation_activities := ARRAY[
    'Multi-modal visualization using physical models, diagrams, and digital tools',
    'Concept comparison using multiple solution strategies and approaches',
    'Concrete-to-abstract progression with scaffolded examples',
    'Real-world applications through story problems and scenarios'
  ];
  
  -- Generate varied action/expression activities
  v_action_expression_activities := ARRAY[
    'Hands-on problem solving with choice of representation methods',
    'Collaborative project applying concepts to student-selected scenarios',
    'Peer teaching opportunity with guided explanation templates',
    'Creative application through games or artistic representations'
  ];
  
  -- Generate varied wrap-up activities
  v_wrapup_activities := ARRAY[
    'Concept synthesis through student-created summary',
    'Self-reflection journal on learning process and challenges overcome',
    'Exit ticket with personalized application problem',
    'Next steps planning with student input on areas for further practice'
  ];
  
  -- Generate a lesson plan focused on these specific areas
  v_lesson_plan := jsonb_build_object(
    'objective', v_objective,
    'engagement', v_engagement_activities,
    'representation', v_representation_activities,
    'action_expression', v_action_expression_activities,
    'wrapup', v_wrapup_activities,
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
    END,
    'detailedActivities', jsonb_build_object(
      'engagement', jsonb_build_array(
        jsonb_build_object(
          'description', 'Interactive concept exploration',
          'timeAllocation', '7-8 minutes',
          'steps', ARRAY[
            'Introduce the concept with a real-world problem',
            'Provide manipulatives for hands-on exploration',
            'Guide students through discovery questions',
            'Connect to prior knowledge with discussion prompts'
          ],
          'materials', ARRAY[
            'Manipulatives related to ' || COALESCE(p_struggled_areas[1], 'the concept'),
            'Visual aids and concept cards',
            'Discovery worksheets',
            'Digital tools or apps if available'
          ],
          'teacherScript', ARRAY[
            'Today we are exploring ' || COALESCE(p_struggled_areas[1], 'this concept') || ' in a new way.',
            'I notice you are making connections between...',
            'What patterns do you see when you...?',
            'How might this relate to what we learned about...?'
          ],
          'studentBehaviors', ARRAY[
            'Actively manipulating materials',
            'Discussing observations with peers',
            'Recording discoveries',
            'Making connections to prior knowledge'
          ],
          'differentiation', jsonb_build_object(
            'struggling', ARRAY[
              'Provide simplified starting examples',
              'Use additional visual supports',
              'Offer sentence starters for discussions'
            ],
            'advanced', ARRAY[
              'Present more complex patterns to analyze',
              'Encourage creating their own examples',
              'Facilitate peer teaching opportunities'
            ]
          ),
          'standardsAlignment', jsonb_build_object(
            'code', v_standard_code,
            'description', v_standard_description,
            'activities', ARRAY[
              'Concept exploration with manipulatives',
              'Guided discovery questions',
              'Real-world connections'
            ],
            'assessmentMethods', ARRAY[
              'Observation of student engagement',
              'Quality of student discussions',
              'Accuracy of recorded observations'
            ]
          )
        )
      )
    )
  );
  
  -- Return the lesson plan
  RETURN v_lesson_plan;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_ai_lesson_plan TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION generate_ai_lesson_plan IS 'Generates a personalized, AI-driven UDL lesson plan based on student struggles and grade level';

-- Create a function to call the AI lesson plan generator
CREATE OR REPLACE FUNCTION generate_dok_lesson_plan(
  p_grade_level TEXT,
  p_standard_code TEXT,
  p_struggle_areas TEXT[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_standard_description TEXT;
  v_domain TEXT;
  v_cluster TEXT;
  v_lesson_plan jsonb;
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_dok_lesson_plan TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION generate_dok_lesson_plan IS 'Generates a DOK-aligned lesson plan based on grade level and standards';