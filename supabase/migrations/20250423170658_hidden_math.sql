/*
  # Fix Admin Portal Functions
  
  1. Changes
    - Fix timestamp column name conflict
    - Maintain all existing functionality
    - Keep security and audit features
*/

-- Function to get filtered teacher list with search
CREATE OR REPLACE FUNCTION get_teacher_list(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_dir TEXT DEFAULT 'desc'
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
      t.login_count
    FROM teachers t
    WHERE (
      p_search IS NULL OR 
      t.username ILIKE '%' || p_search || '%' OR
      t.name ILIKE '%' || p_search || '%' OR
      t.email ILIKE '%' || p_search || '%'
    )
    AND (p_status IS NULL OR t.account_status = p_status)
    AND (p_date_from IS NULL OR t.created_at >= p_date_from)
    AND (p_date_to IS NULL OR t.created_at <= p_date_to)
  )
  SELECT 
    jsonb_build_object(
      'total', (SELECT COUNT(*) FROM filtered_teachers),
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
                WHEN 'last_login' THEN last_login::text
                ELSE created_at::text
              END
            END ASC,
            CASE WHEN p_sort_dir = 'desc' THEN
              CASE p_sort_by
                WHEN 'username' THEN username
                WHEN 'name' THEN name
                WHEN 'email' THEN email
                WHEN 'created_at' THEN created_at::text
                WHEN 'last_login' THEN last_login::text
                ELSE created_at::text
              END
            END DESC
          LIMIT p_page_size
          OFFSET v_offset
        ) t
      )
    ) INTO v_results;

  RETURN v_results;
END;
$$;

-- Function to get teacher audit logs including password history
CREATE OR REPLACE FUNCTION get_teacher_audit_logs(
  p_username TEXT,
  p_from_date TIMESTAMPTZ DEFAULT NULL,
  p_to_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  action TEXT,
  event_time TIMESTAMPTZ,
  details jsonb,
  ip_address INET
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.action,
    l.created_at as event_time,
    l.details,
    l.ip_address
  FROM admin_audit_logs l
  WHERE l.target_id = p_username
  AND (p_from_date IS NULL OR l.created_at >= p_from_date)
  AND (p_to_date IS NULL OR l.created_at <= p_to_date)
  ORDER BY l.created_at DESC;
END;
$$;

-- Function to get admin dashboard statistics
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_teachers', (SELECT COUNT(*) FROM teachers),
    'active_teachers', (SELECT COUNT(*) FROM teachers WHERE account_status = 'active'),
    'locked_accounts', (SELECT COUNT(*) FROM teachers WHERE account_locked = true),
    'temp_passwords', (SELECT COUNT(*) FROM teachers WHERE temp_password = true),
    'recent_logins', (
      SELECT COUNT(*)
      FROM teachers
      WHERE last_login >= NOW() - INTERVAL '24 hours'
    ),
    'failed_attempts', (
      SELECT COUNT(*)
      FROM teachers
      WHERE failed_login_attempts > 0
    )
  ) INTO v_stats;

  -- Log stats access
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'view_stats',
    'admin',
    'dashboard',
    v_stats,
    inet_client_addr()
  );

  RETURN v_stats;
END;
$$;