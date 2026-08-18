/*
# Seed proper demo assessment for teacher quijas

Updates the active quiz_template for teacher 'quijas' with well-formed multiple-choice
questions suitable for the demo student flow. Uses Grade 5 math content covering
Fractions, Geometry, and Number Operations.

1. Modified Tables
  - quiz_templates: Updates the active quiz for 'quijas' with proper questions and metadata

2. Notes
  - Replaces malformed test data with 5 clean multiple-choice questions
  - Each question has 4 options, a correct answer, explanation, and subtopic
*/

UPDATE quiz_templates 
SET 
  title = 'Weekly Math Check-In',
  topic = 'Mixed Math Review',
  subtopics = ARRAY['Fractions', 'Geometry', 'Order of Operations', 'Volume', 'Decimals'],
  grade_level = '5',
  num_questions = 5,
  difficulty = 'medium',
  questions = '[
    {
      "id": "demo-q1",
      "type": "Multiple Choice",
      "questionText": "What is 1/4 + 2/4?",
      "options": ["1/4", "3/4", "3/8", "2/4"],
      "correctAnswer": "3/4",
      "explanation": "When adding fractions with the same denominator, add the numerators and keep the denominator: 1/4 + 2/4 = 3/4",
      "subtopic": "Fractions"
    },
    {
      "id": "demo-q2",
      "type": "Multiple Choice",
      "questionText": "What is the area of a rectangle with length 8 units and width 5 units?",
      "options": ["13 square units", "26 square units", "40 square units", "45 square units"],
      "correctAnswer": "40 square units",
      "explanation": "Area of a rectangle = length x width = 8 x 5 = 40 square units",
      "subtopic": "Geometry"
    },
    {
      "id": "demo-q3",
      "type": "Multiple Choice",
      "questionText": "What is the value of 4 + 3 x 2?",
      "options": ["14", "10", "9", "12"],
      "correctAnswer": "10",
      "explanation": "Following order of operations (PEMDAS), multiply first: 3 x 2 = 6, then add: 4 + 6 = 10",
      "subtopic": "Order of Operations"
    },
    {
      "id": "demo-q4",
      "type": "Multiple Choice",
      "questionText": "What is the volume of a rectangular prism that is 4 units long, 3 units wide, and 2 units tall?",
      "options": ["9 cubic units", "24 cubic units", "20 cubic units", "18 cubic units"],
      "correctAnswer": "24 cubic units",
      "explanation": "Volume = length x width x height = 4 x 3 x 2 = 24 cubic units",
      "subtopic": "Volume"
    },
    {
      "id": "demo-q5",
      "type": "Multiple Choice",
      "questionText": "Which decimal is equivalent to 3/4?",
      "options": ["0.25", "0.34", "0.5", "0.75"],
      "correctAnswer": "0.75",
      "explanation": "To convert 3/4 to a decimal, divide 3 by 4: 3 ÷ 4 = 0.75",
      "subtopic": "Decimals"
    }
  ]'::jsonb,
  processed_questions = '[
    {
      "id": "demo-q1",
      "type": "Multiple Choice",
      "questionText": "What is 1/4 + 2/4?",
      "options": ["1/4", "3/4", "3/8", "2/4"],
      "correctAnswer": "3/4",
      "explanation": "When adding fractions with the same denominator, add the numerators and keep the denominator: 1/4 + 2/4 = 3/4",
      "subtopic": "Fractions"
    },
    {
      "id": "demo-q2",
      "type": "Multiple Choice",
      "questionText": "What is the area of a rectangle with length 8 units and width 5 units?",
      "options": ["13 square units", "26 square units", "40 square units", "45 square units"],
      "correctAnswer": "40 square units",
      "explanation": "Area of a rectangle = length x width = 8 x 5 = 40 square units",
      "subtopic": "Geometry"
    },
    {
      "id": "demo-q3",
      "type": "Multiple Choice",
      "questionText": "What is the value of 4 + 3 x 2?",
      "options": ["14", "10", "9", "12"],
      "correctAnswer": "10",
      "explanation": "Following order of operations (PEMDAS), multiply first: 3 x 2 = 6, then add: 4 + 6 = 10",
      "subtopic": "Order of Operations"
    },
    {
      "id": "demo-q4",
      "type": "Multiple Choice",
      "questionText": "What is the volume of a rectangular prism that is 4 units long, 3 units wide, and 2 units tall?",
      "options": ["9 cubic units", "24 cubic units", "20 cubic units", "18 cubic units"],
      "correctAnswer": "24 cubic units",
      "explanation": "Volume = length x width x height = 4 x 3 x 2 = 24 cubic units",
      "subtopic": "Volume"
    },
    {
      "id": "demo-q5",
      "type": "Multiple Choice",
      "questionText": "Which decimal is equivalent to 3/4?",
      "options": ["0.25", "0.34", "0.5", "0.75"],
      "correctAnswer": "0.75",
      "explanation": "To convert 3/4 to a decimal, divide 3 by 4: 3 ÷ 4 = 0.75",
      "subtopic": "Decimals"
    }
  ]'::jsonb
WHERE teacher_username = 'quijas' AND is_active = true;
