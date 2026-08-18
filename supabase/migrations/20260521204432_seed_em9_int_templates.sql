/*
  # Seed EM9_INT Templates

  1. New Data
    - `em_templates`: 9 template rows for the Grade 9 Integrated block schedule
    - Template ID: g9_int_block, Grade Band: 9-Integrated

  2. Notes
    - 210-minute block structure with performance tasks, FAL, math talks, and enrichment
    - Includes resource_url links for Math Talks and Growth Mindset activities
*/

INSERT INTO em_templates (id, level_code, template_id, grade_band, order_index, activity, duration_min, duration_min_min, duration_min_max, category, resource_url) VALUES
  ('EM9_INT_g9_int_block_1', 'EM9_INT', 'g9_int_block', '9-Integrated', 1, 'Welcome & Check-in/Norms', 15, NULL, NULL, 'opening', NULL),
  ('EM9_INT_g9_int_block_2', 'EM9_INT', 'g9_int_block', '9-Integrated', 2, 'Math Talk', 15, NULL, NULL, 'math_talk', 'https://drive.google.com/drive/folders/1cUkAwHc3WwBwjaDUixc4JXbVm7mDQX7s?usp=sharing'),
  ('EM9_INT_g9_int_block_3', 'EM9_INT', 'g9_int_block', '9-Integrated', 3, 'Performance Task and/or FAL', 30, NULL, NULL, 'performance_task', NULL),
  ('EM9_INT_g9_int_block_4', 'EM9_INT', 'g9_int_block', '9-Integrated', 4, 'Break', 15, NULL, NULL, 'break', NULL),
  ('EM9_INT_g9_int_block_5', 'EM9_INT', 'g9_int_block', '9-Integrated', 5, 'Growth Mindset/SEL/College Readiness', 30, NULL, NULL, 'enrichment', 'https://docs.google.com/spreadsheets/d/107zW8Q9QmIMSHN4Q-pS54QFmOPAb2D-g3ZFecsvqP10/copy?usp=sharing'),
  ('EM9_INT_g9_int_block_6', 'EM9_INT', 'g9_int_block', '9-Integrated', 6, 'Performance Task and/or FAL (continue)', 30, NULL, NULL, 'performance_task', NULL),
  ('EM9_INT_g9_int_block_7', 'EM9_INT', 'g9_int_block', '9-Integrated', 7, 'Break', 15, NULL, NULL, 'break', NULL),
  ('EM9_INT_g9_int_block_8', 'EM9_INT', 'g9_int_block', '9-Integrated', 8, 'Performance Task and/or FAL (continue)', 50, NULL, NULL, 'performance_task', NULL),
  ('EM9_INT_g9_int_block_9', 'EM9_INT', 'g9_int_block', '9-Integrated', 9, 'Closing', 10, NULL, NULL, 'closing', NULL)
ON CONFLICT (id) DO NOTHING;
