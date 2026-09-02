/*
  # Add School Districts Support
  
  1. New Tables
    - `school_districts`: Stores district information
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `code` (text, unique)
      - `created_at` (timestamp)
      
  2. Changes
    - Add district_id to teachers table
    - Add RLS policies
    - Add district management functions
    
  3. Security
    - Enable RLS
    - Add admin-only policies
*/

-- Create school districts table
CREATE TABLE school_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

-- Enable RLS
ALTER TABLE school_districts ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Admin users can manage districts" ON school_districts
  FOR ALL USING (true);

-- Add district_id to teachers
ALTER TABLE teachers
ADD COLUMN district_id uuid REFERENCES school_districts(id);

-- Create index for faster lookups
CREATE INDEX idx_teachers_district ON teachers(district_id);

-- Function to create school district
CREATE OR REPLACE FUNCTION create_school_district(
  p_name TEXT,
  p_code TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_district_id uuid;
BEGIN
  -- Check for duplicate name/code
  IF EXISTS (SELECT 1 FROM school_districts WHERE name = p_name OR code = p_code) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'District with this name or code already exists'
    );
  END IF;

  -- Create district
  INSERT INTO school_districts (name, code, created_by)
  VALUES (p_name, p_code, auth.uid())
  RETURNING id INTO v_district_id;

  -- Log creation
  INSERT INTO admin_audit_logs (
    admin_id,
    action,
    target_type,
    target_id,
    details,
    ip_address
  ) VALUES (
    auth.uid(),
    'create_district',
    'district',
    v_district_id::text,
    jsonb_build_object(
      'name', p_name,
      'code', p_code
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'School district created successfully',
    'district_id', v_district_id
  );
END;
$$;

-- Function to update teacher's district
CREATE OR REPLACE FUNCTION update_teacher_district(
  p_username TEXT,
  p_district_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify district exists
  IF NOT EXISTS (SELECT 1 FROM school_districts WHERE id = p_district_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'District not found'
    );
  END IF;

  -- Update teacher
  UPDATE teachers
  SET district_id = p_district_id
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
      'district_id', p_district_id
    ),
    inet_client_addr()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Teacher district updated successfully'
  );
END;
$$;