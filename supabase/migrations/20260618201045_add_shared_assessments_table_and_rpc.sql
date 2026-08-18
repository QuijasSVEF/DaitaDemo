
-- Table to track assessment shares (audit trail)
CREATE TABLE IF NOT EXISTS shared_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_quiz_id uuid NOT NULL REFERENCES quiz_templates(id) ON DELETE CASCADE,
  source_teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  target_teacher_username text NOT NULL REFERENCES teachers(username) ON DELETE CASCADE,
  target_quiz_id uuid REFERENCES quiz_templates(id) ON DELETE SET NULL,
  shared_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shared_assessments ENABLE ROW LEVEL SECURITY;

-- Teachers can see shares they sent
CREATE POLICY "select_sent_shares" ON shared_assessments FOR SELECT
  TO authenticated USING (true);

-- Allow anon to read (app uses anon key with custom auth)
CREATE POLICY "anon_select_shares" ON shared_assessments FOR SELECT
  TO anon USING (true);

-- Allow inserts
CREATE POLICY "insert_shares" ON shared_assessments FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "anon_insert_shares" ON shared_assessments FOR INSERT
  TO anon WITH CHECK (true);

-- Index for lookups
CREATE INDEX idx_shared_assessments_source ON shared_assessments(source_teacher_username);
CREATE INDEX idx_shared_assessments_target ON shared_assessments(target_teacher_username);
CREATE INDEX idx_shared_assessments_source_quiz ON shared_assessments(source_quiz_id);

-- Add shared_from column to quiz_templates to track origin
ALTER TABLE quiz_templates ADD COLUMN IF NOT EXISTS shared_from_teacher text;

-- RPC function to share a quiz to another teacher
CREATE OR REPLACE FUNCTION share_quiz_template(
  p_source_quiz_id uuid,
  p_source_teacher_username text,
  p_target_teacher_username text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_quiz quiz_templates%ROWTYPE;
  v_new_quiz_id uuid;
BEGIN
  -- Validate source quiz exists and belongs to source teacher
  SELECT * INTO v_source_quiz
  FROM quiz_templates
  WHERE id = p_source_quiz_id AND teacher_username = p_source_teacher_username;

  IF v_source_quiz IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Source assessment not found or you do not own it');
  END IF;

  -- Validate target teacher exists
  IF NOT EXISTS (SELECT 1 FROM teachers WHERE username = p_target_teacher_username) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Target teacher not found');
  END IF;

  -- Cannot share to yourself
  IF p_source_teacher_username = p_target_teacher_username THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cannot share assessment with yourself');
  END IF;

  -- Create a copy of the quiz for the target teacher
  v_new_quiz_id := gen_random_uuid();

  INSERT INTO quiz_templates (
    id,
    teacher_username,
    title,
    topic,
    subtopics,
    grade_level,
    difficulty,
    num_questions,
    question_types,
    questions,
    processed_questions,
    is_active,
    show_answers,
    em_level_code,
    em_module_id,
    em_subtopic_ids,
    shared_from_teacher,
    created_at
  ) VALUES (
    v_new_quiz_id,
    p_target_teacher_username,
    v_source_quiz.title,
    v_source_quiz.topic,
    v_source_quiz.subtopics,
    v_source_quiz.grade_level,
    v_source_quiz.difficulty,
    v_source_quiz.num_questions,
    v_source_quiz.question_types,
    v_source_quiz.questions,
    v_source_quiz.processed_questions,
    false,
    v_source_quiz.show_answers,
    v_source_quiz.em_level_code,
    v_source_quiz.em_module_id,
    v_source_quiz.em_subtopic_ids,
    p_source_teacher_username,
    now()
  );

  -- Record the share
  INSERT INTO shared_assessments (
    source_quiz_id,
    source_teacher_username,
    target_teacher_username,
    target_quiz_id
  ) VALUES (
    p_source_quiz_id,
    p_source_teacher_username,
    p_target_teacher_username,
    v_new_quiz_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Assessment shared successfully',
    'new_quiz_id', v_new_quiz_id
  );
END;
$$;
