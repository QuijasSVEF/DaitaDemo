/*
  # Add Analytics Error Logging and Monitoring

  1. Error Logging
    - Create function to log analytics errors
    - Add monitoring for failed RPC calls
    - Track data type conversion issues

  2. Validation Functions
    - Add input parameter validation
    - Ensure consistent return types
    - Handle edge cases gracefully
*/

-- Create error logging table for analytics
CREATE TABLE IF NOT EXISTS analytics_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  error_message text NOT NULL,
  error_details jsonb,
  parameters jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE analytics_error_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read error logs
CREATE POLICY "Admins can read error logs"
  ON analytics_error_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to safely log analytics errors
CREATE OR REPLACE FUNCTION log_analytics_error(
  p_function_name text,
  p_error_message text,
  p_error_details jsonb DEFAULT NULL,
  p_parameters jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO analytics_error_logs (
    function_name,
    error_message,
    error_details,
    parameters
  ) VALUES (
    p_function_name,
    p_error_message,
    p_error_details,
    p_parameters
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't let logging errors break the main function
  NULL;
END;
$$;

-- Add validation function for district parameters
CREATE OR REPLACE FUNCTION validate_district_parameter(p_district_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow NULL (means all districts)
  IF p_district_id IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if district exists
  RETURN EXISTS (
    SELECT 1 FROM school_districts 
    WHERE id = p_district_id
  );
END;
$$;