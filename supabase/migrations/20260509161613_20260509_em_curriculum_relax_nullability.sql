/*
  # Relax NOT NULL constraints on EM curriculum text fields

  Some CSV rows have empty/absent overview or description values.
  This migration allows those fields to be NULL (or defaults to '') so seed
  inserts do not fail. No data is dropped.

  1. Changes
    - em_levels.overview, em_levels.description -> NULL allowed
    - em_modules.overview -> NULL allowed
    - em_subtopics.overview -> NULL allowed
*/

ALTER TABLE em_levels ALTER COLUMN overview DROP NOT NULL;
ALTER TABLE em_levels ALTER COLUMN description DROP NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='em_modules' AND column_name='overview' AND is_nullable='NO') THEN
    ALTER TABLE em_modules ALTER COLUMN overview DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='em_subtopics' AND column_name='overview' AND is_nullable='NO') THEN
    ALTER TABLE em_subtopics ALTER COLUMN overview DROP NOT NULL;
  END IF;
END $$;
