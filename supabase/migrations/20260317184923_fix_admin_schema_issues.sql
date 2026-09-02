/*
  # Fix Admin Portal Schema Issues

  1. Schema Changes
    - Add missing `created_by` column to `school_districts` table
    - Add foreign key from `teachers.district_id` to `school_districts.id`
    - Add foreign key from `admin_audit_logs.admin_id` to `admin_users.id`

  2. Function Fixes
    - Replace `get_teacher_list` RPC to remove reference to non-existent `temp_plaintext_password` column
    - Create `get_system_analytics` RPC for the admin analytics dashboard

  3. Notes
    - The `get_teacher_list` function referenced `t.temp_plaintext_password` which does not exist; replaced with `t.plaintext_password`
    - The `create_school_district` function inserts into `created_by` column which was missing from the table
    - Foreign keys are needed for PostgREST relationship queries used in SystemAnalytics
*/

-- 1. Add missing created_by column to school_districts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'school_districts' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE school_districts ADD COLUMN created_by uuid;
  END IF;
END $$;

-- 2. Add FK from teachers.district_id to school_districts.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'teachers'
      AND kcu.column_name = 'district_id'
  ) THEN
    ALTER TABLE teachers
      ADD CONSTRAINT fk_teachers_district
      FOREIGN KEY (district_id) REFERENCES school_districts(id);
  END IF;
END $$;

-- 3. Add FK from admin_audit_logs.admin_id to admin_users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'admin_audit_logs'
      AND kcu.column_name = 'admin_id'
  ) THEN
    ALTER TABLE admin_audit_logs
      ADD CONSTRAINT fk_audit_logs_admin
      FOREIGN KEY (admin_id) REFERENCES admin_users(id);
  END IF;
END $$;

-- 4. Fix get_teacher_list to use correct column name
CREATE OR REPLACE FUNCTION get_teacher_list(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_search text DEFAULT NULL,
  p_district_id uuid DEFAULT NULL,
  p_sort_by text DEFAULT 'name',
  p_sort_dir text DEFAULT 'asc'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_results jsonb;
BEGIN
  v_offset := (p_page - 1) * p_page_size;

  SELECT COUNT(*) INTO v_total
  FROM teachers t
  WHERE (p_search IS NULL OR t.username ILIKE '%' || p_search || '%' OR t.name ILIKE '%' || p_search || '%' OR t.email ILIKE '%' || p_search || '%')
    AND (p_district_id IS NULL OR t.district_id = p_district_id);

  WITH filtered_teachers AS (
    SELECT
      t.username, t.name, t.email, t.account_status, t.created_at, t.last_login,
      t.temp_password, t.account_locked, t.failed_login_attempts, t.login_count,
      t.plaintext_password, t.district_id,
      d.name as district_name, d.code as district_code
    FROM teachers t
    LEFT JOIN school_districts d ON d.id = t.district_id
    WHERE (p_search IS NULL OR t.username ILIKE '%' || p_search || '%' OR t.name ILIKE '%' || p_search || '%' OR t.email ILIKE '%' || p_search || '%')
      AND (p_district_id IS NULL OR t.district_id = p_district_id)
  )
  SELECT jsonb_build_object(
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'data', (
      SELECT jsonb_agg(t.*)
      FROM (
        SELECT * FROM filtered_teachers
        ORDER BY
          CASE WHEN p_sort_dir = 'asc' THEN
            CASE p_sort_by
              WHEN 'username' THEN username
              WHEN 'name' THEN name
              WHEN 'email' THEN email
              WHEN 'created_at' THEN created_at::text
              WHEN 'last_login' THEN COALESCE(last_login::text, '1970-01-01')
              ELSE name
            END
          END ASC NULLS LAST,
          CASE WHEN p_sort_dir = 'desc' THEN
            CASE p_sort_by
              WHEN 'username' THEN username
              WHEN 'name' THEN name
              WHEN 'email' THEN email
              WHEN 'created_at' THEN created_at::text
              WHEN 'last_login' THEN COALESCE(last_login::text, '9999-12-31')
              ELSE name
            END
          END DESC NULLS LAST
        LIMIT p_page_size OFFSET v_offset
      ) t
    )
  ) INTO v_results;

  RETURN v_results;
END;
$$;

-- 5. Create get_system_analytics function
CREATE OR REPLACE FUNCTION get_system_analytics(p_district_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_total_teachers bigint;
  v_total_students bigint;
  v_total_assessments bigint;
  v_total_lessons bigint;
  v_active_teachers bigint;
  v_locked_accounts bigint;
BEGIN
  SELECT COUNT(*) INTO v_total_teachers
  FROM teachers
  WHERE (p_district_id IS NULL OR district_id = p_district_id);

  SELECT COUNT(DISTINCT student_id) INTO v_total_students
  FROM quiz_attempts qa
  JOIN teachers t ON t.username = qa.teacher_username
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id);

  SELECT COUNT(*) INTO v_total_assessments
  FROM quiz_attempts qa
  JOIN teachers t ON t.username = qa.teacher_username
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id);

  SELECT COUNT(*) INTO v_total_lessons
  FROM lesson_plans lp
  JOIN teachers t ON t.username = lp.teacher_username
  WHERE (p_district_id IS NULL OR t.district_id = p_district_id);

  SELECT COUNT(*) INTO v_active_teachers
  FROM teachers
  WHERE account_status = 'active'
    AND (p_district_id IS NULL OR district_id = p_district_id);

  SELECT COUNT(*) INTO v_locked_accounts
  FROM teachers
  WHERE account_locked = true
    AND (p_district_id IS NULL OR district_id = p_district_id);

  RETURN jsonb_build_object(
    'total_teachers', v_total_teachers,
    'total_students', v_total_students,
    'total_assessments', v_total_assessments,
    'total_lessons', v_total_lessons,
    'active_teachers', v_active_teachers,
    'locked_accounts', v_locked_accounts
  );
END;
$$;
