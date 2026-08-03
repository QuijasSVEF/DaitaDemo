/*
  # Fix District Assignment Function
  
  1. Changes
    - Update function to handle null district_id
    - Add proper error handling
    - Maintain audit logging
    
  2. Security
    - Validate inputs
    - Track district changes
*/

-- Drop existing function
DROP FUNCTION IF EXISTS update_teacher_district(text, uuid);

-- Create improved function to update teacher's district
CREATE OR REPLACE FUNCTION update_teacher_district(
  p_username TEXT,
  p_district_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_district_id uuid;
BEGIN
  -- Verify teacher exists
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE username = p_username) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Teacher not found'
    );
  END IF;

  -- Verify district exists if not null
  IF p_district_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM school_districts WHERE id = p_district_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'District not found'
    );
  END IF;

  -- Get current district for audit log
  SELECT district_id INTO v_old_district_id
  FROM teachers
  WHERE username = p_username;

  -- Update teacher
  UPDATE teachers
  SET 
    district_id = p_district_id,
    updated_at = now()
  WHERE username = p_username;

  -- Log update
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'update_teacher_district',
    'teacher',
    p_username,
    jsonb_build_object(
      'old_district_id', v_old_district_id,
      'new_district_id', p_district_id,
      'timestamp', now()
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Teacher district updated successfully'
  );
END;
$$;

-- Update teacher list function to include district info
CREATE OR REPLACE FUNCTION get_teacher_list(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'name',
  p_sort_dir TEXT DEFAULT 'asc'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_total INTEGER;
  v_results jsonb;
BEGIN
  -- Calculate offset
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get total count first
  SELECT COUNT(*)
  INTO v_total
  FROM teachers t
  WHERE (
    p_search IS NULL OR 
    t.username ILIKE '%' || p_search || '%' OR
    t.name ILIKE '%' || p_search || '%' OR
    t.email ILIKE '%' || p_search || '%'
  );
  
  -- Build dynamic query
  WITH filtered_teachers AS (
    SELECT 
      t.username,
      t.name,
      t.email,
      t.account_status,
      t.created_at,
      t.last_login,
      t.temp_password,
      t.account_locked,
      t.failed_login_attempts,
      t.login_count,
      t.temp_plaintext_password,
      t.district_id,
      d.name as district_name,
      d.code as district_code
    FROM teachers t
    LEFT JOIN school_districts d ON d.id = t.district_id
    WHERE (
      p_search IS NULL OR 
      t.username ILIKE '%' || p_search || '%' OR
      t.name ILIKE '%' || p_search || '%' OR
      t.email ILIKE '%' || p_search || '%'
    )
  )
  SELECT 
    jsonb_build_object(
      'total', v_total,
      'page', p_page,
      'page_size', p_page_size,
      'data', (
        SELECT jsonb_agg(t.*)
        FROM (
          SELECT *
          FROM filtered_teachers
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
          LIMIT p_page_size
          OFFSET v_offset
        ) t
      )
    ) INTO v_results;

  RETURN v_results;
END;
$$;