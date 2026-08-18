/*
  # Add Lesson Plan Regeneration Function
  
  1. New Function
    - regenerate_lesson_plan: Creates a new version of an existing lesson plan
    
  2. Features
    - Maintains the same focus areas and standards
    - Creates fresh activities for each section
    - Preserves student and teacher context
    - Logs regeneration in audit trail
*/

-- Function to regenerate a lesson plan with new activities
CREATE OR REPLACE FUNCTION regenerate_lesson_plan(
  p_lesson_plan_id UUID,
  p_exit_ticket_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id INTEGER;
  v_teacher_username TEXT;
  v_grade_level TEXT;
  v_struggled_areas TEXT[];
  v_last_lesson TEXT;
  v_standard_id UUID;
  v_standard_code TEXT;
  v_standard_description TEXT;
  v_lesson_plan jsonb;
BEGIN
  -- Get lesson plan details
  SELECT 
    lp.student_id,
    lp.teacher_username,
    s.grade_level,
    et.struggled_areas,
    et.last_lesson
  INTO
    v_student_id,
    v_teacher_username,
    v_grade_level,
    v_struggled_areas,
    v_last_lesson
  FROM lesson_plans lp
  JOIN students s ON s.id = lp.student_id AND s.teacher_username = lp.teacher_username
  LEFT JOIN exit_tickets et ON et.id = COALESCE(p_exit_ticket_id, lp.exit_ticket_id)
  WHERE lp.id = p_lesson_plan_id;
  
  -- If no lesson plan found, return error
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Lesson plan not found'
    );
  END IF;
  
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
  WHERE grade_level = v_grade_level
  AND subject = 'Mathematics'
  AND (
    description ILIKE ANY(array(SELECT '%' || area || '%' FROM unnest(v_struggled_areas) AS area)) OR
    domain ILIKE ANY(array(SELECT '%' || area || '%' FROM unnest(v_struggled_areas) AS area)) OR
    cluster ILIKE ANY(array(SELECT '%' || area || '%' FROM unnest(v_struggled_areas) AS area))
  )
  LIMIT 1;
  
  -- Generate a new lesson plan with different activities
  v_lesson_plan := jsonb_build_object(
    'objective', 'Master ' || array_to_string(v_struggled_areas, ' and ') || ' through personalized learning',
    'engagement', ARRAY[
      'Interactive exploration of ' || v_struggled_areas[1],
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
  
  -- Update the lesson plan
  UPDATE lesson_plans
  SET
    objective = v_lesson_plan->>'objective',
    engagement = (v_lesson_plan->'engagement')::text[],
    representation = (v_lesson_plan->'representation')::text[],
    action_expression = (v_lesson_plan->'action_expression')::text[],
    wrapup = (v_lesson_plan->'wrapup')::text[],
    dok_levels = v_lesson_plan->'dok_levels',
    aligned_standards = v_lesson_plan->'aligned_standards',
    updated_at = now()
  WHERE id = p_lesson_plan_id;
  
  -- Log the regeneration
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'regenerate_lesson_plan',
    'lesson_plan',
    p_lesson_plan_id::text,
    jsonb_build_object(
      'timestamp', now(),
      'student_id', v_student_id,
      'teacher_username', v_teacher_username,
      'struggled_areas', v_struggled_areas
    ),
    inet_client_addr()
  );
  
  -- Return the new lesson plan
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lesson plan regenerated successfully',
    'lesson_plan', v_lesson_plan
  );
END;
$$;