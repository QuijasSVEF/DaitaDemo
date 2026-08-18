/*
  # Relax NOT NULL constraints on EM subtopics

  Some seed rows have empty descriptive fields. Allow NULLs so bulk loads succeed.
*/

ALTER TABLE em_subtopics ALTER COLUMN description DROP NOT NULL;
ALTER TABLE em_subtopics ALTER COLUMN day_range DROP NOT NULL;
ALTER TABLE em_subtopics ALTER COLUMN post_assessment DROP NOT NULL;
ALTER TABLE em_subtopics ALTER COLUMN fal_focus DROP NOT NULL;
ALTER TABLE em_subtopics ALTER COLUMN default_difficulty SET DEFAULT 'medium';
