/*
  # Add show_answers column to quiz_templates

  1. Changes
    - Add show_answers boolean column to quiz_templates table
    - Set default value to true
    - Add NOT NULL constraint
    - Add comment explaining the column's purpose
*/

ALTER TABLE quiz_templates 
ADD COLUMN show_answers boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN quiz_templates.show_answers IS 
'Controls whether students can see correct answers and explanations after submitting the quiz';