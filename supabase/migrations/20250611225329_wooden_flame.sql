/*
  # Fix Analytics RPC Functions

  This migration fixes the following issues:
  1. Function overloading ambiguity for get_lesson_timeline
  2. Ambiguous column reference in get_student_progress
  3. Type mismatch in get_subject_breakdown

  ## Changes Made
  1. Drop and recreate get_lesson_timeline with consistent signature
  2. Fix ambiguous column reference in get_student_progress
  3. Fix return type mismatch in get_subject_breakdown
*/

-- Drop existing functions to avoid overloading issues
DROP FUNCTION IF EXISTS get_lesson_timeline();
DROP FUNCTION IF EXISTS get_lesson_timeline(p_district_id uuid);
DROP FUNCTION IF EXISTS get_student_progress();
DROP FUNCTION IF EXISTS get_student_progress(p_district_id uuid);
DROP FUNCTION IF EXISTS get_subject_breakdown();
DROP FUNCTION IF EXISTS get_subject_breakdown(p_district_id uuid);

-- Create get_lesson_timeline function with consistent signature
CREATE OR REPLACE FUNCTION get_lesson_timeline(p_district_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'lessons', COALESCE(jsonb_agg(
            jsonb_build_object(
                'objective', lp.objective,
                'student_id', lp.student_id,
                'created_at', to_char(lp.created_at, 'YYYY-MM-DD HH24:MI:SS'),
                'updated_at', to_char(lp.updated_at, 'YYYY-MM-DD HH24:MI:SS')
            )
            ORDER BY lp.created_at DESC
        ), '[]'::jsonb)
    ) INTO result
    FROM lesson_plans lp
    JOIN students s ON s.id = lp.student_id AND s.teacher_username = lp.teacher_username
    JOIN teachers t ON t.username = lp.teacher_username
    WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    LIMIT 50;

    RETURN result;
END;
$$;

-- Create get_student_progress function with fixed column references
CREATE OR REPLACE FUNCTION get_student_progress(p_district_id uuid DEFAULT NULL)
RETURNS TABLE(
    student_id integer,
    teacher text,
    subject text,
    initial_score numeric,
    current_score numeric,
    improvement numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH student_scores AS (
        SELECT 
            s.id as student_id,
            s.teacher_username,
            s.subject as student_subject,
            t.name as teacher_name,
            FIRST_VALUE(CAST(qa.score AS numeric) / qa.total_questions * 100) 
                OVER (PARTITION BY s.id, s.teacher_username ORDER BY qa.completed_at ASC) as first_score,
            FIRST_VALUE(CAST(qa.score AS numeric) / qa.total_questions * 100) 
                OVER (PARTITION BY s.id, s.teacher_username ORDER BY qa.completed_at DESC) as latest_score
        FROM students s
        JOIN teachers t ON t.username = s.teacher_username
        JOIN quiz_attempts qa ON qa.student_id = s.id AND qa.teacher_username = s.teacher_username
        WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    ),
    progress_data AS (
        SELECT DISTINCT
            ss.student_id,
            ss.teacher_name,
            ss.student_subject,
            ss.first_score,
            ss.latest_score,
            (ss.latest_score - ss.first_score) as score_improvement
        FROM student_scores ss
    )
    SELECT 
        pd.student_id,
        pd.teacher_name,
        pd.student_subject,
        pd.first_score,
        pd.latest_score,
        pd.score_improvement
    FROM progress_data pd
    ORDER BY pd.score_improvement DESC
    LIMIT 100;
END;
$$;

-- Create get_subject_breakdown function with correct return types
CREATE OR REPLACE FUNCTION get_subject_breakdown(p_district_id uuid DEFAULT NULL)
RETURNS TABLE(
    subject text,
    student_count integer,
    average_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.subject,
        COUNT(DISTINCT s.id)::integer as student_count,
        COALESCE(AVG(CAST(qa.score AS numeric) / qa.total_questions * 100), 0) as average_score
    FROM students s
    JOIN teachers t ON t.username = s.teacher_username
    LEFT JOIN quiz_attempts qa ON qa.student_id = s.id AND qa.teacher_username = s.teacher_username
    WHERE (p_district_id IS NULL OR t.district_id = p_district_id)
    GROUP BY s.subject
    ORDER BY student_count DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_lesson_timeline(uuid) TO public;
GRANT EXECUTE ON FUNCTION get_student_progress(uuid) TO public;
GRANT EXECUTE ON FUNCTION get_subject_breakdown(uuid) TO public;