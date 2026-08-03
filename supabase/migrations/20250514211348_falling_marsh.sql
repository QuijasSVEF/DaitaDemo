/*
  # Fix Student Grouping and Add Lesson Plan Regeneration
  
  1. Changes
    - Improve student grouping to only match students with identical focus areas
    - Add function to regenerate lesson plans
    - Fix group creation logic to ensure proper grouping
    
  2. Features
    - Exact focus area matching for student groups
    - Lesson plan regeneration capability
    - Improved group size management
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS group_students_by_focus_areas(text, date);

-- Function to group students by IDENTICAL focus areas
CREATE OR REPLACE FUNCTION group_students_by_focus_areas(
  p_teacher_username TEXT,
  p_week_start_date DATE DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_groups jsonb[];
  v_result jsonb;
BEGIN
  -- Set week dates
  IF p_week_start_date IS NULL THEN
    v_week_start := date_trunc('week', current_date)::date;
  ELSE
    v_week_start := p_week_start_date;
  END IF;
  v_week_end := v_week_start + interval '6 days';
  
  -- Get student data with their struggle areas and group by EXACT focus areas
  WITH student_struggles AS (
    SELECT 
      s.id,
      s.grade_level,
      -- Use array_sort to ensure consistent ordering for comparison
      array_sort(array_agg(DISTINCT unnest(et.struggled_areas))) AS focus_areas
    FROM students s
    JOIN exit_tickets et ON et.student_id = s.id
    WHERE s.teacher_username = p_teacher_username
    AND et.created_at BETWEEN v_week_start AND v_week_end
    GROUP BY s.id, s.grade_level
  ),
  -- Group students by IDENTICAL focus areas (exact matches only)
  focus_area_groups AS (
    SELECT
      focus_areas,
      array_agg(id) AS student_ids,
      array_agg(grade_level) AS grade_levels
    FROM student_struggles
    GROUP BY focus_areas
  )
  -- Process each group
  SELECT 
    array_agg(
      jsonb_build_object(
        'focus_areas', focus_areas,
        'students', (SELECT jsonb_agg(id) FROM unnest(student_ids) AS id),
        'recommended_approach', CASE
          WHEN array_length(student_ids, 1) = 1 THEN 'Individual instruction focused on specific needs'
          WHEN array_length(student_ids, 1) = 2 THEN 'Pair programming and peer teaching'
          ELSE 'Collaborative learning with shared focus areas'
        END
      )
    )
  INTO v_groups
  FROM focus_area_groups;
  
  -- Process groups to ensure optimal size (3-4 students)
  DECLARE
    v_processed_groups jsonb[] := '{}'::jsonb[];
  BEGIN
    -- If we have groups to process
    IF v_groups IS NOT NULL THEN
      FOR i IN 1..array_length(v_groups, 1) LOOP
        DECLARE
          v_current_group jsonb := v_groups[i];
          v_students jsonb := v_current_group->'students';
          v_focus_areas jsonb := v_current_group->'focus_areas';
          v_student_count integer := jsonb_array_length(v_students);
        BEGIN
          -- If group is already optimal size or smaller, add it as is
          IF v_student_count <= 4 THEN
            v_processed_groups := array_append(v_processed_groups, v_current_group);
          -- If group is too large, split it into smaller groups
          ELSE
            -- Calculate how many groups we need
            DECLARE
              v_num_groups integer := CEILING(v_student_count::float / 4);
              v_students_per_group integer := CEILING(v_student_count::float / v_num_groups);
            BEGIN
              -- Create the groups
              FOR j IN 0..(v_num_groups-1) LOOP
                DECLARE
                  v_start_idx integer := j * v_students_per_group;
                  v_end_idx integer := LEAST((j+1) * v_students_per_group - 1, v_student_count - 1);
                  v_group_students jsonb := '[]'::jsonb;
                BEGIN
                  -- Add students to this group
                  FOR k IN v_start_idx..v_end_idx LOOP
                    v_group_students := v_group_students || jsonb_build_array(v_students->k);
                  END LOOP;
                  
                  -- Add the group
                  v_processed_groups := array_append(v_processed_groups, jsonb_build_object(
                    'focus_areas', v_focus_areas,
                    'students', v_group_students,
                    'recommended_approach', 'Collaborative learning with shared focus areas'
                  ));
                END;
              END LOOP;
            END;
          END IF;
        END;
      END LOOP;
    END IF;
  END;
  
  -- Build final result
  v_result := jsonb_build_object(
    'groups', to_jsonb(COALESCE(v_processed_groups, '{}'::jsonb[])),
    'week_start', v_week_start,
    'week_end', v_week_end
  );
  
  RETURN v_result;
END;
$$;

-- Function to regenerate a lesson plan
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

-- Function to regenerate a group lesson plan
CREATE OR REPLACE FUNCTION regenerate_group_lesson_plan(
  p_group_lesson_plan_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
  v_teacher_username TEXT;
  v_focus_areas TEXT[];
  v_student_ids INTEGER[];
  v_lesson_plan jsonb;
BEGIN
  -- Get group lesson plan details
  SELECT 
    glp.group_id,
    glp.teacher_username,
    glp.focus_areas,
    glp.student_ids
  INTO
    v_group_id,
    v_teacher_username,
    v_focus_areas,
    v_student_ids
  FROM group_lesson_plans glp
  WHERE glp.id = p_group_lesson_plan_id;
  
  -- If no group lesson plan found, return error
  IF v_group_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Group lesson plan not found'
    );
  END IF;
  
  -- Generate a new lesson plan with different activities
  SELECT generate_group_lesson_plan(
    v_teacher_username,
    v_focus_areas,
    v_student_ids
  ) INTO v_lesson_plan;
  
  -- Update the group lesson plan
  UPDATE group_lesson_plans
  SET
    lesson_plan = v_lesson_plan,
    updated_at = now()
  WHERE id = p_group_lesson_plan_id;
  
  -- Log the regeneration
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'regenerate_group_lesson_plan',
    'group_lesson_plan',
    p_group_lesson_plan_id::text,
    jsonb_build_object(
      'timestamp', now(),
      'group_id', v_group_id,
      'teacher_username', v_teacher_username,
      'focus_areas', v_focus_areas,
      'student_count', array_length(v_student_ids, 1)
    ),
    inet_client_addr()
  );
  
  -- Return the new lesson plan
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Group lesson plan regenerated successfully',
    'lesson_plan', v_lesson_plan
  );
END;
$$;

-- Function to validate student and create if needed
CREATE OR REPLACE FUNCTION validate_student(
  p_student_id INTEGER,
  p_teacher_username TEXT,
  p_emoji_password TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_exists BOOLEAN;
  v_emoji_password TEXT;
BEGIN
  -- Check if student exists
  SELECT EXISTS (
    SELECT 1 
    FROM students 
    WHERE id = p_student_id AND teacher_username = p_teacher_username
  ) INTO v_student_exists;
  
  -- If student exists, check emoji password if provided
  IF v_student_exists AND p_emoji_password IS NOT NULL THEN
    SELECT emoji_password INTO v_emoji_password
    FROM students
    WHERE id = p_student_id AND teacher_username = p_teacher_username;
    
    -- If student has an emoji password, it must match
    IF v_emoji_password IS NOT NULL AND v_emoji_password != p_emoji_password THEN
      RETURN FALSE;
    END IF;
    
    -- If student doesn't have an emoji password, set it
    IF v_emoji_password IS NULL THEN
      UPDATE students
      SET emoji_password = p_emoji_password
      WHERE id = p_student_id AND teacher_username = p_teacher_username;
    END IF;
    
    RETURN TRUE;
  END IF;
  
  -- If student doesn't exist, create them
  IF NOT v_student_exists THEN
    INSERT INTO students (
      id,
      teacher_username,
      grade_level,
      subject,
      emoji_password
    ) VALUES (
      p_student_id,
      p_teacher_username,
      '6', -- Default grade level
      'Mathematics', -- Default subject
      p_emoji_password
    );
    RETURN TRUE;
  END IF;
  
  RETURN TRUE;
END;
$$;