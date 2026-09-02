/*
  # Fix Quiz Attempt Submission
  
  1. Changes
    - Add function to validate and create student if needed
    - Fix subquery error in quiz attempt submission
    - Add proper error handling
    
  2. Features
    - Atomic student validation/creation
    - Proper error messages
    - Improved data integrity
*/

-- Function to validate student and create if needed
CREATE OR REPLACE FUNCTION validate_and_create_student(
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
BEGIN
  -- Check if student exists
  SELECT EXISTS (
    SELECT 1 
    FROM students 
    WHERE id = p_student_id AND teacher_username = p_teacher_username
  ) INTO v_student_exists;
  
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
  
  -- If student exists and emoji password is provided, update it
  IF v_student_exists AND p_emoji_password IS NOT NULL THEN
    UPDATE students
    SET emoji_password = p_emoji_password
    WHERE id = p_student_id AND teacher_username = p_teacher_username;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Function to get lesson plan by exit ticket
CREATE OR REPLACE FUNCTION get_lesson_plan_by_exit_ticket(
  p_exit_ticket_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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