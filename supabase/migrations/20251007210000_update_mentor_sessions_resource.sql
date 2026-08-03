/*
  # Update Mentor Sessions Table - Resource Used Field

  ## Changes
  - Rename `used_lesson_plan` (boolean) to `resource_used` (text)
  - Update the field to store 'lesson_plan' or 'curriculum' as text values
  - Makes curriculum feedback optional instead of required

  ## Migration Strategy
  1. Add new `resource_used` column
  2. Migrate existing data (true → 'lesson_plan', false → 'curriculum')
  3. Drop old `used_lesson_plan` column
*/

-- Add new resource_used column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentor_sessions' AND column_name = 'resource_used'
  ) THEN
    ALTER TABLE mentor_sessions ADD COLUMN resource_used text;
  END IF;
END $$;

-- Migrate existing data
UPDATE mentor_sessions
SET resource_used = CASE
  WHEN used_lesson_plan = true THEN 'lesson_plan'
  WHEN used_lesson_plan = false THEN 'curriculum'
  ELSE NULL
END
WHERE resource_used IS NULL;

-- Drop old column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentor_sessions' AND column_name = 'used_lesson_plan'
  ) THEN
    ALTER TABLE mentor_sessions DROP COLUMN used_lesson_plan;
  END IF;
END $$;

-- Add constraint to ensure valid values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mentor_sessions_resource_used_check'
  ) THEN
    ALTER TABLE mentor_sessions
    ADD CONSTRAINT mentor_sessions_resource_used_check
    CHECK (resource_used IN ('lesson_plan', 'curriculum'));
  END IF;
END $$;
