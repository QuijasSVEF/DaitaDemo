-- Function to generate a lesson plan using OpenAI
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
  v_struggle_area TEXT;
BEGIN
  -- Get the primary struggle area
  SELECT COALESCE(p_struggled_areas[1], 'mathematical concepts') INTO v_struggle_area;

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
    'Interactive exploration using manipulatives to visualize ' || v_struggle_area,
    'Guided discovery with real-world examples of ' || v_struggle_area,
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
    'Exit ticket completion with personalized application problem',
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
            'Manipulatives related to ' || v_struggle_area,
            'Visual aids and concept cards',
            'Discovery worksheets',
            'Digital tools or apps if available'
          ],
          'teacherScript', ARRAY[
            'Today we are exploring ' || v_struggle_area || ' in a new way.',
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
          'standardsAlignment', CASE 
            WHEN v_standard_id IS NOT NULL THEN
              jsonb_build_object(
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
            ELSE NULL
          END
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

-- Function to get lesson plan by exit ticket
CREATE OR REPLACE FUNCTION get_lesson_plan_by_exit_ticket(
  p_exit_ticket_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan jsonb;
BEGIN
  SELECT jsonb_build_object(
    'objective', lp.objective,
    'engagement', lp.engagement,
    'representation', lp.representation,
    'action_expression', lp.action_expression,
    'wrapup', lp.wrapup,
    'duration', lp.duration,
    'aligned_standards', COALESCE(lp.aligned_standards, '[]'::jsonb),
    'dok_levels', COALESCE(lp.dok_levels, jsonb_build_object(
      'engagement', 1,
      'representation', 2,
      'action_expression', 3,
      'wrapup', 2
    )),
    'detailed_activities', COALESCE(lp.detailed_activities, '{}'::jsonb)
  ) INTO v_plan
  FROM lesson_plans lp
  WHERE lp.exit_ticket_id = p_exit_ticket_id;
  
  RETURN v_plan;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_lesson_plan_by_exit_ticket TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION get_lesson_plan_by_exit_ticket IS 'Retrieves a lesson plan for a specific exit ticket';

-- Function to regenerate a lesson plan
CREATE OR REPLACE FUNCTION regenerate_lesson_plan(
  p_lesson_plan_id UUID,
  p_exit_ticket_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id INTEGER;
  v_teacher_username TEXT;
  v_grade_level TEXT;
  v_struggled_areas TEXT[];
  v_last_lesson TEXT;
  v_exit_ticket_id UUID;
  v_new_plan jsonb;
BEGIN
  -- Get lesson plan details
  SELECT 
    lp.student_id,
    lp.teacher_username,
    s.grade_level,
    et.struggled_areas,
    et.last_lesson,
    COALESCE(p_exit_ticket_id, lp.exit_ticket_id)
  INTO
    v_student_id,
    v_teacher_username,
    v_grade_level,
    v_struggled_areas,
    v_last_lesson,
    v_exit_ticket_id
  FROM lesson_plans lp
  JOIN students s ON s.id = lp.student_id AND s.teacher_username = lp.teacher_username
  JOIN exit_tickets et ON et.id = COALESCE(p_exit_ticket_id, lp.exit_ticket_id);
  
  -- If no lesson plan found, return error
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Lesson plan not found'
    );
  END IF;
  
  -- Generate new lesson plan
  v_new_plan := generate_ai_lesson_plan(
    v_grade_level,
    v_last_lesson,
    v_struggled_areas,
    v_teacher_username,
    v_student_id,
    v_exit_ticket_id
  );
  
  -- Update the lesson plan
  UPDATE lesson_plans
  SET
    objective = v_new_plan->>'objective',
    engagement = (v_new_plan->'engagement')::text[],
    representation = (v_new_plan->'representation')::text[],
    action_expression = (v_new_plan->'action_expression')::text[],
    wrapup = (v_new_plan->'wrapup')::text[],
    dok_levels = v_new_plan->'dok_levels',
    aligned_standards = v_new_plan->'aligned_standards',
    detailed_activities = v_new_plan->'detailedActivities',
    updated_at = now()
  WHERE id = p_lesson_plan_id;
  
  -- Return success with the new plan
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lesson plan regenerated successfully',
    'lesson_plan', v_new_plan
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION regenerate_lesson_plan TO authenticated, anon;

-- Add comment
COMMENT ON FUNCTION regenerate_lesson_plan IS 'Regenerates a lesson plan with new activities while maintaining the same focus areas';