/*
# Seed Demo Data

Seeds the demo workflow with:
- 5 demo students in "Class A" group
- 3 math assessments (Fractions, Algebra Basics, Geometry)
- 5 questions per assessment, each tagged with a topic
- 5 pre-designed lessons (one per topic area)
- Topic-to-lesson mapping is implicit via the `topic` column matching between questions and lessons

## Students
- Jane D (emoji: star)
- Marcus T (emoji: rocket)
- Sofia R (emoji: rainbow)
- Liam K (emoji: lightning)
- Ava M (emoji: flower)

## Assessments
1. Fractions Fundamentals - 5 questions covering: adding fractions, subtracting fractions, multiplying fractions, comparing fractions, mixed numbers
2. Algebra Basics - 5 questions covering: solving equations, variables, order of operations, expressions, inequalities
3. Geometry Essentials - 5 questions covering: area, perimeter, angles, shapes, volume

## Lessons (pre-designed, mapped to topics)
- Adding & Subtracting Fractions (topic: fractions_operations)
- Multiplying & Comparing Fractions (topic: fractions_advanced)
- Solving Equations & Variables (topic: algebra_equations)
- Order of Operations & Expressions (topic: algebra_expressions)
- Area, Perimeter & Angles (topic: geometry_measurement)
*/

-- Insert demo students
INSERT INTO demo_students (id, first_name, last_initial, emoji, group_name) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Jane', 'D', '⭐', 'Class A'),
  ('a1000000-0000-0000-0000-000000000002', 'Marcus', 'T', '🚀', 'Class A'),
  ('a1000000-0000-0000-0000-000000000003', 'Sofia', 'R', '🌈', 'Class A'),
  ('a1000000-0000-0000-0000-000000000004', 'Liam', 'K', '⚡', 'Class A'),
  ('a1000000-0000-0000-0000-000000000005', 'Ava', 'M', '🌸', 'Class A')
ON CONFLICT (id) DO NOTHING;

-- Insert demo assessments
INSERT INTO demo_assessments (id, title, subject, description) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'Fractions Fundamentals', 'Math', 'Test your understanding of fraction operations including adding, subtracting, multiplying, and comparing fractions.'),
  ('b2000000-0000-0000-0000-000000000002', 'Algebra Basics', 'Math', 'Assess foundational algebra skills including solving equations, working with variables, and understanding expressions.'),
  ('b2000000-0000-0000-0000-000000000003', 'Geometry Essentials', 'Math', 'Evaluate knowledge of geometric concepts including area, perimeter, angles, and volume.')
ON CONFLICT (id) DO NOTHING;

-- Fractions Fundamentals Questions
INSERT INTO demo_assessment_questions (id, assessment_id, question_text, topic, options, correct_answer, order_num) VALUES
  ('c3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001',
   'What is 1/4 + 2/4?', 'fractions_operations',
   '["1/4", "3/4", "3/8", "2/4"]', '3/4', 1),
  ('c3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001',
   'What is 5/6 - 1/6?', 'fractions_operations',
   '["4/6", "6/6", "4/12", "1/3"]', '4/6', 2),
  ('c3000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001',
   'What is 2/3 × 3/4?', 'fractions_advanced',
   '["6/12", "5/7", "2/4", "6/7"]', '6/12', 3),
  ('c3000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000001',
   'Which fraction is larger: 3/5 or 2/3?', 'fractions_advanced',
   '["3/5", "2/3", "They are equal", "Cannot compare"]', '2/3', 4),
  ('c3000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000001',
   'Convert 7/4 to a mixed number.', 'fractions_operations',
   '["1 3/4", "2 1/4", "1 1/2", "3/4"]', '1 3/4', 5)
ON CONFLICT (id) DO NOTHING;

