/*
  # Fix Teacher List Pagination
  
  1. Changes
    - Improve pagination handling
    - Add total count to response
    - Fix sorting logic
    - Remove unnecessary filtering
    
  2. Features
    - Proper server-side pagination
    - Accurate total count
    - Efficient sorting
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS get_teacher_list(text, text, timestamptz, timestamptz, integer, integer, text, text);
DROP FUNCTION IF EXISTS get_teacher_list(integer, integer, text, text, text);

-- Create improved teacher list function
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
      t.temp_plaintext_password
    FROM teachers t
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