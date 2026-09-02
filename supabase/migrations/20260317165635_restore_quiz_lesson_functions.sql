/*
  # Restore Quiz, Lesson Plan, and Assessment Functions
  
  1. Triggers
    - set_student_grade_from_quiz: Sets student grade on first quiz attempt
    - calculate_assessment_duration: Calculates quiz duration
    - update_group_lesson_plan_timestamp: Auto-updates timestamp
    
  2. Functions
    - generate_dok_lesson_plan: Generates DOK-based lesson plan
    - validate_and_create_student: Validates/creates student records
    - validate_student: Validates student with emoji password
    - get_lesson_plan_by_exit_ticket: Gets lesson plan by exit ticket
    - regenerate_lesson_plan: Regenerates individual lesson plan
    - regenerate_group_lesson_plan: Regenerates group lesson plan
    - generate_group_lesson_plan: Generates group lesson plan
    - get_student_duration_analysis: Duration analytics
    
  3. Column additions
    - quiz_attempts: start_time, completion_time, duration
    - group_lesson_plans: updated_at
*/

ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ DEFAULT now();
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS completion_time TIMESTAMPTZ DEFAULT now();
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE group_lesson_plans ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DROP TRIGGER IF EXISTS set_student_grade_trigger ON quiz_attempts;
DROP TRIGGER IF EXISTS set_assessment_duration ON quiz_attempts;
DROP TRIGGER IF EXISTS update_group_lesson_plan_timestamp ON group_lesson_plans;

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_created ON quiz_attempts(student_id, created_at);
DROP INDEX IF EXISTS idx_quiz_attempts_timestamps;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_timestamps ON quiz_attempts(student_id, start_time, completion_time);

CREATE OR REPLACE FUNCTION set_student_grade_from_quiz()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM quiz_attempts WHERE student_id = NEW.student_id AND created_at < NEW.created_at) THEN
    RETURN NEW;
  END IF;
  UPDATE students SET grade_level = (SELECT grade_level FROM quiz_templates WHERE id = NEW.template_id) WHERE id = NEW.student_id AND teacher_username = NEW.teacher_username;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_student_grade_trigger
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION set_student_grade_from_quiz();

CREATE OR REPLACE FUNCTION calculate_assessment_duration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.duration := EXTRACT(EPOCH FROM (NEW.completion_time - NEW.start_time))::INTEGER;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_assessment_duration
  BEFORE INSERT OR UPDATE OF completion_time ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION calculate_assessment_duration();

CREATE OR REPLACE FUNCTION update_group_lesson_plan_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_lesson_plan_timestamp
  BEFORE UPDATE ON group_lesson_plans
  FOR EACH ROW EXECUTE FUNCTION update_group_lesson_plan_timestamp();

