/*
  # Add update_college_mentor_password and get_college_mentor_password RPCs

  1. New Functions
    - `update_college_mentor_password(p_mentor_id uuid, p_new_password text)` - Updates mentor password with bcrypt hash
    - `get_college_mentor_password(p_mentor_id uuid)` - Returns the current password info for display in admin

  2. Security
    - SECURITY DEFINER to allow admin portal access
    - Password hashed with bcrypt using gen_salt('bf')

  3. Important Notes
    - Since college_mentors doesn't have a plaintext_password column, we add one for admin visibility
*/

-- Add plaintext_password column to college_mentors for admin retrieval
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'college_mentors' AND column_name = 'plaintext_password'
  ) THEN
    ALTER TABLE college_mentors ADD COLUMN plaintext_password text;
  END IF;
END $$;

-- Update existing mentors that have known passwords to store plaintext
-- (The reset function already returns temp passwords, this just enables view)

-- Get college mentor password function
CREATE OR REPLACE FUNCTION get_college_mentor_password(p_mentor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_mentor college_mentors;
BEGIN
  SELECT * INTO v_mentor FROM college_mentors WHERE id = p_mentor_id;
  
  IF v_mentor.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mentor not found');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'password', v_mentor.plaintext_password,
    'last_changed', v_mentor.updated_at
  );
END;
$$;

-- Update college mentor password function
CREATE OR REPLACE FUNCTION update_college_mentor_password(p_mentor_id uuid, p_new_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_mentor_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM college_mentors WHERE id = p_mentor_id) INTO v_mentor_exists;
  
  IF NOT v_mentor_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mentor not found');
  END IF;

  UPDATE college_mentors
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    plaintext_password = p_new_password,
    updated_at = now()
  WHERE id = p_mentor_id;

  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
END;
$$;

-- Update reset function to also store plaintext
CREATE OR REPLACE FUNCTION reset_college_mentor_password(p_mentor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_temp_password TEXT;
  v_mentor_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM college_mentors WHERE id = p_mentor_id) INTO v_mentor_exists;
  
  IF NOT v_mentor_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mentor not found');
  END IF;

  v_temp_password := 'temp_' || substr(md5(random()::text), 0, 9);

  UPDATE college_mentors
  SET 
    password_hash = crypt(v_temp_password, gen_salt('bf')),
    plaintext_password = v_temp_password,
    account_locked = false,
    failed_login_attempts = 0,
    updated_at = now()
  WHERE id = p_mentor_id;

  RETURN jsonb_build_object('success', true, 'temp_password', v_temp_password);
END;
$$;
