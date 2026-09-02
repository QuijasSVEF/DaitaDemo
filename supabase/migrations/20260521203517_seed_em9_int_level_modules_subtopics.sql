/*
  # Seed Elevate Math 9th Grade Integrated (EM9_INT) - Level, Modules, Subtopics

  1. New Data
    - `em_levels`: 1 new level - EM9_INT (Elevate Math Integrated Math, Grade 9)
    - `em_modules`: 4 modules
      - Module 1: Interpreting the Structure of Expressions (9 days)
      - Module 2: Math Functions (10 days)
      - Module 3: Congruence and Rigid Motion (10 days)
      - Module 4: Reasoning with Linear Equations (10 days)
    - `em_subtopics`: 18 subtopics across all 4 modules

  2. Notes
    - This is the 3rd of 3 Grade 9 pathways (alongside EM9_ALG1 and EM9_GEO)
    - Integrated Math 1 pathway covering expressions, functions, geometry, and linear equations
    - All INSERTs use ON CONFLICT for idempotency
*/

-- Level
INSERT INTO em_levels (level_code, title, grade_level, description, overview, total_program_days, source_file_id, source_modified, version_note, sort_order)
VALUES (
  'EM9_INT',
  'Elevate Math 9th Grade Integrated',
  '9',
  'SVEF Elevate [Math] Curriculum, Integrated Math 1 (high school integrated pathway). 4-module program covering Interpreting the Structure of Expressions, Math Functions, Congruence and Rigid Motion, and Reasoning with Linear Equations. Performance Task and FAL arcs with full Nearpod-ready teacher and student-paced lessons.',
  NULL,
  NULL,
  'Copy_of_Grade_9_Module_Overview_-_Int_.xlsx',
  NULL,
  '3 of 3 EM9 versions — Integrated Math 1 pathway',
  0
) ON CONFLICT (level_code) DO UPDATE SET
  title = EXCLUDED.title,
  grade_level = EXCLUDED.grade_level,
  description = EXCLUDED.description,
  overview = EXCLUDED.overview,
  total_program_days = EXCLUDED.total_program_days,
  version_note = EXCLUDED.version_note,
  updated_at = now();

-- Module 1: Interpreting the Structure of Expressions
INSERT INTO em_modules (id, level_code, parent_id, order_index, title, overview, big_ideas, standards, standards_summary, academic_vocabulary, common_misconceptions, concepts, duration_days)
VALUES (
  'em9int_m1', 'EM9_INT', 'em9_integrated', 1,
  'Interpreting the Structure of Expressions',
  'In order to make sense of the world, students will make sense of problems and persevere in solving them while exploring changing quantities.',
  '["Features of Functions: Students investigate changing situations that are modeled by quadratic and exponential forms of expressions and create equivalent expressions to reveal features that help understand the meaning of the problem and situation being investigated.", "Investigate patterns, such as the Fibonacci sequence and other mathematical patterns, that reveal recursive functions."]'::jsonb,
  '[{"code": "9.A-SSE.1", "text": "Interpret the structure of expressions."}, {"code": "9.A-SSE.2", "text": "Use the structure of an expression to identify ways to rewrite it."}]'::jsonb,
  'Interpret the structure of expressions and write expressions in equivalent forms to solve problems.',
  '["expression", "equation", "equality", "equivalent expressions", "variables", "unknowns", "area models", "area diagram", "distributive property", "order of operations", "parenthesis", "exponents"]'::jsonb,
  '["Students consider that there is just one correct expression.", "Students confuse order of operations when given parenthesis and exponents.", "Students assume often times that if there are parenthesis in an expression that this expression must represent only the distributive property."]'::jsonb,
  '["Students in Mathematics I work with expressions, analysis of situations and attend to the structure of linear expressions. An expression can be viewed as a recipe for a calculation with numbers, symbols that represent numbers, arithmetic operations, exponentiation, and, at more advanced levels, the operation of evaluating a function."]'::jsonb,
  9
) ON CONFLICT (id) DO UPDATE SET
  level_code = EXCLUDED.level_code, title = EXCLUDED.title, overview = EXCLUDED.overview,
  big_ideas = EXCLUDED.big_ideas, standards = EXCLUDED.standards, standards_summary = EXCLUDED.standards_summary,
  academic_vocabulary = EXCLUDED.academic_vocabulary, common_misconceptions = EXCLUDED.common_misconceptions,
  concepts = EXCLUDED.concepts, duration_days = EXCLUDED.duration_days, updated_at = now();

