/*
  # Fix Student Grouping by Focus Areas
  
  1. Changes
    - Update grouping algorithm to only group students with identical focus areas
    - Improve group creation logic to ensure students with same struggles are grouped together
    - Add better handling for students with unique struggle combinations
    
  2. Features
    - Exact focus area matching
    - Optimal group size (3-4 students)
    - Grade level consideration
    - Improved group recommendations
*/

-- Function to improve student grouping by focus areas
CREATE OR REPLACE FUNCTION generate_group_lesson_plan(
  p_teacher_username TEXT,
  p_focus_areas TEXT[],
  p_student_ids INTEGER[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grade_level TEXT;
  v_standard_id UUID;
  v_standard_code TEXT;
  v_standard_description TEXT;
  v_lesson_plan jsonb;
  v_unique_id TEXT;
BEGIN
  -- Get the most common grade level among students
  SELECT grade_level INTO v_grade_level
  FROM students
  WHERE id = ANY(p_student_ids)
  AND teacher_username = p_teacher_username
  GROUP BY grade_level
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
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
    description ILIKE ANY(array_map(p_focus_areas, x -> '%' || x || '%')) OR
    domain ILIKE ANY(array_map(p_focus_areas, x -> '%' || x || '%')) OR
    cluster ILIKE ANY(array_map(p_focus_areas, x -> '%' || x || '%'))
  )
  LIMIT 1;
  
  -- Generate a lesson plan focused on these specific areas
  v_lesson_plan := jsonb_build_object(
    'objective', 'Master ' || array_to_string(p_focus_areas, ' and ') || ' through collaborative learning',
    'engagement', ARRAY[
      'Structured group discussion on ' || p_focus_areas[1],
      'Peer teaching with concept mapping',
      'Interactive problem solving with real-world scenarios',
      'Team-based skill practice with immediate feedback'
    ],
    'representation', ARRAY[
      'Multi-modal visualization of ' || p_focus_areas[1],
      'Student-created representations',
      'Collaborative modeling strategies',
      'Real-world problem analysis'
    ],
    'action_expression', ARRAY[
      'Differentiated group challenges',
      'Peer teaching rotations',
      'Collaborative problem solving',
      'Group presentation preparation'
    ],
    'wrapup', ARRAY[
      'Group achievement celebration',
      'Peer feedback exchange',
      'Learning strategy reflection',
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
  
  -- Generate a unique ID for this lesson plan
  v_unique_id := gen_random_uuid()::text;
  
  -- Return the lesson plan
  RETURN v_lesson_plan;
END;
$$;

-- Function to group students by identical focus areas
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
  v_student_data jsonb;
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
  
  -- Get student data with their struggle areas
  WITH student_struggles AS (
    SELECT 
      s.id,
      s.grade_level,
      array_agg(DISTINCT et.struggled_areas) AS all_struggles
    FROM students s
    JOIN exit_tickets et ON et.student_id = s.id
    WHERE s.teacher_username = p_teacher_username
    AND et.created_at BETWEEN v_week_start AND v_week_end
    GROUP BY s.id, s.grade_level
  ),
  -- Flatten and normalize struggle areas
  student_focus_areas AS (
    SELECT
      id,
      grade_level,
      ARRAY(
        SELECT DISTINCT unnest(all_struggles)
        FROM student_struggles ss2
        WHERE ss2.id = ss.id
      ) AS focus_areas
    FROM student_struggles ss
  ),
  -- Group students by identical focus areas
  focus_area_groups AS (
    SELECT
      focus_areas,
      array_agg(id) AS student_ids,
      array_agg(grade_level) AS grade_levels
    FROM student_focus_areas
    GROUP BY focus_areas
  )
  -- Create final groups
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'focus_areas', focus_areas,
        'students', student_ids,
        'grade_levels', grade_levels,
        'recommended_approach', CASE
          WHEN array_length(student_ids, 1) = 1 THEN 'Individual instruction focused on specific needs'
          WHEN array_length(student_ids, 1) = 2 THEN 'Pair programming and peer teaching'
          ELSE 'Collaborative group learning with peer support'
        END
      )
    )
  INTO v_student_data
  FROM focus_area_groups;
  
  -- Process groups to ensure optimal size (3-4 students)
  v_groups := '[]'::jsonb[];
  
  -- If we have student data, create groups
  IF v_student_data IS NOT NULL THEN
    -- Process each group from student data
    FOR i IN 0..jsonb_array_length(v_student_data) - 1 LOOP
      -- Get current group
      DECLARE
        v_current_group jsonb := v_student_data->i;
        v_focus_areas text[] := array_agg(jsonb_array_elements_text(v_current_group->'focus_areas'));
        v_students jsonb := v_current_group->'students';
        v_student_count integer := jsonb_array_length(v_students);
      BEGIN
        -- If group is already optimal size, add it as is
        IF v_student_count BETWEEN 3 AND 4 THEN
          v_groups := array_append(v_groups, jsonb_build_object(
            'focus_areas', v_focus_areas,
            'students', v_students,
            'recommended_approach', 'Collaborative learning with shared focus areas'
          ));
        -- If group is too large, split it
        ELSIF v_student_count > 4 THEN
          -- Create groups of 4 students
          FOR j IN 0..FLOOR(v_student_count / 4) - 1 LOOP
            v_groups := array_append(v_groups, jsonb_build_object(
              'focus_areas', v_focus_areas,
              'students', jsonb_build_array(
                v_students->(j*4),
                v_students->(j*4+1),
                v_students->(j*4+2),
                v_students->(j*4+3)
              ),
              'recommended_approach', 'Collaborative learning with shared focus areas'
            ));
          END LOOP;
          
          -- Add remaining students
          IF v_student_count % 4 > 0 THEN
            DECLARE
              v_remaining jsonb := '[]'::jsonb;
            BEGIN
              FOR j IN 0..(v_student_count % 4) - 1 LOOP
                v_remaining := v_remaining || jsonb_build_array(v_students->(FLOOR(v_student_count / 4) * 4 + j));
              END LOOP;
              
              v_groups := array_append(v_groups, jsonb_build_object(
                'focus_areas', v_focus_areas,
                'students', v_remaining,
                'recommended_approach', CASE
                  WHEN jsonb_array_length(v_remaining) = 1 THEN 'Individual instruction focused on specific needs'
                  WHEN jsonb_array_length(v_remaining) = 2 THEN 'Pair programming and peer teaching'
                  ELSE 'Small group collaborative learning'
                END
              ));
            END;
          END IF;
        -- If group is too small (1-2 students), keep as is but with appropriate approach
        ELSE
          v_groups := array_append(v_groups, jsonb_build_object(
            'focus_areas', v_focus_areas,
            'students', v_students,
            'recommended_approach', CASE
              WHEN v_student_count = 1 THEN 'Individual instruction focused on specific needs'
              ELSE 'Pair programming and peer teaching'
            END
          ));
        END IF;
      END;
    END LOOP;
  END IF;
  
  -- Build final result
  v_result := jsonb_build_object(
    'groups', to_jsonb(v_groups),
    'week_start', v_week_start,
    'week_end', v_week_end
  );
  
  RETURN v_result;
END;
$$;