/*
  # Fix Bulk Import and District Filtering
  
  1. Changes
    - Fix bulk_import_teachers function to properly return JSON array results
    - Update get_teacher_list function to support district filtering
    - Add proper error handling for district validation
    
  2. Features
    - Proper district filtering in teacher list
    - Improved bulk import error handling
    - Better JSON response formatting
*/

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS bulk_import_teachers(jsonb);
DROP FUNCTION IF EXISTS get_teacher_list(integer, integer, text, text, text);

-- Function to import multiple teachers at once with improved validation
CREATE OR REPLACE FUNCTION bulk_import_teachers(
  p_teachers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher jsonb;
  v_username text;
  v_email text;
  v_full_name text;
  v_password text;
  v_district_code text;
  v_district_id uuid;
  v_password_hash text;
  v_results jsonb[] := '{}';
  v_success_count integer := 0;
  v_error_count integer := 0;
BEGIN
  -- Process each teacher
  FOR v_teacher IN SELECT * FROM jsonb_array_elements(p_teachers)
  LOOP
    BEGIN
      -- Extract teacher data
      v_username := trim(v_teacher->>'username');
      v_email := trim(v_teacher->>'email');
      v_full_name := trim(v_teacher->>'fullName');
      v_password := trim(v_teacher->>'password');
      v_district_code := trim(v_teacher->>'districtCode');
      
      -- Validate required fields
      IF v_username IS NULL OR v_username = '' THEN
        v_results := array_append(v_results, jsonb_build_object(
          'success', false,
          'username', COALESCE(v_username, 'Unknown'),
          'message', 'Username is required'
        ));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      IF v_email IS NULL OR v_email = '' THEN
        v_results := array_append(v_results, jsonb_build_object(
          'success', false,
          'username', v_username,
          'message', 'Email is required'
        ));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      IF v_full_name IS NULL OR v_full_name = '' THEN
        v_results := array_append(v_results, jsonb_build_object(
          'success', false,
          'username', v_username,
          'message', 'Full Name is required'
        ));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      IF v_password IS NULL OR v_password = '' THEN
        v_results := array_append(v_results, jsonb_build_object(
          'success', false,
          'username', v_username,
          'message', 'Password is required'
        ));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      -- Check if username already exists
      IF EXISTS (SELECT 1 FROM teachers WHERE username = v_username) THEN
        v_results := array_append(v_results, jsonb_build_object(
          'success', false,
          'username', v_username,
          'message', 'Username already exists'
        ));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      -- Check if email already exists
      IF EXISTS (SELECT 1 FROM teachers WHERE email = v_email) THEN
        v_results := array_append(v_results, jsonb_build_object(
          'success', false,
          'username', v_username,
          'message', 'Email already exists'
        ));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      -- Validate password complexity
      IF length(v_password) < 8 THEN
        v_results := array_append(v_results, jsonb_build_object(
          'success', false,
          'username', v_username,
          'message', 'Password must be at least 8 characters'
        ));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      IF v_password !~ '[A-Z]' OR v_password !~ '[0-9]' OR v_password !~ '[!@#$%^&*]' THEN
        v_results := array_append(v_results, jsonb_build_object(
          'success', false,
          'username', v_username,
          'message', 'Password must contain at least one uppercase letter, one number, and one special character'
        ));
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;
      
      -- Find or create district
      v_district_id := NULL;
      IF v_district_code IS NOT NULL AND v_district_code != '' THEN
        -- Try to find existing district
        SELECT id INTO v_district_id
        FROM school_districts
        WHERE code = v_district_code;
        
        -- Create new district if not found
        IF v_district_id IS NULL THEN
          INSERT INTO school_districts (name, code, created_by)
          VALUES (v_district_code, v_district_code, auth.uid())
          RETURNING id INTO v_district_id;
        END IF;
      END IF;
      
      -- Hash the password
      v_password_hash := crypt(v_password, gen_salt('bf'));
      
      -- Create teacher record
      INSERT INTO teachers (
        username,
        name,
        email,
        password_hash,
        temp_password,
        temp_plaintext_password,
        plaintext_password,
        account_status,
        district_id
      ) VALUES (
        v_username,
        v_full_name,
        v_email,
        v_password_hash,
        false,
        v_password,
        v_password,
        'active',
        v_district_id
      );
      
      -- Log the account creation
      INSERT INTO admin_audit_logs (
        admin_id,
        action,
        target_type,
        target_id,
        details,
        ip_address
      ) VALUES (
        auth.uid(),
        'bulk_create_account',
        'teacher',
        v_username,
        jsonb_build_object(
          'timestamp', now(),
          'email', v_email,
          'district_code', v_district_code
        ),
        inet_client_addr()
      );
      
      v_results := array_append(v_results, jsonb_build_object(
        'success', true,
        'username', v_username,
        'message', 'Account created successfully'
      ));
      v_success_count := v_success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_results := array_append(v_results, jsonb_build_object(
        'success', false,
        'username', COALESCE(v_username, 'Unknown'),
        'message', SQLERRM
      ));
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  -- Return results as a proper JSON array
  RETURN jsonb_build_object(
    'success', v_error_count = 0,
    'total', v_success_count + v_error_count,
    'success_count', v_success_count,
    'error_count', v_error_count,
    'results', to_jsonb(v_results)
  );
END;
$$;

-- Create improved teacher list function with district filtering
CREATE OR REPLACE FUNCTION get_teacher_list(
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20,
  p_search TEXT DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'name',
  p_sort_dir TEXT DEFAULT 'asc',
  p_district_id UUID DEFAULT NULL
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
  
  -- Get total count first with district filter
  SELECT COUNT(*)
  INTO v_total
  FROM teachers t
  WHERE (
    p_search IS NULL OR 
    t.username ILIKE '%' || p_search || '%' OR
    t.name ILIKE '%' || p_search || '%' OR
    t.email ILIKE '%' || p_search || '%'
  )
  AND (p_district_id IS NULL OR t.district_id = p_district_id);
  
  -- Build dynamic query with district filter
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
    AND (p_district_id IS NULL OR t.district_id = p_district_id)
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
                WHEN 'district_name' THEN COALESCE(district_name, 'ZZZZZZZZ')
                WHEN 'account_status' THEN account_status
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
                WHEN 'district_name' THEN COALESCE(district_name, 'AAAAAAAA')
                WHEN 'account_status' THEN account_status
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