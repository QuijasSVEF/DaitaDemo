-- Add detailed_activities column if it doesn't exist
DO $$ 
BEGIN
  -- Add detailed_activities column
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

-- Update existing lesson plans to have empty detailed_activities if null
UPDATE lesson_plans
SET detailed_activities = '{}'::jsonb
WHERE detailed_activities IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN lesson_plans.detailed_activities IS 'Stores detailed activity information for each section of the lesson plan';