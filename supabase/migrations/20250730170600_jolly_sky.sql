/*
  # Automatic Lesson Plan Generation Trigger

  1. New Functions
    - `generate_lesson_plan_after_quiz()` - Trigger function to automatically generate lesson plans
    - `process_quiz_completion()` - Process quiz completion and generate lesson plan

  2. Triggers
    - Trigger on quiz_attempts insert to automatically generate lesson plans
    - Trigger to update weekly groups after lesson plan creation

  3. Security
    - Functions execute with appropriate permissions
*/

-- Function to automatically generate lesson plan after quiz completion
CREATE OR REPLACE FUNCTION generate_lesson_plan_after_quiz()
RETURNS TRIGGER AS $$
DECLARE
    v_student_grade text;
    v_struggle_areas text[];
    v_lesson_plan jsonb;
    v_lesson_plan_id uuid;
BEGIN
    -- Get student grade level
    SELECT grade_level INTO v_student_grade
    FROM students 
    WHERE id = NEW.student_id AND teacher_username = NEW.teacher_username;
    
    -- If student doesn't exist, create with default grade
    IF v_student_grade IS NULL THEN
        INSERT INTO students (id, teacher_username, grade_level, subject)
        VALUES (NEW.student_id, NEW.teacher_username, '6', 'Mathematics')
        ON CONFLICT (id, teacher_username) DO UPDATE SET
            last_seen = now();
        v_student_grade := '6';
    END IF;
    
    -- Extract struggle areas from incorrect answers
    SELECT array_agg(DISTINCT answer->>'questionSubtopic')
    INTO v_struggle_areas
    FROM jsonb_array_elements(NEW.answers) AS answer
    WHERE (answer->>'correct')::boolean = false
    AND answer->>'questionSubtopic' IS NOT NULL
    AND answer->>'questionSubtopic' != '';
    
    -- If no struggle areas from quiz, use generic areas
    IF v_struggle_areas IS NULL OR array_length(v_struggle_areas, 1) = 0 THEN
        v_struggle_areas := ARRAY['Problem Solving', 'Mathematical Reasoning'];
    END IF;
    
    -- Generate lesson plan using existing function
    SELECT generate_dok_lesson_plan(
        v_student_grade,
        NULL, -- No specific standard
        v_struggle_areas
    ) INTO v_lesson_plan;
    
    -- Insert lesson plan if generation was successful
    IF v_lesson_plan IS NOT NULL THEN
        INSERT INTO lesson_plans (
            student_id,
            teacher_username,
            objective,
            engagement,
            representation,
            action_expression,
            wrapup,
            duration,
            dok_levels,
            aligned_standards,
            detailed_activities
        ) VALUES (
            NEW.student_id,
            NEW.teacher_username,
            COALESCE(v_lesson_plan->>'objective', 'Master key mathematical concepts'),
            COALESCE(
                (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_lesson_plan->'engagement')),
                ARRAY['Interactive exploration', 'Guided practice', 'Peer collaboration', 'Real-world connections']
            ),
            COALESCE(
                (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_lesson_plan->'representation')),
                ARRAY['Visual models', 'Multiple strategies', 'Concrete examples', 'Abstract connections']
            ),
            COALESCE(
                (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_lesson_plan->'action_expression')),
                ARRAY['Hands-on practice', 'Problem solving', 'Student demonstrations', 'Peer teaching']
            ),
            COALESCE(
                (SELECT array_agg(value::text) FROM jsonb_array_elements_text(v_lesson_plan->'wrapup')),
                ARRAY['Concept summary', 'Exit ticket', 'Reflection', 'Next steps preview']
            ),
            COALESCE((v_lesson_plan->>'duration')::integer, 25),
            COALESCE(v_lesson_plan->'dok_levels', '{"engagement": 1, "representation": 2, "action_expression": 3, "wrapup": 2}'::jsonb),
            COALESCE(v_lesson_plan->'aligned_standards', '[]'::jsonb),
            COALESCE(v_lesson_plan->'detailed_activities', '{}'::jsonb)
        ) RETURNING id INTO v_lesson_plan_id;
        
        -- Create exit ticket record
        INSERT INTO exit_tickets (
            student_id,
            teacher_username,
            score,
            total_questions,
            struggled_areas,
            last_lesson
        ) VALUES (
            NEW.student_id,
            NEW.teacher_username,
            NEW.score,
            NEW.total_questions,
            v_struggle_areas,
            COALESCE(v_lesson_plan->>'objective', 'Mathematical Assessment')
        );
        
        -- Update lesson plan with exit ticket reference
        UPDATE lesson_plans 
        SET exit_ticket_id = (
            SELECT id FROM exit_tickets 
            WHERE student_id = NEW.student_id 
            AND teacher_username = NEW.teacher_username 
            ORDER BY created_at DESC 
            LIMIT 1
        )
        WHERE id = v_lesson_plan_id;
        
        RAISE NOTICE 'Lesson plan generated automatically for student % by teacher %', NEW.student_id, NEW.teacher_username;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically generate lesson plans after quiz completion
DROP TRIGGER IF EXISTS auto_generate_lesson_plan ON quiz_attempts;
CREATE TRIGGER auto_generate_lesson_plan
    AFTER INSERT ON quiz_attempts
    FOR EACH ROW
    EXECUTE FUNCTION generate_lesson_plan_after_quiz();

-- Function to regenerate weekly groups after lesson plan creation
CREATE OR REPLACE FUNCTION auto_update_weekly_groups()
RETURNS TRIGGER AS $$
BEGIN
    -- Regenerate weekly groups for the teacher
    PERFORM regenerate_weekly_groups(NEW.teacher_username);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update weekly groups after lesson plan creation
DROP TRIGGER IF EXISTS auto_update_groups ON lesson_plans;
CREATE TRIGGER auto_update_groups
    AFTER INSERT ON lesson_plans
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_weekly_groups();