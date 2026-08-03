/*
  # Add detailed_activities column to lesson_plans table

  1. Changes
    - Add `detailed_activities` column of type JSONB to `lesson_plans` table
    - Set default value to NULL to allow optional activities
    - Add validation check to ensure JSONB type

  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Adds type validation to ensure data integrity
*/

DO $$ 
BEGIN
  -- Add detailed_activities column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'lesson_plans' 
    AND column_name = 'detailed_activities'
  ) THEN
    ALTER TABLE lesson_plans
    ADD COLUMN detailed_activities JSONB DEFAULT NULL;

    -- Add constraint to ensure valid JSONB
    ALTER TABLE lesson_plans
    ADD CONSTRAINT lesson_plans_detailed_activities_check
    CHECK (detailed_activities IS NULL OR jsonb_typeof(detailed_activities) IN ('object', 'array'));
  END IF;
END $$;