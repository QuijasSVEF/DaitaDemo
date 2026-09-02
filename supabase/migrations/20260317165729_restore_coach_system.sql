/*
  # Restore Coach Management System
  
  1. New Tables
    - coaches: Coach accounts with auth
    - coach_teacher_assignments: Links coaches to teachers
    - coach_notes: Coach notes on teachers
    - coaching_goals: Goals set by coaches
    - coach_tags: Tags for categorizing coaches
    
  2. Functions
    - authenticate_coach: Coach login
    - create_coach: Creates coach account
    - assign_teacher_to_coach: Assigns teacher to coach
    - unassign_teacher_from_coach: Removes assignment
    - delete_coach: Deletes coach account
    - toggle_coach_lock: Locks/unlocks coach
    - get_coaches_with_assignments: Lists coaches
    - get_coach_password: Gets coach password
    - update_coach_password: Updates coach password
    
  3. Security
    - RLS enabled on all tables
    - Public access policies for admin portal
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz,
  account_locked boolean DEFAULT false,
  failed_login_attempts integer DEFAULT 0,
  temp_password boolean DEFAULT true,
  plaintext_password text,
  password_last_changed timestamptz
);

CREATE TABLE IF NOT EXISTS coach_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  teacher_username text REFERENCES teachers(username) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(coach_id, teacher_username)
);

CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  teacher_username text REFERENCES teachers(username) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coaching_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  teacher_username text REFERENCES teachers(username) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coaches(id) ON DELETE CASCADE,
  teacher_username text REFERENCES teachers(username) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'coaches'::regclass AND polname = 'Public read access for coaches') THEN
    CREATE POLICY "Public read access for coaches" ON coaches FOR SELECT USING (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'coaches'::regclass AND polname = 'Public insert access for coaches') THEN
    CREATE POLICY "Public insert access for coaches" ON coaches FOR INSERT WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'coaches'::regclass AND polname = 'Public update access for coaches') THEN
    CREATE POLICY "Public update access for coaches" ON coaches FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'coaches'::regclass AND polname = 'Public delete access for coaches') THEN
    CREATE POLICY "Public delete access for coaches" ON coaches FOR DELETE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'coach_teacher_assignments'::regclass AND polname = 'Public access for coach assignments') THEN
    CREATE POLICY "Public access for coach assignments" ON coach_teacher_assignments FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'coach_notes'::regclass AND polname = 'Public access for coach notes') THEN
    CREATE POLICY "Public access for coach notes" ON coach_notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'coaching_goals'::regclass AND polname = 'Public access for coaching goals') THEN
    CREATE POLICY "Public access for coaching goals" ON coaching_goals FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = 'coach_tags'::regclass AND polname = 'Public access for coach tags') THEN
    CREATE POLICY "Public access for coach tags" ON coach_tags FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP FUNCTION IF EXISTS authenticate_coach(text, text);
CREATE FUNCTION authenticate_coach(p_email TEXT, p_password TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach coaches;
BEGIN
  SELECT * INTO v_coach FROM coaches WHERE email = p_email;
  IF v_coach.id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials'); END IF;
  IF v_coach.account_locked = true THEN RETURN jsonb_build_object('success', false, 'message', 'Account is locked. Please contact support.'); END IF;
  IF v_coach.password_hash = crypt(p_password, v_coach.password_hash) THEN
    UPDATE coaches SET failed_login_attempts = 0, last_login = now() WHERE id = v_coach.id;
    RETURN jsonb_build_object('success', true, 'message', 'Login successful', 'coach', jsonb_build_object('id', v_coach.id, 'email', v_coach.email, 'full_name', v_coach.full_name));
  ELSE
    UPDATE coaches SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, account_locked = CASE WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 THEN true ELSE false END WHERE id = v_coach.id;
    RETURN jsonb_build_object('success', false, 'message', 'Invalid credentials');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION create_coach(p_email text, p_full_name text, p_password text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  IF p_email IS NULL OR p_full_name IS NULL OR p_password IS NULL THEN RETURN json_build_object('success', false, 'message', 'All fields are required'); END IF;
  IF EXISTS (SELECT 1 FROM coaches WHERE email = p_email) THEN RETURN json_build_object('success', false, 'message', 'Email already exists'); END IF;
  INSERT INTO coaches (email, full_name, password_hash, plaintext_password) VALUES (p_email, p_full_name, crypt(p_password, gen_salt('bf')), p_password) RETURNING id INTO v_coach_id;
  RETURN json_build_object('success', true, 'coach_id', v_coach_id);
END;
$$;

CREATE OR REPLACE FUNCTION assign_teacher_to_coach(p_coach_id uuid, p_teacher_username text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  IF p_coach_id IS NULL OR p_teacher_username IS NULL THEN RETURN json_build_object('success', false, 'message', 'Coach ID and teacher username are required'); END IF;
  IF NOT EXISTS (SELECT 1 FROM coaches WHERE id = p_coach_id) THEN RETURN json_build_object('success', false, 'message', 'Coach not found'); END IF;
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE username = p_teacher_username) THEN RETURN json_build_object('success', false, 'message', 'Teacher not found'); END IF;
  INSERT INTO coach_teacher_assignments (coach_id, teacher_username) VALUES (p_coach_id, p_teacher_username) RETURNING id INTO v_assignment_id;
  RETURN json_build_object('success', true, 'assignment_id', v_assignment_id);
END;
$$;

CREATE OR REPLACE FUNCTION unassign_teacher_from_coach(p_coach_id uuid, p_teacher_username text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM coach_teacher_assignments WHERE coach_id = p_coach_id AND teacher_username = p_teacher_username;
  RETURN json_build_object('success', true, 'message', 'Teacher unassigned successfully');
END;
$$;

CREATE OR REPLACE FUNCTION delete_coach(p_coach_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM coaches WHERE id = p_coach_id) THEN RETURN json_build_object('success', false, 'message', 'Coach not found'); END IF;
  DELETE FROM coaches WHERE id = p_coach_id;
  RETURN json_build_object('success', true, 'message', 'Coach deleted successfully');
END;
$$;

CREATE OR REPLACE FUNCTION toggle_coach_lock(p_coach_id uuid, p_locked boolean)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE coaches SET account_locked = p_locked, failed_login_attempts = CASE WHEN NOT p_locked THEN 0 ELSE failed_login_attempts END WHERE id = p_coach_id;
  RETURN json_build_object('success', true, 'message', CASE WHEN p_locked THEN 'Coach locked' ELSE 'Coach unlocked' END);
END;
$$;

CREATE OR REPLACE FUNCTION get_coaches_with_assignments()
RETURNS TABLE (coach_id uuid, coach_email text, coach_name text, last_login timestamptz, account_locked boolean, assigned_teachers_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.email, c.full_name, c.last_login, c.account_locked, COUNT(cta.teacher_username)
  FROM coaches c LEFT JOIN coach_teacher_assignments cta ON c.id = cta.coach_id
  GROUP BY c.id, c.email, c.full_name, c.last_login, c.account_locked
  ORDER BY c.full_name ASC;
$$;

CREATE OR REPLACE FUNCTION get_coach_password(p_coach_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach coaches;
BEGIN
  SELECT * INTO v_coach FROM coaches WHERE id = p_coach_id;
  RETURN jsonb_build_object('password', v_coach.plaintext_password, 'is_temp', v_coach.temp_password, 'last_changed', v_coach.password_last_changed);
END;
$$;

CREATE OR REPLACE FUNCTION update_coach_password(p_coach_id uuid, p_new_password text, p_is_temp boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE coaches SET password_hash = crypt(p_new_password, gen_salt('bf')), plaintext_password = CASE WHEN p_is_temp THEN p_new_password ELSE NULL END, temp_password = p_is_temp, password_last_changed = now() WHERE id = p_coach_id;
  RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
END;
$$;
