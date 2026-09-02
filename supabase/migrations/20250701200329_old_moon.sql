/*
  # Add get_assessments_created function

  1. New Functions
    - `get_assessments_created`: Returns the total number of assessments created by teachers
      - Takes an optional district_id parameter to filter by district
      - Returns the count of quiz templates created

  2. Purpose
    - Provides data for the admin analytics dashboard
    - Allows filtering by district for more granular reporting
*/

-- Function to get the total number of assessments created by teachers
CREATE OR REPLACE FUNCTION get_assessments_created(p_district_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_district_id IS NULL THEN
    -- Count all quiz templates
    SELECT COUNT(*)
    INTO v_count
    FROM quiz_templates;
  ELSE
    -- Count quiz templates filtered by district
    SELECT COUNT(qt.*)
    INTO v_count
    FROM quiz_templates qt
    JOIN teachers t ON qt.teacher_username = t.username
    WHERE t.district_id = p_district_id;
  END IF;
  
  RETURN v_count;
END;
$$;