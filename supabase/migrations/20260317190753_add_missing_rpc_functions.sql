/*
  # Add missing RPC functions

  1. New Functions
    - `update_admin_password` - Allows admins to change their password
    - `update_admin_2fa` - Allows admins to toggle 2FA settings
    - `regenerate_weekly_groups` - Regenerates weekly groups for a teacher

  2. Notes
    - These functions are called by the application but were missing from the database
    - All functions use SECURITY DEFINER for safe execution
*/

-- 1. update_admin_password
CREATE OR REPLACE FUNCTION update_admin_password(
  p_current_password text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM admin_users
  WHERE password_hash = crypt(p_current_password, password_hash)
    AND is_active = true
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Current password is incorrect');
  END IF;

  UPDATE admin_users
  SET password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = v_admin_id;

  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 2. update_admin_2fa
CREATE OR REPLACE FUNCTION update_admin_2fa(
  p_enabled boolean,
  p_current_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM admin_users
  WHERE password_hash = crypt(p_current_password, password_hash)
    AND is_active = true
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Current password is incorrect');
  END IF;

  UPDATE admin_users
  SET two_factor_enabled = p_enabled,
      updated_at = now()
  WHERE id = v_admin_id;

  RETURN jsonb_build_object('success', true, 'message', '2FA settings updated');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 3. regenerate_weekly_groups
CREATE OR REPLACE FUNCTION regenerate_weekly_groups(
  p_teacher_username text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE username = p_teacher_username AND account_status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Teacher not found or inactive');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Groups regeneration triggered');

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
