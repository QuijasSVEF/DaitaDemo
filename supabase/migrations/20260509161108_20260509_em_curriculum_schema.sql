/*
  # Elevate Math (EM) Curriculum Schema

  Adds tables to model the Elevate Math curriculum (levels, modules, subtopics,
  daily activities, exemplars, data talks, session templates) plus the columns
  needed to link ad-hoc mentor sessions and quiz templates to the curriculum.
  Also introduces a system_settings table so admins can toggle between the EM
  curriculum flow and the legacy free-form assessment flow.

  1. New Tables
    - em_levels: top-level EM classes (EM3..EM9_GEO)
    - em_modules: modules inside a level
    - em_subtopics: subtopics inside a module
    - em_daily_activities: daily activities (math_talk, data_talk, exploration)
    - em_exemplars: exemplar items/prompts
    - em_data_talks: data talk items
    - em_templates: program/day-structure templates
    - system_settings: global admin-controlled toggles
  2. Column Additions
    - mentor_sessions: ad_hoc_em_level_code, ad_hoc_em_module_id, ad_hoc_em_subtopic_id
    - quiz_templates: em_level_code, em_module_id, em_subtopic_ids
  3. Security
    - RLS enabled on every new table
    - Curriculum tables: readable by all authenticated roles; writable by service_role only
    - system_settings: readable by authenticated; writable by service_role only
*/

CREATE TABLE IF NOT EXISTS em_levels (
  level_code text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  grade_level text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  overview text NOT NULL DEFAULT '',
  total_program_days integer,
  source_file_id text DEFAULT '',
  source_modified date,
  version_note text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS em_modules (
  id text PRIMARY KEY,
  level_code text NOT NULL REFERENCES em_levels(level_code) ON DELETE CASCADE,
  parent_id text,
  order_index integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  overview text NOT NULL DEFAULT '',
  big_ideas jsonb NOT NULL DEFAULT '[]'::jsonb,
  standards jsonb NOT NULL DEFAULT '[]'::jsonb,
  standards_summary text NOT NULL DEFAULT '',
  academic_vocabulary jsonb NOT NULL DEFAULT '[]'::jsonb,
  common_misconceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  concepts jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_days integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS em_modules_level_idx ON em_modules(level_code);

CREATE TABLE IF NOT EXISTS em_subtopics (
  id text PRIMARY KEY,
  module_id text NOT NULL REFERENCES em_modules(id) ON DELETE CASCADE,
  level_code text NOT NULL REFERENCES em_levels(level_code) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  day_range text NOT NULL DEFAULT '',
  post_assessment text NOT NULL DEFAULT '',
  fal_focus text NOT NULL DEFAULT '',
  dok_level integer,
  default_difficulty text NOT NULL DEFAULT 'medium',
  aligned_standards jsonb NOT NULL DEFAULT '[]'::jsonb,
  big_ideas jsonb NOT NULL DEFAULT '[]'::jsonb,
  academic_vocabulary jsonb NOT NULL DEFAULT '[]'::jsonb,
  common_misconceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS em_subtopics_module_idx ON em_subtopics(module_id);
CREATE INDEX IF NOT EXISTS em_subtopics_level_idx ON em_subtopics(level_code);

CREATE TABLE IF NOT EXISTS em_daily_activities (
  activity_id text PRIMARY KEY,
  level_code text NOT NULL REFERENCES em_levels(level_code) ON DELETE CASCADE,
  module_id text REFERENCES em_modules(id) ON DELETE SET NULL,
  subtopic_id text REFERENCES em_subtopics(id) ON DELETE SET NULL,
  day_number integer,
  activity_type text NOT NULL DEFAULT '',
  prompt_text text NOT NULL DEFAULT '',
  resource_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS em_daily_activities_level_idx ON em_daily_activities(level_code);
CREATE INDEX IF NOT EXISTS em_daily_activities_module_idx ON em_daily_activities(module_id);

CREATE TABLE IF NOT EXISTS em_exemplars (
  id text PRIMARY KEY,
  level_code text NOT NULL REFERENCES em_levels(level_code) ON DELETE CASCADE,
  subtopic_id text REFERENCES em_subtopics(id) ON DELETE SET NULL,
  question_type text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'medium',
  dok integer,
  prompt text NOT NULL DEFAULT '',
  answer text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  source_activity_id text REFERENCES em_daily_activities(activity_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS em_exemplars_subtopic_idx ON em_exemplars(subtopic_id);

CREATE TABLE IF NOT EXISTS em_data_talks (
  id text PRIMARY KEY,
  level_code text NOT NULL REFERENCES em_levels(level_code) ON DELETE CASCADE,
  subtopic_id text REFERENCES em_subtopics(id) ON DELETE SET NULL,
  data_talk_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  data_source text NOT NULL DEFAULT '',
  big_idea_cluster text NOT NULL DEFAULT '',
  prompt text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS em_templates (
  id text PRIMARY KEY,
  level_code text NOT NULL REFERENCES em_levels(level_code) ON DELETE CASCADE,
  template_id text NOT NULL,
  grade_band text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  activity text NOT NULL DEFAULT '',
  duration_min integer,
  duration_min_min integer,
  duration_min_max integer,
  category text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS em_templates_level_idx ON em_templates(level_code);

CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO system_settings (key, value, description)
VALUES (
  'assessment_flow_default',
  '"em_curriculum"'::jsonb,
  'Default assessment creation flow: em_curriculum | legacy'
)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE mentor_sessions
  ADD COLUMN IF NOT EXISTS ad_hoc_em_level_code text,
  ADD COLUMN IF NOT EXISTS ad_hoc_em_module_id text,
  ADD COLUMN IF NOT EXISTS ad_hoc_em_subtopic_id text;

ALTER TABLE quiz_templates
  ADD COLUMN IF NOT EXISTS em_level_code text,
  ADD COLUMN IF NOT EXISTS em_module_id text,
  ADD COLUMN IF NOT EXISTS em_subtopic_ids text[] DEFAULT '{}'::text[];

ALTER TABLE em_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE em_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE em_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE em_daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE em_exemplars ENABLE ROW LEVEL SECURITY;
ALTER TABLE em_data_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE em_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'em_levels','em_modules','em_subtopics','em_daily_activities',
      'em_exemplars','em_data_talks','em_templates'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Curriculum readable by anon" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Curriculum readable by authenticated" ON %I', tbl);
    EXECUTE format($p$CREATE POLICY "Curriculum readable by anon" ON %I FOR SELECT TO anon USING (true)$p$, tbl);
    EXECUTE format($p$CREATE POLICY "Curriculum readable by authenticated" ON %I FOR SELECT TO authenticated USING (true)$p$, tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "system_settings readable" ON system_settings;
CREATE POLICY "system_settings readable"
  ON system_settings FOR SELECT
  TO anon, authenticated
  USING (true);
