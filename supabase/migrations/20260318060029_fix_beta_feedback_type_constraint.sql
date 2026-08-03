/*
  # Fix beta_feedback feedback_type CHECK constraint

  1. Modified Tables
    - `beta_feedback`
      - Update `feedback_type` CHECK constraint to include all form values: bug, feature, usability, suggestion, general

  2. Notes
    - The form sends 'feature' and 'usability' but the constraint only allowed 'bug', 'suggestion', 'general'
    - This caused insert failures with a CHECK constraint violation
*/

ALTER TABLE beta_feedback DROP CONSTRAINT IF EXISTS beta_feedback_feedback_type_check;

ALTER TABLE beta_feedback ADD CONSTRAINT beta_feedback_feedback_type_check
  CHECK (feedback_type = ANY (ARRAY['bug', 'feature', 'usability', 'suggestion', 'general']));
