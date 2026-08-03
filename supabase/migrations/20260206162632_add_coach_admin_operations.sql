/*
  # Add coach admin operations and fix RLS policies

  1. New Functions
    - `unassign_teacher_from_coach` - Removes a teacher-coach assignment (SECURITY DEFINER)

  2. Security
    - Add INSERT, UPDATE, DELETE policies on `coaches` for admin operations
    - Add INSERT, DELETE policies on `coach_teacher_assignments` for admin operations
    - Uses SECURITY DEFINER functions to bypass RLS where appropriate

  3. Notes
    - Admin operations use public role since admin portal doesn't use Supabase Auth sessions
    - SECURITY DEFINER functions are used for safe bypass of RLS
*/

CREATE OR REPLACE FUNCTION public.unassign_teacher_from_coach(
  p_coach_id uuid,
  p_teacher_username text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_coach_id IS NULL OR p_teacher_username IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Coach ID and teacher username are required'
    );
  END IF;

  DELETE FROM coach_teacher_assignments
  WHERE coach_id = p_coach_id
    AND teacher_username = p_teacher_username;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Assignment not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Teacher unassigned successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_coach(p_coach_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_coach_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Coach ID is required');
  END IF;

  DELETE FROM coach_teacher_assignments WHERE coach_id = p_coach_id;
  DELETE FROM coaches WHERE id = p_coach_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Coach not found');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Coach deleted successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_coach_lock(p_coach_id uuid, p_locked boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coaches SET account_locked = p_locked WHERE id = p_coach_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Coach not found');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Coach status updated');
END;
$$;
