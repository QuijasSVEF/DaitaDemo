/*
  # Add updated_at column and regeneration function
  
  1. Changes
    - Add updated_at column to group_lesson_plans
    - Add regeneration function
    - Add trigger to update timestamp
    
  2. Features
    - Automatic timestamp updates
    - Lesson plan regeneration
*/

-- Add updated_at column
ALTER TABLE group_lesson_plans 
ADD COLUMN updated_at timestamptz DEFAULT now();

-- Create trigger function to update timestamp
CREATE OR REPLACE FUNCTION update_group_lesson_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_group_lesson_plan_timestamp
  BEFORE UPDATE ON group_lesson_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_group_lesson_plan_timestamp();

-- Create regeneration function
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
  v_student_ids INTEGER[];
  v_focus_areas TEXT[];
  v_lesson_plan jsonb;
BEGIN
  -- Get group lesson plan details
  SELECT 
    group_id,
    teacher_username,
    student_ids,
    focus_areas
  INTO
    v_group_id,
    v_teacher_username,
    v_student_ids,
    v_focus_areas
  FROM group_lesson_plans
  WHERE id = p_group_lesson_plan_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Group lesson plan not found'
    );
  END IF;

  -- Generate new lesson plan
  SELECT jsonb_build_object(
    'objective', 'Master ' || array_to_string(v_focus_areas, ' and '),
    'engagement', ARRAY[
      'Interactive group exploration',
      'Collaborative discovery activities',
      'Real-world connections',
      'Peer discussions'
    ],
    'representation', ARRAY[
      'Visual models and diagrams',
      'Multiple solution strategies',
      'Manipulatives and tools',
      'Digital simulations'
    ],
    'action_expression', ARRAY[
      'Group problem solving',
      'Collaborative projects',
      'Student presentations',
      'Peer teaching'
    ],
    'wrapup', ARRAY[
      'Group reflection',
      'Concept synthesis',
      'Exit tickets',
      'Next steps planning'
    ],
    'duration', 25,
    'dok_levels', jsonb_build_object(
      'engagement', 2,
      'representation', 2,
      'action_expression', 3,
      'wrapup', 2
    )
  ) INTO v_lesson_plan;

  -- Update lesson plan
  UPDATE group_lesson_plans
  SET 
    lesson_plan = v_lesson_plan,
    updated_at = now()
  WHERE id = p_group_lesson_plan_id;

  -- Log regeneration
  INSERT INTO admin_audit_logs (
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    'regenerate_group_lesson',
    'group_lesson_plan',
    p_group_lesson_plan_id::text,
    jsonb_build_object(
      'group_id', v_group_id,
      'teacher_username', v_teacher_username,
      'timestamp', now()
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Lesson plan regenerated successfully',
    'lesson_plan', v_lesson_plan
  );
END;
$$;