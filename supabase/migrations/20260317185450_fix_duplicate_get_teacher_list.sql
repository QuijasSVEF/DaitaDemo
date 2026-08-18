/*
  # Fix duplicate get_teacher_list functions

  1. Problem
    - Two versions of `get_teacher_list` exist with different parameter orders, causing ambiguity errors
    - The old version has params: (p_page, p_page_size, p_search, p_sort_by, p_sort_dir, p_district_id)
    - The new version has params: (p_page, p_page_size, p_search, p_district_id, p_sort_by, p_sort_dir)

  2. Fix
    - Drop both existing overloads
    - Recreate a single clean version with consistent parameter order
    - Handle empty string search terms properly (treat '' as no filter)
*/

-- Drop the old version (page_size default 20, district_id last)
DROP FUNCTION IF EXISTS get_teacher_list(integer, integer, text, text, text, uuid);

-- Drop the new version (page_size default 25, district_id in middle)
DROP FUNCTION IF EXISTS get_teacher_list(integer, integer, text, uuid, text, text);

-- Recreate a single version
CREATE OR REPLACE FUNCTION get_teacher_list(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20,
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
  v_search text;
BEGIN
  v_offset := (p_page - 1) * p_page_size;
  v_search := NULLIF(TRIM(COALESCE(p_search, '')), '');

  SELECT COUNT(*) INTO v_total
  FROM teachers t
  WHERE (v_search IS NULL OR t.username ILIKE '%' || v_search || '%' OR t.name ILIKE '%' || v_search || '%' OR t.email ILIKE '%' || v_search || '%')
    AND (p_district_id IS NULL OR t.district_id = p_district_id);

  WITH filtered_teachers AS (
    SELECT
      t.username, t.name, t.email, t.account_status, t.created_at, t.last_login,
      t.temp_password, t.account_locked, t.failed_login_attempts, t.login_count,
      t.plaintext_password, t.district_id,
      d.name as district_name, d.code as district_code
    FROM teachers t
    LEFT JOIN school_districts d ON d.id = t.district_id
    WHERE (v_search IS NULL OR t.username ILIKE '%' || v_search || '%' OR t.name ILIKE '%' || v_search || '%' OR t.email ILIKE '%' || v_search || '%')
      AND (p_district_id IS NULL OR t.district_id = p_district_id)
  )
  SELECT jsonb_build_object(
    'total', v_total,
    'page', p_page,
    'page_size', p_page_size,
    'data', COALESCE((
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
    ), '[]'::jsonb)
  ) INTO v_results;

  RETURN v_results;
END;
$$;
