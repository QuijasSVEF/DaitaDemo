/*
  # Restore Admin, Auth, and Session Tables
  
  1. New Tables
    - `teacher_accounts` - Extended teacher credentials
    - `admin_users` - Admin accounts
    - `admin_sessions` - Admin sessions
    - `admin_audit_logs` - Audit trail
    - `teacher_sessions` - Teacher login sessions
    - `password_reset_requests` - Password reset tracking
    - `school_districts` - School district records
    - `analytics_error_logs` - Error tracking
    
  2. Security
    - RLS enabled on all tables
*/

-- Teacher accounts (extended auth info)
CREATE TABLE IF NOT EXISTS teacher_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text DEFAULT '',
  password_hash text DEFAULT '',
  temp_password boolean DEFAULT false,
  password_last_changed timestamptz,
  account_status text DEFAULT 'active',
  account_locked boolean DEFAULT false,
  failed_login_attempts integer DEFAULT 0,
  last_login timestamptz,
  last_failed_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE teacher_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_accounts' AND policyname = 'Teacher accounts readable by all') THEN
    CREATE POLICY "Teacher accounts readable by all" ON teacher_accounts FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_accounts' AND policyname = 'Teacher accounts insertable by all') THEN
    CREATE POLICY "Teacher accounts insertable by all" ON teacher_accounts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_accounts' AND policyname = 'Teacher accounts updatable by all') THEN
    CREATE POLICY "Teacher accounts updatable by all" ON teacher_accounts FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text DEFAULT '',
  role text DEFAULT 'admin',
  is_active boolean DEFAULT true,
  two_factor_enabled boolean DEFAULT false,
  two_factor_secret text,
  last_login timestamptz,
  failed_login_attempts integer DEFAULT 0,
  account_locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Admin users readable by all') THEN
    CREATE POLICY "Admin users readable by all" ON admin_users FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Admin users updatable by all') THEN
    CREATE POLICY "Admin users updatable by all" ON admin_users FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Admin audit logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  target_type text DEFAULT '',
  target_id text DEFAULT '',
  details jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_logs' AND policyname = 'Audit logs readable by all') THEN
    CREATE POLICY "Audit logs readable by all" ON admin_audit_logs FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_audit_logs' AND policyname = 'Audit logs insertable by all') THEN
    CREATE POLICY "Audit logs insertable by all" ON admin_audit_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES admin_users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  ip_address inet,
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_sessions' AND policyname = 'Admin sessions readable by all') THEN
    CREATE POLICY "Admin sessions readable by all" ON admin_sessions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_sessions' AND policyname = 'Admin sessions insertable by all') THEN
    CREATE POLICY "Admin sessions insertable by all" ON admin_sessions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_sessions' AND policyname = 'Admin sessions deletable by all') THEN
    CREATE POLICY "Admin sessions deletable by all" ON admin_sessions FOR DELETE USING (true);
  END IF;
END $$;

-- Teacher sessions
CREATE TABLE IF NOT EXISTS teacher_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_username text NOT NULL,
  session_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  ip_address inet,
  user_agent text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teacher_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_sessions' AND policyname = 'Teacher sessions readable by all') THEN
    CREATE POLICY "Teacher sessions readable by all" ON teacher_sessions FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_sessions' AND policyname = 'Teacher sessions insertable by all') THEN
    CREATE POLICY "Teacher sessions insertable by all" ON teacher_sessions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'teacher_sessions' AND policyname = 'Teacher sessions deletable by all') THEN
    CREATE POLICY "Teacher sessions deletable by all" ON teacher_sessions FOR DELETE USING (true);
  END IF;
END $$;

-- Password reset requests
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_username text NOT NULL,
  reset_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'password_reset_requests' AND policyname = 'Password reset readable by all') THEN
    CREATE POLICY "Password reset readable by all" ON password_reset_requests FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'password_reset_requests' AND policyname = 'Password reset insertable by all') THEN
    CREATE POLICY "Password reset insertable by all" ON password_reset_requests FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- School districts
CREATE TABLE IF NOT EXISTS school_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  state text DEFAULT 'CA',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE school_districts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'school_districts' AND policyname = 'Districts readable by all') THEN
    CREATE POLICY "Districts readable by all" ON school_districts FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'school_districts' AND policyname = 'Districts insertable by all') THEN
    CREATE POLICY "Districts insertable by all" ON school_districts FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'school_districts' AND policyname = 'Districts updatable by all') THEN
    CREATE POLICY "Districts updatable by all" ON school_districts FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Analytics error logs
CREATE TABLE IF NOT EXISTS analytics_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_username text,
  error_type text DEFAULT '',
  error_message text DEFAULT '',
  error_details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_error_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_error_logs' AND policyname = 'Error logs readable by all') THEN
    CREATE POLICY "Error logs readable by all" ON analytics_error_logs FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_error_logs' AND policyname = 'Error logs insertable by all') THEN
    CREATE POLICY "Error logs insertable by all" ON analytics_error_logs FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_accounts_username ON teacher_accounts(username);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_token ON teacher_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher ON teacher_sessions(teacher_username);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_school_districts_code ON school_districts(code);