-- Module 2: Math Functions
INSERT INTO em_modules (id, level_code, parent_id, order_index, title, overview, big_ideas, standards, standards_summary, academic_vocabulary, common_misconceptions, concepts, duration_days)
VALUES (
  'em9int_m2', 'EM9_INT', 'em9_integrated', 2,
  'Math Functions',
  'In order to predict what could happen, students will look for and make use of structure while exploring changing quantities.',
  '["Function Investigations: Students investigate data sets by table and graph and using technology (such as earthquake data in the region of the school); they fit and interpret functions to model the data between two quantities and consider the meaning of inverse relationships. Students interpret information from the functions, noticing key features and symmetries."]'::jsonb,
  '[{"code": "F-BF.1", "text": "Write a function that describes a relationship between two quantities."}, {"code": "A-SSE.3", "text": "Choose and produce an equivalent form of an expression to reveal and explain properties of the quantity represented by the expression."}]'::jsonb,
  'Build functions that model relationships between quantities; write expressions in equivalent forms to reveal properties.',
  '["patterns", "generalizations", "expressions", "equations", "equality", "function", "linear", "exponential", "quadratic", "recursive", "explicit", "domain", "range"]'::jsonb,
  '["A limited understanding students may have of different types of functions and how they generalize patterns."]'::jsonb,
  '["The Mathematics I domain Functions is the foundation and motivation for the study of standards in the other Mathematics I conceptual categories. Functions model a relationship between two quantities."]'::jsonb,
  10
) ON CONFLICT (id) DO UPDATE SET
  level_code = EXCLUDED.level_code, title = EXCLUDED.title, overview = EXCLUDED.overview,
  big_ideas = EXCLUDED.big_ideas, standards = EXCLUDED.standards, standards_summary = EXCLUDED.standards_summary,
  academic_vocabulary = EXCLUDED.academic_vocabulary, common_misconceptions = EXCLUDED.common_misconceptions,
  concepts = EXCLUDED.concepts, duration_days = EXCLUDED.duration_days, updated_at = now();

-- Module 3: Congruence and Rigid Motion
INSERT INTO em_modules (id, level_code, parent_id, order_index, title, overview, big_ideas, standards, standards_summary, academic_vocabulary, common_misconceptions, concepts, duration_days)
VALUES (
  'em9int_m3', 'EM9_INT', 'em9_integrated', 3,
  'Congruence and Rigid Motion',
  'Students study the concepts of congruence, similarity, and symmetry from the perspective of geometric transformation.',
  '["Geospatial Data: Explore geospatial data that represent either locations (e.g., maps) or objects, and connect to geometric equations and properties of common shapes.", "This Math I unit is a study of the concepts of congruence, similarity, and symmetry which can be understood from the perspective of geometric transformation. A transformation is a map of a geometric figure to an image that preserves the figure''s structure. One class of transformations is called rigid-motion. Fundamental are the rigid motions: translations, rotations, and combinations of these."]'::jsonb,
  '[{"code": "G-CO.2", "text": "Represent transformations in the plane using, e.g., transparencies and geometry software; describe transformations as functions that take points in the plane as inputs and give other points as outputs."}, {"code": "G-CO.3", "text": "Given a rectangle, a parallelogram, trapezoid, or regular polygon, describe the rotations and reflections that carry it onto itself."}, {"code": "G-CO.5", "text": "Given a geometric figure and a rotation, reflection, or translation, draw the transformed figure using, e.g., graph paper, tracing paper, or geometry software."}]'::jsonb,
  'Experiment with transformations in the plane; understand congruence in terms of rigid motions.',
  '["rigid motion transformation", "transformations", "translations", "reflections", "rotations", "dilations", "Cartesian Plane", "horizontal", "vertical", "symmetry", "rotational symmetry", "line of reflection", "composite", "isometry", "congruence", "ordered pair", "clockwise", "counter-clockwise", "1/4 turn", "1/2 turn", "pre-image", "image", "tessellation"]'::jsonb,
  '["Students tend to confuse reflect with rotate.", "Students tend to believe that a point of rotation is always on the shape rather than considering a point of rotation could be in the plane outside of the shape.", "Reflection Issues: Reflect on x-axis or y-axis instead of the line of reflection; struggle when line of reflection is not horizontal or vertical.", "Students confuse terms: Horizontal and vertical; Translate instead of reflect; Translations and transformations; Clockwise and counter-clockwise; Rotation vs. Reflection.", "X and y coordinate confusion.", "Negative dilation vs. fractional dilation."]'::jsonb,
  '["There are three basic rigid motions transformations — translations, rotations and reflections."]'::jsonb,
  10
) ON CONFLICT (id) DO UPDATE SET
  level_code = EXCLUDED.level_code, title = EXCLUDED.title, overview = EXCLUDED.overview,
  big_ideas = EXCLUDED.big_ideas, standards = EXCLUDED.standards, standards_summary = EXCLUDED.standards_summary,
  academic_vocabulary = EXCLUDED.academic_vocabulary, common_misconceptions = EXCLUDED.common_misconceptions,
  concepts = EXCLUDED.concepts, duration_days = EXCLUDED.duration_days, updated_at = now();

