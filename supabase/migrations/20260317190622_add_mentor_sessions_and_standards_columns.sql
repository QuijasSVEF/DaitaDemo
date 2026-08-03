/*
  # Add missing columns for mentor_sessions and standards_alignments

  1. Modified Tables
    - `mentor_sessions`: Add `used_lesson_plan` boolean column (derived from resource_used)
    - `standards_alignments`: Add `teacher_username`, `student_id`, `struggle_area` columns

  2. Notes
    - mentor_sessions code references `used_lesson_plan` but the table has `resource_used`
    - standards_alignments export code references teacher_username, student_id, struggle_area
    - Adding columns keeps existing data intact
*/

-- 1. Add used_lesson_plan to mentor_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mentor_sessions' AND column_name = 'used_lesson_plan'
  ) THEN
    ALTER TABLE mentor_sessions ADD COLUMN used_lesson_plan boolean DEFAULT false;
  END IF;
END $$;

-- 2. Add teacher_username to standards_alignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'standards_alignments' AND column_name = 'teacher_username'
  ) THEN
    ALTER TABLE standards_alignments ADD COLUMN teacher_username text DEFAULT '';
  END IF;
END $$;

-- 3. Add student_id to standards_alignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'standards_alignments' AND column_name = 'student_id'
  ) THEN
    ALTER TABLE standards_alignments ADD COLUMN student_id integer;
  END IF;
END $$;

-- 4. Add struggle_area to standards_alignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'standards_alignments' AND column_name = 'struggle_area'
  ) THEN
    ALTER TABLE standards_alignments ADD COLUMN struggle_area text DEFAULT '';
  END IF;
END $$;
