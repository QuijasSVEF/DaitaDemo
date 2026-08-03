-- Normalize detailedActivities field names in existing group_lesson_plans
-- Converts AI-generated field names to the format the UI expects:
--   steps[].teacherSays -> kept as-is (UI now reads it)
--   steps[].lookFor -> kept as-is (UI now reads it)
--   differentiation.ifStrugglingMore -> differentiation.struggling[]
--   differentiation.ifGettingIt -> differentiation.advanced[]
--   commonMistakes -> commonMisconceptions
-- Also extracts teacherScript[] and expectedStudentBehaviors[] from steps

CREATE OR REPLACE FUNCTION pg_temp.normalize_activity(activity jsonb) RETURNS jsonb AS $$
DECLARE
  steps jsonb;
  teacher_scripts jsonb := '[]'::jsonb;
  student_behaviors jsonb := '[]'::jsonb;
  diff jsonb;
  struggling jsonb := '[]'::jsonb;
  advanced_arr jsonb := '[]'::jsonb;
  misconceptions jsonb;
  normalized_steps jsonb := '[]'::jsonb;
  step_item jsonb;
  i int;
BEGIN
  IF activity IS NULL THEN RETURN activity; END IF;

  steps := COALESCE(activity->'steps', '[]'::jsonb);

  -- Extract teacherSays and lookFor from steps
  IF jsonb_array_length(COALESCE(activity->'teacherScript', '[]'::jsonb)) = 0 THEN
    FOR i IN 0..jsonb_array_length(steps)-1 LOOP
      step_item := steps->i;
      IF step_item->>'teacherSays' IS NOT NULL AND step_item->>'teacherSays' != '' THEN
        teacher_scripts := teacher_scripts || to_jsonb(step_item->>'teacherSays');
      END IF;
      IF step_item->>'lookFor' IS NOT NULL AND step_item->>'lookFor' != '' THEN
        student_behaviors := student_behaviors || to_jsonb(step_item->>'lookFor');
      END IF;
    END LOOP;
  ELSE
    teacher_scripts := activity->'teacherScript';
    student_behaviors := COALESCE(activity->'expectedStudentBehaviors', activity->'studentBehaviors', '[]'::jsonb);
  END IF;

  -- Normalize differentiation
  diff := COALESCE(activity->'differentiation', '{}'::jsonb);
  IF jsonb_typeof(diff->'struggling') = 'array' AND jsonb_array_length(diff->'struggling') > 0 THEN
    struggling := diff->'struggling';
  ELSIF diff->>'ifStrugglingMore' IS NOT NULL AND diff->>'ifStrugglingMore' != '' THEN
    struggling := jsonb_build_array(diff->>'ifStrugglingMore');
  END IF;

  IF jsonb_typeof(diff->'advanced') = 'array' AND jsonb_array_length(diff->'advanced') > 0 THEN
    advanced_arr := diff->'advanced';
  ELSIF diff->>'ifGettingIt' IS NOT NULL AND diff->>'ifGettingIt' != '' THEN
    advanced_arr := jsonb_build_array(diff->>'ifGettingIt');
  END IF;

  -- Normalize commonMisconceptions
  misconceptions := COALESCE(activity->'commonMisconceptions', activity->'commonMistakes', '[]'::jsonb);

  -- Normalize steps to include expectedResponse from lookFor
  FOR i IN 0..jsonb_array_length(steps)-1 LOOP
    step_item := steps->i;
    IF jsonb_typeof(step_item) = 'object' THEN
      step_item := step_item || jsonb_build_object(
        'expectedResponse', COALESCE(step_item->>'expectedResponse', step_item->>'lookFor', '')
      );
      normalized_steps := normalized_steps || jsonb_build_array(step_item);
    ELSE
      normalized_steps := normalized_steps || jsonb_build_array(step_item);
    END IF;
  END LOOP;

  RETURN activity || jsonb_build_object(
    'steps', normalized_steps,
    'teacherScript', teacher_scripts,
    'expectedStudentBehaviors', student_behaviors,
    'studentBehaviors', student_behaviors,
    'differentiation', jsonb_build_object('struggling', struggling, 'advanced', advanced_arr),
    'commonMisconceptions', misconceptions
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION pg_temp.normalize_phase(phase jsonb) RETURNS jsonb AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  i int;
BEGIN
  IF phase IS NULL OR jsonb_typeof(phase) != 'array' THEN RETURN COALESCE(phase, '[]'::jsonb); END IF;
  FOR i IN 0..jsonb_array_length(phase)-1 LOOP
    result := result || jsonb_build_array(pg_temp.normalize_activity(phase->i));
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Apply normalization to all existing group lesson plans that have detailedActivities
UPDATE group_lesson_plans
SET lesson_plan = lesson_plan || jsonb_build_object(
  'detailedActivities', jsonb_build_object(
    'engagement', pg_temp.normalize_phase(lesson_plan->'detailedActivities'->'engagement'),
    'representation', pg_temp.normalize_phase(lesson_plan->'detailedActivities'->'representation'),
    'actionExpression', pg_temp.normalize_phase(lesson_plan->'detailedActivities'->'actionExpression'),
    'wrapup', pg_temp.normalize_phase(lesson_plan->'detailedActivities'->'wrapup')
  )
)
WHERE lesson_plan->'detailedActivities' IS NOT NULL
  AND jsonb_typeof(lesson_plan->'detailedActivities') = 'object';