DROP FUNCTION IF EXISTS generate_dok_lesson_plan(text, text, text[]);
CREATE FUNCTION generate_dok_lesson_plan(p_grade_level TEXT, p_standard_code TEXT, p_struggle_areas TEXT[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_standard_description TEXT;
  v_domain TEXT;
  v_cluster TEXT;
BEGIN
  IF p_standard_code IS NOT NULL THEN
    SELECT description, domain, cluster INTO v_standard_description, v_domain, v_cluster FROM ca_standards WHERE standard_code = p_standard_code AND grade_level = p_grade_level;
  END IF;
  RETURN jsonb_build_object(
    'objective', CASE WHEN v_standard_description IS NOT NULL THEN 'Master ' || v_standard_description ELSE 'Master ' || array_to_string(p_struggle_areas, ' and ') END,
    'engagement', ARRAY['Interactive concept exploration', 'Guided discovery activities', 'Real-world connections', 'Student-led discussions'],
    'representation', ARRAY['Visual models and diagrams', 'Multiple solution strategies', 'Concrete manipulatives', 'Digital tools and simulations'],
    'action_expression', ARRAY['Hands-on problem solving', 'Collaborative projects', 'Student presentations', 'Peer teaching opportunities'],
    'wrapup', ARRAY['Concept synthesis', 'Self-reflection', 'Exit ticket completion', 'Next steps planning'],
    'duration', 25,
    'aligned_standards', CASE WHEN p_standard_code IS NOT NULL THEN jsonb_build_array(jsonb_build_object('code', p_standard_code, 'description', v_standard_description, 'domain', v_domain, 'cluster', v_cluster)) ELSE '[]'::jsonb END,
    'dok_levels', jsonb_build_object('engagement', CASE WHEN p_grade_level::int >= 6 THEN 2 ELSE 1 END, 'representation', CASE WHEN p_grade_level::int >= 7 THEN 3 ELSE 2 END, 'action_expression', CASE WHEN p_grade_level::int >= 8 THEN 4 ELSE 3 END, 'wrapup', 2)
  );
END;
$$;

CREATE OR REPLACE FUNCTION validate_and_create_student(p_student_id INTEGER, p_teacher_username TEXT, p_emoji_password TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_exists BOOLEAN;
  v_emoji_password TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM students WHERE id = p_student_id AND teacher_username = p_teacher_username) INTO v_student_exists;
  IF v_student_exists AND p_emoji_password IS NOT NULL THEN
    SELECT emoji_password INTO v_emoji_password FROM students WHERE id = p_student_id AND teacher_username = p_teacher_username;
    IF v_emoji_password IS NOT NULL AND v_emoji_password != p_emoji_password THEN RETURN FALSE; END IF;
    IF v_emoji_password IS NULL THEN UPDATE students SET emoji_password = p_emoji_password WHERE id = p_student_id AND teacher_username = p_teacher_username; END IF;
    RETURN TRUE;
  END IF;
  IF NOT v_student_exists THEN
    INSERT INTO students (id, teacher_username, grade_level, subject, emoji_password) VALUES (p_student_id, p_teacher_username, '6', 'Mathematics', p_emoji_password);
    RETURN TRUE;
  END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION validate_student(p_student_id INTEGER, p_teacher_username TEXT, p_emoji_password TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_exists BOOLEAN;
  v_emoji_password TEXT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM students WHERE id = p_student_id AND teacher_username = p_teacher_username) INTO v_student_exists;
  IF v_student_exists AND p_emoji_password IS NOT NULL THEN
    SELECT emoji_password INTO v_emoji_password FROM students WHERE id = p_student_id AND teacher_username = p_teacher_username;
    IF v_emoji_password IS NOT NULL AND v_emoji_password != p_emoji_password THEN RETURN FALSE; END IF;
    IF v_emoji_password IS NULL THEN UPDATE students SET emoji_password = p_emoji_password WHERE id = p_student_id AND teacher_username = p_teacher_username; END IF;
    RETURN TRUE;
  END IF;
  IF NOT v_student_exists THEN
    INSERT INTO students (id, teacher_username, grade_level, subject, emoji_password) VALUES (p_student_id, p_teacher_username, '6', 'Mathematics', p_emoji_password);
    RETURN TRUE;
  END IF;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION get_lesson_plan_by_exit_ticket(p_exit_ticket_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan jsonb;
BEGIN
  SELECT jsonb_build_object('objective', lp.objective, 'engagement', lp.engagement, 'representation', lp.representation, 'action_expression', lp.action_expression, 'wrapup', lp.wrapup, 'duration', lp.duration, 'aligned_standards', COALESCE(lp.aligned_standards, '[]'::jsonb), 'dok_levels', COALESCE(lp.dok_levels, jsonb_build_object('engagement', 1, 'representation', 2, 'action_expression', 3, 'wrapup', 2)), 'detailed_activities', COALESCE(lp.detailed_activities, '{}'::jsonb)) INTO v_plan FROM lesson_plans lp WHERE lp.exit_ticket_id = p_exit_ticket_id;
  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION regenerate_lesson_plan(p_lesson_plan_id UUID, p_exit_ticket_id UUID DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id INTEGER;
  v_teacher_username TEXT;
  v_grade_level TEXT;
  v_struggled_areas TEXT[];
  v_standard_id UUID;
  v_standard_code TEXT;
  v_standard_description TEXT;
  v_lesson_plan jsonb;
BEGIN
  SELECT lp.student_id, lp.teacher_username, s.grade_level, et.struggled_areas INTO v_student_id, v_teacher_username, v_grade_level, v_struggled_areas FROM lesson_plans lp JOIN students s ON s.id = lp.student_id AND s.teacher_username = lp.teacher_username LEFT JOIN exit_tickets et ON et.id = COALESCE(p_exit_ticket_id, lp.exit_ticket_id) WHERE lp.id = p_lesson_plan_id;
  IF v_student_id IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'Lesson plan not found'); END IF;
  SELECT id, standard_code, description INTO v_standard_id, v_standard_code, v_standard_description FROM ca_standards WHERE grade_level = v_grade_level AND subject = 'Mathematics' AND (description ILIKE ANY(array(SELECT '%' || area || '%' FROM unnest(v_struggled_areas) AS area)) OR domain ILIKE ANY(array(SELECT '%' || area || '%' FROM unnest(v_struggled_areas) AS area))) LIMIT 1;
  v_lesson_plan := jsonb_build_object('objective', 'Master ' || array_to_string(v_struggled_areas, ' and ') || ' through personalized learning', 'engagement', ARRAY['Interactive exploration of ' || v_struggled_areas[1], 'Guided discovery with manipulatives', 'Real-world problem connections', 'Student-led concept discussions'], 'representation', ARRAY['Visual models and diagrams', 'Multiple solution strategies', 'Concrete-to-abstract progression', 'Digital tools and simulations'], 'action_expression', ARRAY['Hands-on problem solving', 'Choice-based demonstration', 'Peer teaching opportunity', 'Creative application project'], 'wrapup', ARRAY['Concept synthesis activity', 'Self-reflection journal', 'Exit ticket completion', 'Next steps planning'], 'duration', 25, 'dok_levels', jsonb_build_object('engagement', 1, 'representation', 2, 'action_expression', 3, 'wrapup', 2), 'aligned_standards', CASE WHEN v_standard_id IS NOT NULL THEN jsonb_build_array(jsonb_build_object('code', v_standard_code, 'description', v_standard_description)) ELSE '[]'::jsonb END);
  UPDATE lesson_plans SET objective = v_lesson_plan->>'objective', engagement = (v_lesson_plan->'engagement')::text[], representation = (v_lesson_plan->'representation')::text[], action_expression = (v_lesson_plan->'action_expression')::text[], wrapup = (v_lesson_plan->'wrapup')::text[], dok_levels = v_lesson_plan->'dok_levels', aligned_standards = v_lesson_plan->'aligned_standards', updated_at = now() WHERE id = p_lesson_plan_id;
  RETURN jsonb_build_object('success', true, 'message', 'Lesson plan regenerated successfully', 'lesson_plan', v_lesson_plan);
END;
$$;

CREATE OR REPLACE FUNCTION generate_group_lesson_plan(p_teacher_username TEXT, p_focus_areas TEXT[], p_student_ids INTEGER[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_grade_level TEXT;
  v_standard_id UUID;
  v_standard_code TEXT;
  v_standard_description TEXT;
BEGIN
  SELECT grade_level INTO v_grade_level FROM students WHERE id = ANY(p_student_ids) AND teacher_username = p_teacher_username GROUP BY grade_level ORDER BY COUNT(*) DESC LIMIT 1;
  SELECT id, standard_code, description INTO v_standard_id, v_standard_code, v_standard_description FROM ca_standards WHERE grade_level = v_grade_level AND subject = 'Mathematics' AND (description ILIKE ANY(array(SELECT '%' || fa || '%' FROM unnest(p_focus_areas) AS fa)) OR domain ILIKE ANY(array(SELECT '%' || fa || '%' FROM unnest(p_focus_areas) AS fa))) LIMIT 1;
  RETURN jsonb_build_object('objective', 'Master ' || array_to_string(p_focus_areas, ' and ') || ' through collaborative learning', 'engagement', ARRAY['Structured group discussion on ' || p_focus_areas[1], 'Peer teaching with concept mapping', 'Interactive problem solving with real-world scenarios', 'Team-based skill practice with immediate feedback'], 'representation', ARRAY['Multi-modal visualization of ' || p_focus_areas[1], 'Student-created representations', 'Collaborative modeling strategies', 'Real-world problem analysis'], 'action_expression', ARRAY['Differentiated group challenges', 'Peer teaching rotations', 'Collaborative problem solving', 'Group presentation preparation'], 'wrapup', ARRAY['Group achievement celebration', 'Peer feedback exchange', 'Learning strategy reflection', 'Next steps planning'], 'duration', 25, 'dok_levels', jsonb_build_object('engagement', 1, 'representation', 2, 'action_expression', 3, 'wrapup', 2), 'aligned_standards', CASE WHEN v_standard_id IS NOT NULL THEN jsonb_build_array(jsonb_build_object('code', v_standard_code, 'description', v_standard_description)) ELSE '[]'::jsonb END);
END;
$$;

CREATE OR REPLACE FUNCTION regenerate_group_lesson_plan(p_group_lesson_plan_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_id UUID;
  v_teacher_username TEXT;
  v_student_ids INTEGER[];
  v_focus_areas TEXT[];
  v_lesson_plan jsonb;
BEGIN
  SELECT group_id, teacher_username, student_ids, focus_areas INTO v_group_id, v_teacher_username, v_student_ids, v_focus_areas FROM group_lesson_plans WHERE id = p_group_lesson_plan_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Group lesson plan not found'); END IF;
  v_lesson_plan := jsonb_build_object('objective', 'Master ' || array_to_string(v_focus_areas, ' and '), 'engagement', ARRAY['Interactive group exploration', 'Collaborative discovery activities', 'Real-world connections', 'Peer discussions'], 'representation', ARRAY['Visual models and diagrams', 'Multiple solution strategies', 'Manipulatives and tools', 'Digital simulations'], 'action_expression', ARRAY['Group problem solving', 'Collaborative projects', 'Student presentations', 'Peer teaching'], 'wrapup', ARRAY['Group reflection', 'Concept synthesis', 'Exit tickets', 'Next steps planning'], 'duration', 25, 'dok_levels', jsonb_build_object('engagement', 2, 'representation', 2, 'action_expression', 3, 'wrapup', 2));
  UPDATE group_lesson_plans SET lesson_plan = v_lesson_plan, updated_at = now() WHERE id = p_group_lesson_plan_id;
  RETURN jsonb_build_object('success', true, 'message', 'Lesson plan regenerated successfully', 'lesson_plan', v_lesson_plan);
END;
$$;

CREATE OR REPLACE FUNCTION get_student_duration_analysis()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH duration_stats AS (SELECT student_id, AVG(duration)::integer as avg_duration, MIN(duration)::integer as min_duration, MAX(duration)::integer as max_duration, COUNT(*) as attempt_count FROM quiz_attempts WHERE duration IS NOT NULL GROUP BY student_id),
  overall_avg AS (SELECT AVG(duration)::integer as avg_duration FROM quiz_attempts WHERE duration IS NOT NULL)
  SELECT jsonb_build_object('average_duration', to_char((SELECT avg_duration FROM overall_avg) * interval '1 second', 'HH24:MI:SS'), 'student_breakdown', (SELECT jsonb_agg(jsonb_build_object('student_id', ds.student_id, 'average_duration', to_char(ds.avg_duration * interval '1 second', 'HH24:MI:SS'), 'attempt_count', ds.attempt_count)) FROM duration_stats ds)) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION get_teacher_performance()
RETURNS TABLE (username TEXT, name TEXT, total_students INTEGER, average_score NUMERIC, subjects TEXT[], student_improvement NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH teacher_stats AS (
    SELECT t.username AS teacher_username, t.name AS teacher_name, CAST(COUNT(DISTINCT s.id) AS INTEGER) as student_count, COALESCE(AVG(et.score::NUMERIC / et.total_questions * 100), 0) as avg_score, array_agg(DISTINCT s.subject) as subject_list, COALESCE(AVG(CASE WHEN first_score.score IS NOT NULL AND last_score.score IS NOT NULL THEN (last_score.score::NUMERIC / last_score.total_questions * 100) - (first_score.score::NUMERIC / first_score.total_questions * 100) ELSE 0 END), 0) as improvement
    FROM teachers t LEFT JOIN students s ON s.teacher_username = t.username LEFT JOIN exit_tickets et ON et.student_id = s.id AND et.teacher_username = t.username LEFT JOIN LATERAL (SELECT score, total_questions FROM exit_tickets e WHERE e.student_id = s.id AND e.teacher_username = t.username ORDER BY e.created_at ASC LIMIT 1) first_score ON true LEFT JOIN LATERAL (SELECT score, total_questions FROM exit_tickets e WHERE e.student_id = s.id AND e.teacher_username = t.username ORDER BY e.created_at DESC LIMIT 1) last_score ON true
    GROUP BY t.username, t.name
  )
  SELECT teacher_username, teacher_name, student_count, avg_score, subject_list, improvement FROM teacher_stats;
END;
$$;

CREATE OR REPLACE FUNCTION get_subject_breakdown()
RETURNS TABLE (subject TEXT, student_count INTEGER, average_score NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT s.subject, CAST(COUNT(DISTINCT s.id) AS INTEGER) as total_students, COALESCE(AVG(et.score::NUMERIC / et.total_questions * 100), 0) as avg_score FROM students s LEFT JOIN exit_tickets et ON et.student_id = s.id GROUP BY s.subject ORDER BY total_students DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_student_progress()
RETURNS TABLE (student_id INTEGER, teacher TEXT, subject TEXT, initial_score NUMERIC, current_score NUMERIC, improvement NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH student_scores AS (SELECT DISTINCT ON (s.id) s.id, t.name as teacher_name, s.subject as student_subject, FIRST_VALUE(et.score::NUMERIC / et.total_questions * 100) OVER (PARTITION BY s.id ORDER BY et.created_at ASC) as first_score, FIRST_VALUE(et.score::NUMERIC / et.total_questions * 100) OVER (PARTITION BY s.id ORDER BY et.created_at DESC) as last_score FROM students s JOIN teachers t ON t.username = s.teacher_username JOIN exit_tickets et ON et.student_id = s.id)
  SELECT id, teacher_name, student_subject, first_score, last_score, last_score - first_score as score_improvement FROM student_scores WHERE first_score IS NOT NULL AND last_score IS NOT NULL ORDER BY score_improvement DESC;
END;
$$;