-- Module 4: Reasoning with Linear Equations
INSERT INTO em_modules (id, level_code, parent_id, order_index, title, overview, big_ideas, standards, standards_summary, academic_vocabulary, common_misconceptions, concepts, duration_days)
VALUES (
  'em9int_m4', 'EM9_INT', 'em9_integrated', 4,
  'Reasoning with Linear Equations',
  'In order to make sense of the world, students will make sense of problems and persevere in solving them while exploring changing quantities.',
  '["Systems of Equations: Students investigate real situations that include data for which systems of 1 or 2 equations or inequalities are helpful, paying attention to units. Investigations include linear, quadratic, and absolute value. Students use technology tools strategically to find solutions and approximate solutions."]'::jsonb,
  '[{"code": "A-REI.1", "text": "Explain each step in solving a simple equation as following from the equality of numbers asserted at the previous step, starting from the assumption that the original equation has a solution. Construct a viable argument to justify a solution method."}, {"code": "A-REI.3", "text": "Solve linear equations and inequalities in one variable, including equations with coefficients represented by letters."}, {"code": "A-REI.6", "text": "Solve systems of linear equations exactly and approximately (e.g., with graphs), focusing on pairs of linear equations in two variables."}]'::jsonb,
  'Solve equations and inequalities in one variable; solve systems of equations.',
  '["linear equation", "system of equations", "solution", "graphical method", "substitution", "elimination", "intersect", "variable", "coefficient", "inequality"]'::jsonb,
  '["Students think that solving equations can only be done in one way.", "Students think that there is one and only one correct equation.", "Students do not understand that different methods of solving systems will produce the same result.", "Students do not understand that in a graphing method, the intersection of two lines is the solution."]'::jsonb,
  '["Students in Mathematics I create, build, and solve equations with reasoning and justification. An equation is a statement of equality between two expressions, often viewed as a question asking for which values of the variables the expressions on either side are in fact equal."]'::jsonb,
  10
) ON CONFLICT (id) DO UPDATE SET
  level_code = EXCLUDED.level_code, title = EXCLUDED.title, overview = EXCLUDED.overview,
  big_ideas = EXCLUDED.big_ideas, standards = EXCLUDED.standards, standards_summary = EXCLUDED.standards_summary,
  academic_vocabulary = EXCLUDED.academic_vocabulary, common_misconceptions = EXCLUDED.common_misconceptions,
  concepts = EXCLUDED.concepts, duration_days = EXCLUDED.duration_days, updated_at = now();

