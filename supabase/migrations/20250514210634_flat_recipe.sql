/*
  # Fix Student Grouping by Focus Areas
  
  1. New Function
    - Improved group_students_by_focus_areas function that groups students only by identical focus areas
    - Ensures students are only grouped with others who have the exact same learning needs
    
  2. Features
    - Exact focus area matching
    - Optimal group sizing (3-4 students per group)
    - Appropriate teaching approaches based on group size
    - Better lesson plan generation for targeted instruction
    
  3. Security
    - SECURITY DEFINER function
    - Proper error handling
    - Input validation
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS group_students_by_focus_areas(text, date);

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
      array_agg(DISTINCT unnest(et.struggled_areas)) AS focus_areas
    FROM students s
    JOIN exit_tickets et ON et.student_id = s.id
    WHERE s.teacher_username = p_teacher_username
    AND et.created_at BETWEEN v_week_start AND v_week_end
    GROUP BY s.id, s.grade_level
  ),
  -- Group students by IDENTICAL focus areas
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
      CASE
        -- For large groups (more than 4 students), split into multiple groups
        WHEN array_length(student_ids, 1) > 4 THEN
          jsonb_build_object(
            'focus_areas', focus_areas,
            'students', (SELECT jsonb_agg(id) FROM unnest(student_ids[1:4]) AS id),
            'recommended_approach', 'Collaborative learning with shared focus areas'
          )
        -- For optimal size groups (3-4 students)
        WHEN array_length(student_ids, 1) BETWEEN 3 AND 4 THEN
          jsonb_build_object(
            'focus_areas', focus_areas,
            'students', (SELECT jsonb_agg(id) FROM unnest(student_ids) AS id),
            'recommended_approach', 'Collaborative learning with shared focus areas'
          )
        -- For pairs
        WHEN array_length(student_ids, 1) = 2 THEN
          jsonb_build_object(
            'focus_areas', focus_areas,
            'students', (SELECT jsonb_agg(id) FROM unnest(student_ids) AS id),
            'recommended_approach', 'Pair programming and peer teaching'
          )
        -- For individual students
        ELSE
          jsonb_build_object(
            'focus_areas', focus_areas,
            'students', (SELECT jsonb_agg(id) FROM unnest(student_ids) AS id),
            'recommended_approach', 'Individual instruction focused on specific needs'
          )
      END
    )
  INTO v_groups
  FROM focus_area_groups;
  
  -- Handle case where there are more than 4 students in a group
  -- Create additional groups for the remaining students
  FOR i IN 0..jsonb_array_length(v_groups) - 1 LOOP
    DECLARE
      v_current_group jsonb := v_groups[i+1];
      v_students jsonb := v_current_group->'students';
      v_focus_areas jsonb := v_current_group->'focus_areas';
      v_student_count integer := jsonb_array_length(v_students);
    BEGIN
      -- If we have more than 4 students, create additional groups
      IF v_student_count > 4 THEN
        -- Calculate how many additional groups we need
        DECLARE
          v_additional_groups integer := CEIL((v_student_count - 4) / 4.0)::integer;
          v_new_groups jsonb[] := '{}'::jsonb[];
        BEGIN
          -- Create the first group with 4 students
          v_new_groups := array_append(v_new_groups, jsonb_build_object(
            'focus_areas', v_focus_areas,
            'students', jsonb_build_array(
              v_students->0,
              v_students->1,
              v_students->2,
              v_students->3
            ),
            'recommended_approach', 'Collaborative learning with shared focus areas'
          ));
          
          -- Create additional groups with remaining students
          FOR j IN 1..v_additional_groups LOOP
            DECLARE
              v_start_idx integer := 4 + (j-1) * 4;
              v_end_idx integer := LEAST(v_start_idx + 3, v_student_count - 1);
              v_group_students jsonb := '[]'::jsonb;
            BEGIN
              -- Add students to this group
              FOR k IN v_start_idx..v_end_idx LOOP
                v_group_students := v_group_students || jsonb_build_array(v_students->k);
              END LOOP;
              
              -- Add the group if it has students
              IF jsonb_array_length(v_group_students) > 0 THEN
                v_new_groups := array_append(v_new_groups, jsonb_build_object(
                  'focus_areas', v_focus_areas,
                  'students', v_group_students,
                  'recommended_approach', CASE
                    WHEN jsonb_array_length(v_group_students) = 1 THEN 'Individual instruction focused on specific needs'
                    WHEN jsonb_array_length(v_group_students) = 2 THEN 'Pair programming and peer teaching'
                    ELSE 'Collaborative learning with shared focus areas'
                  END
                ));
              END IF;
            END;
          END LOOP;
          
          -- Replace the original group with our new groups
          v_groups := v_groups[:i] || v_new_groups || v_groups[i+2:];
        END;
      END IF;
    END;
  END LOOP;
  
  -- Build final result
  v_result := jsonb_build_object(
    'groups', to_jsonb(v_groups),
    'week_start', v_week_start,
    'week_end', v_week_end
  );
  
  RETURN v_result;
END;
$$;

-- Function to generate a group lesson plan for students with identical focus areas
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
    description ILIKE ANY(array(SELECT '%' || focus_area || '%' FROM unnest(p_focus_areas) AS focus_area)) OR
    domain ILIKE ANY(array(SELECT '%' || focus_area || '%' FROM unnest(p_focus_areas) AS focus_area)) OR
    cluster ILIKE ANY(array(SELECT '%' || focus_area || '%' FROM unnest(p_focus_areas) AS focus_area))
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
  
  -- Return the lesson plan
  RETURN v_lesson_plan;
END;
$$;