/*
  # Add missing columns across multiple tables

  1. Modified Tables
    - `quiz_templates`: Add `show_answers` boolean column (default true)
    - `weekly_groups`: Add `recommended_approach` text column
    - `classroom_analytics`: Add `total_students`, `average_score`, `total_assessments`, `struggle_areas`, `insights`, `recommendations` columns
    - `lesson_plans`: Add `unique_id` uuid column

  2. Notes
    - These columns are referenced by application code but were missing from the database
    - All columns are nullable or have defaults to avoid breaking existing data
    - The `weekly_groups` table already has `week_start` / `week_end`; code references `week_start_date` which will be fixed in application code
*/

-- 1. Add show_answers to quiz_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_templates' AND column_name = 'show_answers'
  ) THEN
    ALTER TABLE quiz_templates ADD COLUMN show_answers boolean DEFAULT true;
  END IF;
END $$;

-- 2. Add recommended_approach to weekly_groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_groups' AND column_name = 'recommended_approach'
  ) THEN
    ALTER TABLE weekly_groups ADD COLUMN recommended_approach text DEFAULT '';
  END IF;
END $$;

-- 3. Add missing columns to classroom_analytics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classroom_analytics' AND column_name = 'total_students'
  ) THEN
    ALTER TABLE classroom_analytics ADD COLUMN total_students integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classroom_analytics' AND column_name = 'average_score'
  ) THEN
    ALTER TABLE classroom_analytics ADD COLUMN average_score numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classroom_analytics' AND column_name = 'total_assessments'
  ) THEN
    ALTER TABLE classroom_analytics ADD COLUMN total_assessments integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classroom_analytics' AND column_name = 'struggle_areas'
  ) THEN
    ALTER TABLE classroom_analytics ADD COLUMN struggle_areas jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classroom_analytics' AND column_name = 'insights'
  ) THEN
    ALTER TABLE classroom_analytics ADD COLUMN insights jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'classroom_analytics' AND column_name = 'recommendations'
  ) THEN
    ALTER TABLE classroom_analytics ADD COLUMN recommendations jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 4. Add unique_id to lesson_plans
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_plans' AND column_name = 'unique_id'
  ) THEN
    ALTER TABLE lesson_plans ADD COLUMN unique_id uuid DEFAULT gen_random_uuid();
  END IF;
END $$;
