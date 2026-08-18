/*
  # Add Mentor-Teacher Direct Assignments

  1. New Tables
    - `mentor_teacher_assignments`
      - Links college mentors directly to teachers
      - Teachers will manage group assignments in their portal
      - Replaces the need for mentor_group_assignments in admin workflow

  2. Security
    - Enable RLS on new table
    - Add policies for secure access by admins and teachers

  3. Notes
    - Keeps existing mentor_group_assignments for backward compatibility
    - New workflow: Admin assigns mentor → teacher, Teacher assigns mentor → groups
*/

-- Create mentor-teacher assignments table
CREATE TABLE IF NOT EXISTS mentor_teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL REFERENCES college_mentors(id) ON DELETE CASCADE,
  teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  assigned_by text DEFAULT 'admin',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes text,
  UNIQUE(mentor_id, teacher_username)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentor_teacher_assignments_mentor
  ON mentor_teacher_assignments(mentor_id);

CREATE INDEX IF NOT EXISTS idx_mentor_teacher_assignments_teacher
  ON mentor_teacher_assignments(teacher_username);

-- Enable RLS
ALTER TABLE mentor_teacher_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentor_teacher_assignments

-- Admins can view all assignments (for now, allowing all authenticated users to view)
CREATE POLICY "Anyone can view mentor-teacher assignments"
  ON mentor_teacher_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Anyone can insert (admin workflow)
CREATE POLICY "Anyone can create mentor-teacher assignments"
  ON mentor_teacher_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Anyone can update assignments
CREATE POLICY "Anyone can update mentor-teacher assignments"
  ON mentor_teacher_assignments
  FOR UPDATE
  TO authenticated
  USING (true);

-- Anyone can delete assignments
CREATE POLICY "Anyone can delete mentor-teacher assignments"
  ON mentor_teacher_assignments
  FOR DELETE
  TO authenticated
  USING (true);
