/*
  # Add unique constraint to ca_standards

  1. Changes
    - Add unique constraint on (subject, grade_level, standard_code) to support ON CONFLICT upserts
    - Required for standards data population migrations

  2. Tables Modified
    - `ca_standards` - adds unique constraint
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ca_standards_subject_grade_code_unique'
  ) THEN
    ALTER TABLE ca_standards ADD CONSTRAINT ca_standards_subject_grade_code_unique
      UNIQUE (subject, grade_level, standard_code);
  END IF;
END $$;