-- Algebra Basics Questions
INSERT INTO demo_assessment_questions (id, assessment_id, question_text, topic, options, correct_answer, order_num) VALUES
  ('c3000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000002',
   'Solve for x: x + 5 = 12', 'algebra_equations',
   '["5", "7", "17", "12"]', '7', 1),
  ('c3000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000002',
   'Solve for y: 3y = 15', 'algebra_equations',
   '["3", "5", "12", "45"]', '5', 2),
  ('c3000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000002',
   'What is the value of 4 + 3 × 2?', 'algebra_expressions',
   '["14", "10", "9", "12"]', '10', 3),
  ('c3000000-0000-0000-0000-000000000009', 'b2000000-0000-0000-0000-000000000002',
   'Simplify: 2x + 3x', 'algebra_expressions',
   '["5x", "6x", "5x²", "23x"]', '5x', 4),
  ('c3000000-0000-0000-0000-000000000010', 'b2000000-0000-0000-0000-000000000002',
   'Which value of x makes x - 4 > 2 true?', 'algebra_equations',
   '["4", "5", "6", "7"]', '7', 5)
ON CONFLICT (id) DO NOTHING;

-- Geometry Essentials Questions
INSERT INTO demo_assessment_questions (id, assessment_id, question_text, topic, options, correct_answer, order_num) VALUES
  ('c3000000-0000-0000-0000-000000000011', 'b2000000-0000-0000-0000-000000000003',
   'What is the area of a rectangle with length 8 and width 5?', 'geometry_measurement',
   '["13", "26", "40", "45"]', '40', 1),
  ('c3000000-0000-0000-0000-000000000012', 'b2000000-0000-0000-0000-000000000003',
   'What is the perimeter of a square with side length 6?', 'geometry_measurement',
   '["12", "24", "36", "18"]', '24', 2),
  ('c3000000-0000-0000-0000-000000000013', 'b2000000-0000-0000-0000-000000000003',
   'What is the sum of angles in a triangle?', 'geometry_measurement',
   '["90°", "180°", "270°", "360°"]', '180°', 3),
  ('c3000000-0000-0000-0000-000000000014', 'b2000000-0000-0000-0000-000000000003',
   'How many sides does a hexagon have?', 'geometry_measurement',
   '["5", "6", "7", "8"]', '6', 4),
  ('c3000000-0000-0000-0000-000000000015', 'b2000000-0000-0000-0000-000000000003',
   'What is the volume of a cube with side length 3?', 'geometry_measurement',
   '["9", "18", "27", "36"]', '27', 5)
ON CONFLICT (id) DO NOTHING;

