/*
  # Fix Student Data Deletion Cascade

  1. Changes
    - Add ON DELETE CASCADE to quiz_attempts foreign keys
    - Add ON DELETE CASCADE to quiz_templates foreign key
    - Update delete_all_student_data function to handle deletion order

  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity through proper cascading
*/

-- Drop existing foreign key constraints
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_template_id_fkey;
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_student_teacher_fkey;
ALTER TABLE quiz_templates DROP CONSTRAINT IF EXISTS quiz_templates_teacher_username_fkey;

-- Recreate constraints with CASCADE
ALTER TABLE quiz_attempts
  ADD CONSTRAINT quiz_attempts_template_id_fkey 
  FOREIGN KEY (template_id) 
  REFERENCES quiz_templates(id) 
  ON DELETE CASCADE;

ALTER TABLE quiz_attempts
  ADD CONSTRAINT quiz_attempts_student_teacher_fkey 
  FOREIGN KEY (student_id, teacher_username) 
  REFERENCES students(id, teacher_username) 
  ON DELETE CASCADE;

ALTER TABLE quiz_templates
  ADD CONSTRAINT quiz_templates_teacher_username_fkey 
  FOREIGN KEY (teacher_username) 
  REFERENCES teachers(username) 
  ON DELETE CASCADE;

-- Update the delete_all_student_data function
CREATE OR REPLACE FUNCTION delete_all_student_data(p_teacher_username text)
RETURNS void AS $$
BEGIN
  -- Delete student records which will cascade to quiz_attempts
  DELETE FROM students 
  WHERE teacher_username = p_teacher_username;
  
  -- Delete quiz templates which will cascade to questions
  DELETE FROM quiz_templates 
  WHERE teacher_username = p_teacher_username;
END;
$$ LANGUAGE plpgsql;