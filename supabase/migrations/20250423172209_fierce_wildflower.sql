/*
  # Fix Teacher List Function
  
  1. Changes
    - Simplify get_teacher_list function parameters
    - Fix search functionality
    - Improve sorting
    - Add proper pagination
    
  2. Features
    - Case-insensitive search
    - Multiple field search
    - Efficient sorting
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS get_teacher_list(text, text, timestamptz, timestamptz, integer, integer, text, text);

-- Create simplified teacher list function
CREATE OR REPLACE FUNCTION get_teacher_list(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10,
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
  )
  SELECT 
    jsonb_build_object(
      'total', (SELECT COUNT(*) FROM filtered_teachers),
      'page', p_page,
      'page_size', p_page_size,
      'data', (
        SELECT jsonb_agg(t.*)
        FROM (
          SELECT *
          FROM filtered_teachers
          ORDER BY 
            CASE 
              WHEN p_sort_by = 'username' AND p_sort_dir = 'asc' THEN username
              WHEN p_sort_by = 'username' AND p_sort_dir = 'desc' THEN username
              WHEN p_sort_by = 'name' AND p_sort_dir = 'asc' THEN name
              WHEN p_sort_by = 'name' AND p_sort_dir = 'desc' THEN name
              WHEN p_sort_by = 'email' AND p_sort_dir = 'asc' THEN email
              WHEN p_sort_by = 'email' AND p_sort_dir = 'desc' THEN email
              WHEN p_sort_by = 'last_login' AND p_sort_dir = 'asc' THEN last_login::text
              WHEN p_sort_by = 'last_login' AND p_sort_dir = 'desc' THEN last_login::text
              ELSE name
            END
          LIMIT p_page_size
          OFFSET v_offset
        ) t
      )
    ) INTO v_results;

  RETURN v_results;
END;
$$;