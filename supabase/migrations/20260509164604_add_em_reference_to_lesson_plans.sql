/*
  # Add EM curriculum reference to lesson_plans

  1. Changes
    - Add `em_reference` (text) to `lesson_plans` to store a human-readable
      Elevate Math citation, e.g. "EM 5, Module 2: Fractions — Adding & Subtracting with Unlike Denominators".
    - Nullable; no backfill. Legacy lesson plans without an EM reference continue to work.

  2. Security
    - No RLS changes. Existing policies on `lesson_plans` continue to apply.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'lesson_plans'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_plans' AND column_name = 'em_reference'
  ) THEN
    ALTER TABLE public.lesson_plans ADD COLUMN em_reference text;
  END IF;
END $$;