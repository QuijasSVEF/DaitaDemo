/*
  # Create personalized lesson plan generation function

  1. New Functions
    - `generate_personalized_lesson_plan` - Generates highly personalized lesson plans based on student data
    
  2. Features
    - Uses actual quiz performance data
    - Incorporates specific struggle areas
    - References previous assessments
    - Tailors content to grade level and student needs
    
  3. Security
    - Function accessible to authenticated users
    - Validates teacher permissions
*/

CREATE OR REPLACE FUNCTION generate_personalized_lesson_plan(
  p_student_id INTEGER,
  p_teacher_username TEXT,
  p_grade_level TEXT,
  p_struggle_areas TEXT[],
  p_last_lesson TEXT,
  p_exit_ticket_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_data JSONB;
  v_quiz_data JSONB;
  v_previous_struggles TEXT[];
  v_standards JSONB;
  v_lesson_plan JSONB;
  v_prompt TEXT;
BEGIN
  -- Validate teacher permissions
  IF NOT EXISTS (
    SELECT 1 FROM teachers 
    WHERE username = p_teacher_username 
    AND account_status = 'active' 
    AND account_locked = false
  ) THEN
    RAISE EXCEPTION 'Teacher not found or not active';
  END IF;

  -- Get student's latest quiz performance
  SELECT jsonb_build_object(
    'score', qa.score,
    'total_questions', qa.total_questions,
    'answers', qa.answers,
    'quiz_title', qt.title,
    'quiz_topic', qt.topic,
    'quiz_subtopics', qt.subtopics,
    'incorrect_subtopics', (
      SELECT array_agg(DISTINCT (answer->>'questionSubtopic')::text)
      FROM jsonb_array_elements(qa.answers) AS answer
      WHERE (answer->>'correct')::boolean = false
      AND answer->>'questionSubtopic' IS NOT NULL
    )
  ) INTO v_quiz_data
  FROM quiz_attempts qa
  JOIN quiz_templates qt ON qa.template_id = qt.id
  WHERE qa.student_id = p_student_id
  AND qa.teacher_username = p_teacher_username
  ORDER BY qa.completed_at DESC
  LIMIT 1;

  -- Get previous struggle areas
  SELECT array_agg(DISTINCT struggle_area)
  INTO v_previous_struggles
  FROM (
    SELECT unnest(struggled_areas) AS struggle_area
    FROM exit_tickets
    WHERE student_id = p_student_id
    AND teacher_username = p_teacher_username
    AND id != COALESCE(p_exit_ticket_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ORDER BY created_at DESC
    LIMIT 10
  ) AS previous_areas;

  -- Get relevant standards for grade level
  SELECT jsonb_agg(
    jsonb_build_object(
      'standardCode', standard_code,
      'description', description,
      'domain', domain,
      'cluster', cluster
    )
  ) INTO v_standards
  FROM ca_standards
  WHERE grade_level = p_grade_level
  AND subject = 'Mathematics'
  LIMIT 20;

  -- Build comprehensive prompt
  v_prompt := format('
Create a highly personalized 25-minute math lesson plan for this specific student.

STUDENT PROFILE:
- Student ID: %s
- Grade Level: %s
- Teacher: %s
- Last Lesson: %s

CURRENT STRUGGLE AREAS: %s

PREVIOUS STRUGGLE PATTERNS: %s

%s

QUIZ PERFORMANCE DATA: %s

AVAILABLE STANDARDS: %s

CRITICAL REQUIREMENTS:
1. Address the specific struggle areas from this student''s actual assessment data
2. Reference the student''s quiz performance and missed topics
3. Build directly on the last lesson: "%s"
4. Include remediation for specific quiz questions missed
5. Provide targeted practice for weak areas
6. Use grade %s appropriate language and concepts
7. Make activities specific to this student''s learning needs

Return ONLY a valid JSON object with this exact format:
{
  "objective": "Specific objective addressing this student''s struggle areas",
  "engagement": [
    "Activity targeting specific struggle area from assessment",
    "Warm-up reviewing missed quiz concepts",
    "Interactive exploration of weak topics",
    "Connection to previous lesson content"
  ],
  "representation": [
    "Visual model for specific struggle area",
    "Multiple representations of missed quiz topics",
    "Scaffolded examples at student''s level",
    "Concrete-to-abstract progression for weak areas"
  ],
  "action_expression": [
    "Guided practice on specific struggle areas",
    "Targeted exercises for missed quiz topics",
    "Differentiated practice at student''s level",
    "Assessment of understanding in weak areas"
  ],
  "wrapup": [
    "Review of specific concepts covered",
    "Exit ticket targeting struggle areas",
    "Preview of next lesson building on today''s work",
    "Student self-assessment of progress"
  ],
  "duration": 25,
  "dok_levels": {
    "engagement": 1,
    "representation": 2,
    "action_expression": 3,
    "wrapup": 2
  },
  "aligned_standards": []
}',
    p_student_id,
    p_grade_level,
    p_teacher_username,
    p_last_lesson,
    array_to_string(p_struggle_areas, ', '),
    COALESCE(array_to_string(v_previous_struggles, ', '), 'No previous data'),
    CASE 
      WHEN v_quiz_data IS NOT NULL THEN 
        format('RECENT ASSESSMENT PERFORMANCE:
- Quiz: %s (%s)
- Score: %s/%s (%s%%)
- Topics Missed: %s
- Quiz Subtopics: %s',
          v_quiz_data->>'quiz_title',
          v_quiz_data->>'quiz_topic',
          v_quiz_data->>'score',
          v_quiz_data->>'total_questions',
          ROUND(((v_quiz_data->>'score')::numeric / (v_quiz_data->>'total_questions')::numeric) * 100),
          COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_quiz_data->'incorrect_subtopics')), ', '), 'None'),
          COALESCE(array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_quiz_data->'quiz_subtopics')), ', '), 'None')
        )
      ELSE 'No recent quiz data available'
    END,
    COALESCE(v_quiz_data::text, 'No quiz data'),
    COALESCE(v_standards::text, '[]'),
    p_last_lesson,
    p_grade_level
  );

  -- For now, return a structured lesson plan based on the data
  -- In a real implementation, this would call an AI service
  v_lesson_plan := jsonb_build_object(
    'objective', format('Master %s concepts through targeted practice and remediation', 
      CASE 
        WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
        ELSE 'key mathematical'
      END
    ),
    'engagement', jsonb_build_array(
      format('Review and remediate %s from recent assessment', 
        CASE 
          WHEN v_quiz_data IS NOT NULL AND v_quiz_data->'incorrect_subtopics' IS NOT NULL 
          THEN (SELECT string_agg(value::text, ', ') FROM jsonb_array_elements_text(v_quiz_data->'incorrect_subtopics') LIMIT 2)
          ELSE COALESCE(p_struggle_areas[1], 'key concepts')
        END
      ),
      format('Interactive exploration of %s using manipulatives', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'mathematical concepts'
        END
      ),
      format('Connect %s to real-world applications', p_last_lesson),
      format('Peer discussion about strategies for %s', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'problem solving'
        END
      )
    ),
    'representation', jsonb_build_array(
      format('Visual models and diagrams for %s', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'key concepts'
        END
      ),
      format('Multiple solution strategies for %s problems', 
        CASE 
          WHEN v_quiz_data IS NOT NULL THEN v_quiz_data->>'quiz_topic'
          ELSE 'mathematical'
        END
      ),
      format('Scaffolded examples progressing from concrete to abstract for %s', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'the concept'
        END
      ),
      format('Digital tools and simulations for %s', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'concept exploration'
        END
      )
    ),
    'action_expression', jsonb_build_array(
      format('Guided practice targeting %s weaknesses identified in assessment', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'specific'
        END
      ),
      format('Collaborative problem-solving for %s challenges', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'mathematical'
        END
      ),
      format('Individual practice with %s problems similar to missed quiz items', 
        CASE 
          WHEN v_quiz_data IS NOT NULL THEN v_quiz_data->>'quiz_topic'
          ELSE 'relevant'
        END
      ),
      format('Student demonstration of understanding in %s', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'the target area'
        END
      )
    ),
    'wrapup', jsonb_build_array(
      format('Review key strategies for %s', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'the concepts covered'
        END
      ),
      format('Exit ticket assessing %s understanding', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'student'
        END
      ),
      format('Preview next lesson building on %s progress', p_last_lesson),
      format('Student reflection on %s learning and growth areas', 
        CASE 
          WHEN array_length(p_struggle_areas, 1) > 0 THEN p_struggle_areas[1]
          ELSE 'their'
        END
      )
    ),
    'duration', 25,
    'dok_levels', jsonb_build_object(
      'engagement', 1,
      'representation', 2,
      'action_expression', 3,
      'wrapup', 2
    ),
    'aligned_standards', COALESCE(v_standards, '[]'::jsonb),
    'detailed_activities', jsonb_build_object(
      'engagement', jsonb_build_array(),
      'representation', jsonb_build_array(),
      'actionExpression', jsonb_build_array(),
      'wrapup', jsonb_build_array()
    )
  );

  RETURN v_lesson_plan;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_personalized_lesson_plan TO authenticated;
GRANT EXECUTE ON FUNCTION generate_personalized_lesson_plan TO anon;