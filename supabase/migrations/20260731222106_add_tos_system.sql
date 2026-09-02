/*
# Terms of Service system

Creates the ToS versioning and acceptance tracking tables with RPCs for
checking and recording acceptance. Seeds version 1.0.0.

1. New Tables
  - tos_versions: Stores each version of legal documents (id, version, title, content_html, effective_date, is_current)
  - tos_acceptances: Records user acceptance (user_role, user_identifier, tos_version_id, accepted_at)

2. New Functions
  - check_tos_accepted(role, identifier) - Returns boolean
  - record_tos_acceptance(role, identifier, user_agent) - Records acceptance
  - get_current_tos() - Returns current ToS content
  - get_tos_acceptance_stats() - Returns admin stats

3. Security
  - RLS enabled on both tables
  - tos_versions: publicly readable
  - tos_acceptances: readable + insertable by anon + authenticated
*/

CREATE TABLE IF NOT EXISTS tos_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'DAITA Legal Policies',
  content_html text NOT NULL,
  effective_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS tos_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role text NOT NULL CHECK (user_role IN ('teacher', 'coach', 'mentor', 'student')),
  user_identifier text NOT NULL,
  tos_version_id uuid NOT NULL REFERENCES tos_versions(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  UNIQUE(user_role, user_identifier, tos_version_id)
);

CREATE INDEX IF NOT EXISTS idx_tos_acceptances_user_lookup ON tos_acceptances(user_role, user_identifier);
CREATE INDEX IF NOT EXISTS idx_tos_versions_current ON tos_versions(is_current) WHERE is_current = true;

ALTER TABLE tos_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tos_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tos_versions_select_all" ON tos_versions;
CREATE POLICY "tos_versions_select_all" ON tos_versions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tos_acceptances_select_own" ON tos_acceptances;
CREATE POLICY "tos_acceptances_select_own" ON tos_acceptances
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tos_acceptances_insert_any" ON tos_acceptances;
CREATE POLICY "tos_acceptances_insert_any" ON tos_acceptances
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION check_tos_accepted(p_user_role text, p_user_identifier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version_id uuid;
  v_accepted boolean;
BEGIN
  SELECT id INTO v_current_version_id
  FROM tos_versions
  WHERE is_current = true
  LIMIT 1;

  IF v_current_version_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM tos_acceptances
    WHERE user_role = p_user_role
      AND user_identifier = p_user_identifier
      AND tos_version_id = v_current_version_id
  ) INTO v_accepted;

  RETURN v_accepted;
END;
$$;

CREATE OR REPLACE FUNCTION record_tos_acceptance(p_user_role text, p_user_identifier text, p_user_agent text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version_id uuid;
  v_version text;
BEGIN
  SELECT id, version INTO v_current_version_id, v_version
  FROM tos_versions
  WHERE is_current = true
  LIMIT 1;

  IF v_current_version_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No active ToS version found');
  END IF;

  INSERT INTO tos_acceptances (user_role, user_identifier, tos_version_id, user_agent)
  VALUES (p_user_role, p_user_identifier, v_current_version_id, p_user_agent)
  ON CONFLICT (user_role, user_identifier, tos_version_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'version', v_version);
END;
$$;

CREATE OR REPLACE FUNCTION get_current_tos()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'version', version,
    'title', title,
    'content_html', content_html,
    'effective_date', effective_date
  ) INTO v_result
  FROM tos_versions
  WHERE is_current = true
  LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION get_tos_acceptance_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_current_version_id uuid;
BEGIN
  SELECT id INTO v_current_version_id FROM tos_versions WHERE is_current = true LIMIT 1;

  IF v_current_version_id IS NULL THEN
    RETURN '{"total_acceptances": 0, "by_role": {}}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'total_acceptances', (SELECT count(*) FROM tos_acceptances WHERE tos_version_id = v_current_version_id),
    'by_role', (
      SELECT COALESCE(jsonb_object_agg(user_role, cnt), '{}'::jsonb)
      FROM (
        SELECT user_role, count(*) as cnt
        FROM tos_acceptances
        WHERE tos_version_id = v_current_version_id
        GROUP BY user_role
      ) sub
    ),
    'version', (SELECT version FROM tos_versions WHERE id = v_current_version_id),
    'effective_date', (SELECT effective_date FROM tos_versions WHERE id = v_current_version_id)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION check_tos_accepted(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION record_tos_acceptance(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_current_tos() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tos_acceptance_stats() TO anon, authenticated;

-- Seed initial ToS version
INSERT INTO tos_versions (version, title, content_html, effective_date, is_current)
VALUES (
  '1.0.0',
  'DAITA Legal Policies - SVEF v1.0.0',
  '<div class="tos-content"><p>By using D[ai]TA, you agree to our terms of service and privacy policy.</p></div>',
  '2026-06-21T00:00:00Z',
  true
)
ON CONFLICT (version) DO NOTHING;