-- Insert pre-designed lessons
INSERT INTO demo_lessons (id, title, topic, subject, description, content) VALUES
  ('d4000000-0000-0000-0000-000000000001', 'Adding & Subtracting Fractions', 'fractions_operations', 'Math',
   'Learn the fundamentals of adding and subtracting fractions with like and unlike denominators.',
   '{"sections": [{"title": "Finding Common Denominators", "body": "To add or subtract fractions, they must share the same denominator. Find the least common multiple (LCM) of the denominators.", "example": "1/3 + 1/4 → Find LCM of 3 and 4 = 12 → 4/12 + 3/12 = 7/12"}, {"title": "Adding Fractions", "body": "Once denominators match, add the numerators and keep the denominator the same.", "example": "2/5 + 1/5 = 3/5"}, {"title": "Subtracting Fractions", "body": "Subtract the numerators while keeping the common denominator.", "example": "5/8 - 3/8 = 2/8 = 1/4"}, {"title": "Mixed Numbers", "body": "To convert an improper fraction to a mixed number, divide the numerator by the denominator.", "example": "7/4 = 1 remainder 3 = 1 3/4"}], "practice_problems": ["1/3 + 1/6 = ?", "3/4 - 1/2 = ?", "Convert 11/3 to a mixed number"]}'),

  ('d4000000-0000-0000-0000-000000000002', 'Multiplying & Comparing Fractions', 'fractions_advanced', 'Math',
   'Master multiplication of fractions and learn strategies for comparing fractions.',
   '{"sections": [{"title": "Multiplying Fractions", "body": "Multiply numerators together and denominators together. Simplify the result.", "example": "2/3 × 3/4 = 6/12 = 1/2"}, {"title": "Cross Multiplication for Comparing", "body": "To compare fractions, cross multiply. The larger product indicates the larger fraction.", "example": "Compare 3/5 and 2/3: 3×3=9 vs 5×2=10. Since 10>9, 2/3 > 3/5"}, {"title": "Using Benchmarks", "body": "Compare fractions to familiar benchmarks like 1/2. If one fraction is more than 1/2 and another is less, the comparison is clear.", "example": "3/7 < 1/2 < 4/7"}], "practice_problems": ["3/5 × 2/7 = ?", "Which is larger: 4/9 or 5/11?", "Multiply and simplify: 4/6 × 3/8"]}'),

  ('d4000000-0000-0000-0000-000000000003', 'Solving Equations & Variables', 'algebra_equations', 'Math',
   'Build skills in solving one-step and two-step equations, and understanding inequalities.',
   '{"sections": [{"title": "One-Step Equations", "body": "Use inverse operations to isolate the variable. Addition undoes subtraction, multiplication undoes division.", "example": "x + 5 = 12 → x = 12 - 5 → x = 7"}, {"title": "Two-Step Equations", "body": "First undo addition/subtraction, then undo multiplication/division.", "example": "3y + 2 = 17 → 3y = 15 → y = 5"}, {"title": "Inequalities", "body": "Solve like equations, but flip the sign when multiplying or dividing by a negative.", "example": "x - 4 > 2 → x > 6 (any value greater than 6 works, like 7)"}], "practice_problems": ["Solve: x - 8 = 3", "Solve: 4m = 28", "Find values where x + 2 > 5"]}'),

  ('d4000000-0000-0000-0000-000000000004', 'Order of Operations & Expressions', 'algebra_expressions', 'Math',
   'Understand PEMDAS and learn to simplify algebraic expressions by combining like terms.',
   '{"sections": [{"title": "PEMDAS", "body": "Follow the order: Parentheses, Exponents, Multiplication/Division (left to right), Addition/Subtraction (left to right).", "example": "4 + 3 × 2 = 4 + 6 = 10 (multiply before adding)"}, {"title": "Combining Like Terms", "body": "Terms with the same variable can be combined. Add their coefficients.", "example": "2x + 3x = 5x (both terms have x, so add 2+3)"}, {"title": "Distributive Property", "body": "Multiply the outside term by each term inside the parentheses.", "example": "3(x + 4) = 3x + 12"}], "practice_problems": ["Evaluate: 2 + 5 × 3 - 1", "Simplify: 4a + 2b + 3a", "Expand: 2(y + 6)"]}'),

  ('d4000000-0000-0000-0000-000000000005', 'Area, Perimeter & Angles', 'geometry_measurement', 'Math',
   'Review formulas for area and perimeter of common shapes, angle relationships, and volume basics.',
   '{"sections": [{"title": "Area Formulas", "body": "Rectangle: length × width. Triangle: 1/2 × base × height. Circle: π × r².", "example": "Rectangle 8×5: Area = 40 square units"}, {"title": "Perimeter", "body": "Add all side lengths. For a rectangle: 2(length + width). For a square: 4 × side.", "example": "Square side 6: Perimeter = 4 × 6 = 24"}, {"title": "Angle Relationships", "body": "Triangle angles sum to 180°. Quadrilateral angles sum to 360°. A straight line is 180°.", "example": "Triangle with angles 60° and 80°: third angle = 180° - 60° - 80° = 40°"}, {"title": "Volume", "body": "Cube: side³. Rectangular prism: length × width × height.", "example": "Cube side 3: Volume = 3³ = 27 cubic units"}], "practice_problems": ["Find area of triangle with base 10, height 6", "Perimeter of rectangle 7 by 3", "Volume of rectangular prism 4×5×2"]}')
ON CONFLICT (id) DO NOTHING;
