/*
  # Create function to regenerate weekly groups automatically

  1. New Functions
    - `regenerate_weekly_groups` - Automatically regenerates weekly groups for a teacher
    
  2. Purpose
    - Called automatically when new assessments are completed
    - Ensures groups stay current with latest student performance data
*/

CREATE OR REPLACE FUNCTION regenerate_weekly_groups(p_teacher_username text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  week_start_date date;
BEGIN
  -- Get current week start date
  week_start_date := date_trunc('week', CURRENT_DATE)::date;
  
  -- Delete existing groups for this week
  DELETE FROM weekly_groups 
  WHERE teacher_username = p_teacher_username 
    AND week_start_date = week_start_date;
  
  -- Note: The actual group generation logic would be handled by the frontend
  -- This function just clears existing groups so they can be regenerated
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;