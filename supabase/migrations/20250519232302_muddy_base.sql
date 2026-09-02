-- Function to assign teacher to coach
CREATE OR REPLACE FUNCTION assign_teacher_to_coach(
  p_coach_id uuid,
  p_teacher_username text
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  -- Validate input
  IF p_coach_id IS NULL OR p_teacher_username IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Coach ID and teacher username are required'
    );
  END IF;

  -- Check if coach exists
  IF NOT EXISTS (SELECT 1 FROM coaches WHERE id = p_coach_id) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Coach not found'
    );
  END IF;

  -- Check if teacher exists
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE username = p_teacher_username) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Create assignment
  INSERT INTO coach_teacher_assignments (
    coach_id,
    teacher_username
  ) VALUES (
    p_coach_id,
    p_teacher_username
  )
  RETURNING id INTO v_assignment_id;

  RETURN json_build_object(
    'success', true,
    'assignment_id', v_assignment_id
  );
END;
$$;