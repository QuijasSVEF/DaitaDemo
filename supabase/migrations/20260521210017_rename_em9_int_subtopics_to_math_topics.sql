/*
  # Rename EM9_INT Subtopics to Math Topic Names

  1. Modified Data
    - `em_subtopics`: Rename all 17 EM9_INT subtopics from activity/task names to proper math topic names
    - Matches the naming convention used by EM9_ALG1, EM9_GEO, and other levels

  2. Notes
    - Previous names referenced specific tasks (e.g., "Linda's Tiles", "Skateboarding Tricks")
    - New names describe the mathematical content being taught
    - No structural changes, only title updates
*/

UPDATE em_subtopics SET title = 'Modeling Expressions', updated_at = now()
WHERE id = 'em9int_m1_s1';

UPDATE em_subtopics SET title = 'Interpreting Equations', updated_at = now()
WHERE id = 'em9int_m1_s2';

UPDATE em_subtopics SET title = 'Interpreting Algebraic Expressions', updated_at = now()
WHERE id = 'em9int_m1_s3';

UPDATE em_subtopics SET title = 'Equivalent Expressions and Structure', updated_at = now()
WHERE id = 'em9int_m1_s4';

UPDATE em_subtopics SET title = 'Generalizing Patterns', updated_at = now()
WHERE id = 'em9int_m2_s1';

UPDATE em_subtopics SET title = 'Linear and Nonlinear Patterns', updated_at = now()
WHERE id = 'em9int_m2_s2';

UPDATE em_subtopics SET title = 'Sequences and Functions', updated_at = now()
WHERE id = 'em9int_m2_s3';

UPDATE em_subtopics SET title = 'Geometric Patterns and Expressions', updated_at = now()
WHERE id = 'em9int_m2_s4';

UPDATE em_subtopics SET title = 'Introduction to Transformations', updated_at = now()
WHERE id = 'em9int_m3_s1';

UPDATE em_subtopics SET title = 'Translations, Reflections, and Rotations', updated_at = now()
WHERE id = 'em9int_m3_s2';

UPDATE em_subtopics SET title = 'Transforming 2D Figures', updated_at = now()
WHERE id = 'em9int_m3_s3';

UPDATE em_subtopics SET title = 'Rigid Motion and Congruence', updated_at = now()
WHERE id = 'em9int_m3_s4';

UPDATE em_subtopics SET title = 'Tessellations and Composite Transformations', updated_at = now()
WHERE id = 'em9int_m3_s5';

UPDATE em_subtopics SET title = 'Solving Linear Equations', updated_at = now()
WHERE id = 'em9int_m4_s1';

UPDATE em_subtopics SET title = 'Classifying Solutions to Systems of Equations', updated_at = now()
WHERE id = 'em9int_m4_s2';

UPDATE em_subtopics SET title = 'Writing and Interpreting Equations', updated_at = now()
WHERE id = 'em9int_m4_s3';

UPDATE em_subtopics SET title = 'Solving Systems of Equations', updated_at = now()
WHERE id = 'em9int_m4_s4';
