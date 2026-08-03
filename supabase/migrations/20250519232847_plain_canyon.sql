/*
  # Add get_coaches_with_assignments function
  
  1. New Function
    - Creates a function to retrieve coach data with their teacher assignment counts
    - Returns coach information including:
      - coach_id
      - coach_email
      - coach_name
      - last_login
      - account_locked
      - assigned_teachers_count
  
  2. Security
    - Function is accessible to authenticated users only
*/

CREATE OR REPLACE FUNCTION public.get_coaches_with_assignments()
RETURNS TABLE (
  coach_id uuid,
  coach_email text,
  coach_name text,
  last_login timestamptz,
  account_locked boolean,
  assigned_teachers_count bigint
) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id as coach_id,
    c.email as coach_email,
    c.full_name as coach_name,
    c.last_login,
    c.account_locked,
    COUNT(cta.teacher_username) as assigned_teachers_count
  FROM coaches c
  LEFT JOIN coach_teacher_assignments cta ON c.id = cta.coach_id
  GROUP BY c.id, c.email, c.full_name, c.last_login, c.account_locked
  ORDER BY c.full_name ASC;
$$;