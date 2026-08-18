/*
  # Add resource_url column to em_templates

  1. Modified Tables
    - `em_templates`
      - Add `resource_url` (text, nullable) for linking template activities to external resources

  2. Notes
    - This column stores optional URLs for template activities (e.g., Math Talk folders, Growth Mindset spreadsheets)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'em_templates' AND column_name = 'resource_url'
  ) THEN
    ALTER TABLE em_templates ADD COLUMN resource_url text;
  END IF;
END $$;
