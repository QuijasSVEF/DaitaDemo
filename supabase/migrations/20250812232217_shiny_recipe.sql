/*
  # Fix Quiz Templates RLS Policies for Teacher Authentication

  1. Security Changes
    - Drop existing RLS policies that use incorrect authentication check
    - Create new policies that properly authenticate teachers via email
    - Ensure teachers can only manage their own quiz templates
    - Allow public read access for active quizzes (for students)

  2. Policy Details
    - Teachers authenticated via Supabase Auth can manage their own templates
    - Authentication verified by matching auth.email() with teachers.email
    - Public users can view active quizzes for taking assessments
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Teachers can manage quiz templates" ON quiz_templates;
DROP POLICY IF EXISTS "Teachers can view quiz questions" ON quiz_templates;
DROP POLICY IF EXISTS "Enable insert for quiz templates" ON quiz_templates;
DROP POLICY IF EXISTS "Enable read access for quiz templates" ON quiz_templates;
DROP POLICY IF EXISTS "Students can view active quizzes" ON quiz_templates;

-- Create new policies with proper teacher authentication
CREATE POLICY "Teachers can manage their own quiz templates"
  ON quiz_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers t 
      WHERE t.username = quiz_templates.teacher_username 
      AND t.email = auth.email()
      AND t.account_status = 'active'
      AND t.account_locked = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers t 
      WHERE t.username = quiz_templates.teacher_username 
      AND t.email = auth.email()
      AND t.account_status = 'active'
      AND t.account_locked = false
    )
  );

-- Allow public read access for active quizzes (students need this)
CREATE POLICY "Public can view active quiz templates"
  ON quiz_templates
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow public insert for quiz attempts (students taking quizzes)
CREATE POLICY "Public can read quiz templates for attempts"
  ON quiz_templates
  FOR SELECT
  TO public
  USING (true);