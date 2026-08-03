/*
  # Add JSON columns to lesson_plans table
  
  1. Changes
    - Add detailed_activities column (JSONB)
    - Add aligned_standards column (JSONB)
    - Add dok_levels column (JSONB)
    
  2. Purpose
    - Support storing detailed activity information for lesson plans
    - Enable standards alignment tracking
    - Store Depth of Knowledge levels for different lesson sections
*/

ALTER TABLE lesson_plans 
ADD COLUMN IF NOT EXISTS detailed_activities JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS aligned_standards JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS dok_levels JSONB DEFAULT jsonb_build_object(
  'engagement', 1,
  'representation', 2,
  'action_expression', 3,
  'wrapup', 2
);

-- Update the Database type definitions
DO $$ BEGIN
  -- Verify the columns were added successfully
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'lesson_plans' 
    AND column_name = 'detailed_activities'
  ) THEN
    RAISE EXCEPTION 'Failed to add detailed_activities column';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'lesson_plans' 
    AND column_name = 'aligned_standards'
  ) THEN
    RAISE EXCEPTION 'Failed to add aligned_standards column';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'lesson_plans' 
    AND column_name = 'dok_levels'
  ) THEN
    RAISE EXCEPTION 'Failed to add dok_levels column';
  END IF;
END $$;