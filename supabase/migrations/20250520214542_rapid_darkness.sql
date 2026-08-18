/*
  # Update students table RLS policies

  1. Changes
    - Add new RLS policy to allow student creation during quiz attempts
    - Modify existing policies to be more specific about permissions
  
  2. Security
    - Enable RLS on students table (already enabled)
    - Add policy for quiz-based student creation
    - Maintain existing teacher management policies
*/

-- Drop existing policies to recreate them with more specific rules
DROP POLICY IF EXISTS "Teachers can manage their students" ON students;
DROP POLICY IF EXISTS "Teachers can view their students" ON students;

-- Create more specific policies
CREATE POLICY "Teachers can manage their students"
ON public.students
FOR ALL
TO authenticated
USING (
  teacher_username = auth.uid()::text 
  AND verify_teacher_status(teacher_username)
)
WITH CHECK (
  teacher_username = auth.uid()::text 
  AND verify_teacher_status(teacher_username)
);

CREATE POLICY "Teachers can view their students"
ON public.students
FOR SELECT
TO authenticated
USING (
  teacher_username = auth.uid()::text 
  AND verify_teacher_status(teacher_username)
);

-- Add new policy for quiz-based student creation
CREATE POLICY "Allow student creation during quiz attempts"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM quiz_templates qt 
    WHERE qt.teacher_username = students.teacher_username
    AND qt.is_active = true
  )
);