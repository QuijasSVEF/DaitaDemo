/*
# Add shared_from_teacher column to quiz_templates

The AssessmentsView queries this column for shared/received assessments.
Adds it as a nullable text column.

1. Modified Tables
  - quiz_templates: Add `shared_from_teacher` (text, nullable) - tracks if a quiz was shared from another teacher
*/

ALTER TABLE quiz_templates ADD COLUMN IF NOT EXISTS shared_from_teacher text;