-- Subtopics for Module 1
INSERT INTO em_subtopics (id, module_id, level_code, order_index, title, description, day_range, post_assessment, fal_focus, dok_level, default_difficulty, aligned_standards) VALUES
  ('em9int_m1_s1', 'em9int_m1', 'EM9_INT', 1, 'Modeling Expressions', NULL, NULL, NULL, NULL, 2, 'medium', '["9.A-SSE.1"]'::jsonb),
  ('em9int_m1_s2', 'em9int_m1', 'EM9_INT', 2, 'Interpreting Equations (FAL 1A)', NULL, NULL, NULL, NULL, 3, 'hard', '["9.A-SSE.1"]'::jsonb),
  ('em9int_m1_s3', 'em9int_m1', 'EM9_INT', 3, 'Interpreting Algebraic Expressions (FAL 1B)', NULL, NULL, NULL, NULL, 3, 'hard', '["9.A-SSE.1", "9.A-SSE.2"]'::jsonb),
  ('em9int_m1_s4', 'em9int_m1', 'EM9_INT', 4, 'Matching Cards / It is Just an Expression', NULL, NULL, NULL, NULL, 3, 'hard', '["9.A-SSE.1"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id, level_code = EXCLUDED.level_code, title = EXCLUDED.title,
  dok_level = EXCLUDED.dok_level, default_difficulty = EXCLUDED.default_difficulty,
  aligned_standards = EXCLUDED.aligned_standards, updated_at = now();

-- Subtopics for Module 2
INSERT INTO em_subtopics (id, module_id, level_code, order_index, title, description, day_range, post_assessment, fal_focus, dok_level, default_difficulty, aligned_standards) VALUES
  ('em9int_m2_s1', 'em9int_m2', 'EM9_INT', 1, 'Generating Patterns - Table Tiles (FAL 2)', NULL, NULL, NULL, NULL, 3, 'hard', '["F-BF.1"]'::jsonb),
  ('em9int_m2_s2', 'em9int_m2', 'EM9_INT', 2, 'Vertical Slice Tasks', NULL, NULL, NULL, NULL, 3, 'hard', '["F-BF.1", "A-SSE.3"]'::jsonb),
  ('em9int_m2_s3', 'em9int_m2', 'EM9_INT', 3, 'Trapezoidal Numbers / Patterns Tasks', NULL, NULL, NULL, NULL, 3, 'hard', '["F-BF.1"]'::jsonb),
  ('em9int_m2_s4', 'em9int_m2', 'EM9_INT', 4, 'Linda''s Tiles', NULL, NULL, NULL, NULL, 3, 'hard', '["F-BF.1"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id, level_code = EXCLUDED.level_code, title = EXCLUDED.title,
  dok_level = EXCLUDED.dok_level, default_difficulty = EXCLUDED.default_difficulty,
  aligned_standards = EXCLUDED.aligned_standards, updated_at = now();

-- Subtopics for Module 3
INSERT INTO em_subtopics (id, module_id, level_code, order_index, title, description, day_range, post_assessment, fal_focus, dok_level, default_difficulty, aligned_standards) VALUES
  ('em9int_m3_s1', 'em9int_m3', 'EM9_INT', 1, 'Skateboarding Tricks (Introduction to Transformations)', NULL, NULL, NULL, NULL, 2, 'medium', '["G-CO.2"]'::jsonb),
  ('em9int_m3_s2', 'em9int_m3', 'EM9_INT', 2, 'Transformations Explorations 1-6 (Translation, Reflection, Rotation, Review)', NULL, NULL, NULL, NULL, 2, 'medium', '["G-CO.2", "G-CO.3", "G-CO.5"]'::jsonb),
  ('em9int_m3_s3', 'em9int_m3', 'EM9_INT', 3, 'Transforming 2D Figures (FAL)', NULL, NULL, NULL, NULL, 3, 'hard', '["G-CO.5"]'::jsonb),
  ('em9int_m3_s4', 'em9int_m3', 'EM9_INT', 4, 'Rigid Motion and Transforming Triangles', NULL, NULL, NULL, NULL, 3, 'hard', '["G-CO.2", "G-CO.5"]'::jsonb),
  ('em9int_m3_s5', 'em9int_m3', 'EM9_INT', 5, 'MC Escher & Reflect and Rotate (Optional)', NULL, NULL, NULL, NULL, 3, 'hard', '["G-CO.3", "G-CO.5"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id, level_code = EXCLUDED.level_code, title = EXCLUDED.title,
  dok_level = EXCLUDED.dok_level, default_difficulty = EXCLUDED.default_difficulty,
  aligned_standards = EXCLUDED.aligned_standards, updated_at = now();

-- Subtopics for Module 4
INSERT INTO em_subtopics (id, module_id, level_code, order_index, title, description, day_range, post_assessment, fal_focus, dok_level, default_difficulty, aligned_standards) VALUES
  ('em9int_m4_s1', 'em9int_m4', 'EM9_INT', 1, 'Solving Linear Equations (FAL Launch)', NULL, NULL, NULL, NULL, 2, 'medium', '["A-REI.1", "A-REI.3"]'::jsonb),
  ('em9int_m4_s2', 'em9int_m4', 'EM9_INT', 2, 'Classifying Solutions to Systems of Equations (Core FAL)', NULL, NULL, NULL, NULL, 3, 'hard', '["A-REI.6"]'::jsonb),
  ('em9int_m4_s3', 'em9int_m4', 'EM9_INT', 3, 'Words & Equations', NULL, NULL, NULL, NULL, 2, 'medium', '["A-REI.1"]'::jsonb),
  ('em9int_m4_s4', 'em9int_m4', 'EM9_INT', 4, 'The Trip / Buying Chips and Candy (Systems Tasks)', NULL, NULL, NULL, NULL, 3, 'hard', '["A-REI.6"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  module_id = EXCLUDED.module_id, level_code = EXCLUDED.level_code, title = EXCLUDED.title,
  dok_level = EXCLUDED.dok_level, default_difficulty = EXCLUDED.default_difficulty,
  aligned_standards = EXCLUDED.aligned_standards, updated_at = now();
