/*
  # Add title and category columns to coach_notes

  1. Modified Tables
    - `coach_notes`
      - Add `title` (text, nullable, default '') - short title for the note
      - Add `category` (text, nullable, default 'general') - categorization of the note

  2. Notes
    - These columns were expected by the frontend but missing from the table
    - Adding them fixes the 400 error when querying coach_notes
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coach_notes' AND column_name = 'title'
  ) THEN
    ALTER TABLE coach_notes ADD COLUMN title text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coach_notes' AND column_name = 'category'
  ) THEN
    ALTER TABLE coach_notes ADD COLUMN category text DEFAULT 'general';
  END IF;
END $$;
