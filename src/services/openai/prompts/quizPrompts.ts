export const GENERATE_QUIZ_PROMPT = (settings: {
  topic: string;
  subtopics: string[];
  questionTypes: string[];
  numQuestions: number;
  gradeLevel: string;
  difficulty: string;
  emContext?: {
    levelTitle?: string;
    moduleTitle?: string;
    subtopicTitles?: string[];
    bigIdeas?: string[];
    academicVocabulary?: string[];
    commonMisconceptions?: string[];
    alignedStandards?: string[];
    dokLevel?: number | null;
  };
}) => `Generate a math quiz with the following specifications:

Topic: ${settings.topic}
Subtopics: ${settings.subtopics.join(', ')}
Question Types: ${settings.questionTypes.join(', ')}
Number of Questions: ${settings.numQuestions}
Grade Level: ${settings.gradeLevel}
Difficulty: ${settings.difficulty}
${settings.emContext ? `
Curriculum Context (Elevate Math):
- Level: ${settings.emContext.levelTitle || ''}
- Module: ${settings.emContext.moduleTitle || ''}
- Subtopics covered: ${(settings.emContext.subtopicTitles || []).join('; ')}
- Big ideas to reinforce: ${(settings.emContext.bigIdeas || []).join('; ') || 'n/a'}
- Academic vocabulary students should know: ${(settings.emContext.academicVocabulary || []).join(', ') || 'n/a'}
- Common misconceptions to probe with distractors: ${(settings.emContext.commonMisconceptions || []).join('; ') || 'n/a'}
- Aligned standards: ${(settings.emContext.alignedStandards || []).join(', ') || 'n/a'}
${settings.emContext.dokLevel ? `- Target Depth of Knowledge (DOK): ${settings.emContext.dokLevel}` : ''}
` : ''}

For each question, provide:
1. Question text
2. Correct answer
3. Detailed explanation
4. Multiple choice options (4 options)
5. Question type
6. Specific subtopic
7. A "visual" field (WHEN APPROPRIATE - see formatting rules below)

VISUAL FORMATTING RULES:
When a problem involves data sets, value pairs, proportional relationships, direct/inverse variation, function tables, input/output patterns, or ordered pairs, you MUST include a "visual" field so the data displays in a structured format (table, number line, or coordinate plot) rather than listing numbers inline.

Supported visual types and their data structures:
- "table": Use when displaying x/y pairs, function tables, data sets, or any organized values. Data format: { "headers": ["x", "y"], "rows": [["1", "5"], ["2", "10"], ["3", "15"]] }
- "number_line": Use when showing positions on a number line, comparing values, or ordering numbers. Data format: { "min": 0, "max": 10, "points": [{"value": 3, "label": "A"}, {"value": 7, "label": "B"}] }
- "coordinate_plot": Use when displaying ordered pairs or plotting points on a coordinate plane. Data format: { "points": [{"x": 1, "y": 2}, {"x": 3, "y": 6}], "xLabel": "x", "yLabel": "y" }
- "multi_table": Use when comparing multiple tables (e.g., "Which table shows a proportional relationship?"). Data format: { "tables": [{ "label": "Table A", "headers": ["x", "y"], "rows": [["1", "5"], ["2", "9"]] }, { "label": "Table B", "headers": ["x", "y"], "rows": [["1", "3"], ["2", "6"]] }] }
- "dot_plot": Use when showing frequency distributions, data collected from surveys, or "how many students" type problems. Data format: { "values": [3, 5, 5, 6, 6, 6, 7, 7, 8], "label": "Books Read" }
- "bar_chart": Use when comparing categories, tallies, or showing frequency across named groups. Data format: { "categories": ["Math", "Science", "Reading"], "values": [5, 3, 7], "xLabel": "Subject", "yLabel": "Students" }

If the question does NOT need a visual (e.g., simple computation, word problems without data), omit the "visual" field entirely.

Format your response as a JSON array of questions:
{
  "questions": [
    {
      "questionText": "...",
      "correctAnswer": "...",
      "explanation": "...",
      "options": ["...", "...", "...", "..."],
      "type": "...",
      "subtopic": "...",
      "visual": {
        "type": "table",
        "data": { "headers": ["x", "y"], "rows": [["1", "3"], ["2", "6"], ["3", "9"], ["4", "12"]] },
        "caption": "Optional description"
      }
    }
  ]
}

Requirements:
1. Questions should be grade-appropriate
2. Include a mix of question types as specified
3. Ensure clear and concise wording
4. Provide step-by-step explanations
5. Include relevant mathematical notation where appropriate
6. Make distractors (wrong options) plausible but clearly incorrect
7. Vary the difficulty within the specified level
8. CRITICAL: Place the correct answer in DIFFERENT positions among the 4 options across questions. Do NOT always put the correct answer first. Distribute correct answers roughly evenly across all four positions.
9. Generate UNIQUE and ORIGINAL questions every time. Use different numbers, contexts, scenarios, and phrasing than any previously generated set. Vary real-world contexts for word problems.
10. Each question must be distinct in structure and approach - avoid repetitive patterns.
11. CRITICAL: When a question involves pairs of values, data tables, proportional relationships, direct variation, or function patterns, ALWAYS include a "visual" field with type "table" so the data appears in a structured table format (matching how students see it in their Elevate Math curriculum workbooks). Do NOT just list numbers in the question text.
12. MANDATORY: If the question text says "The table shows..." or "Use the table..." or references a table in any way, you MUST include a "visual" field of type "table" with the actual data. A question CANNOT reference a table without providing the table data in the visual field. This is non-negotiable.
13. NEVER embed table data as comma-separated text inside questionText. The questionText should only contain the question sentence (e.g., "Which ratio of notebooks to folders matches the table?"). All data belongs in the "visual" field.

WRONG (inline data - NEVER do this):
  "questionText": "A table shows notebooks and folders. Notebooks, Folders 8, 14 Notebooks, Folders 12, 21 Notebooks, Folders 16, 28. Which ratio matches?"

CORRECT (structured visual - ALWAYS do this):
  "questionText": "A table shows the number of notebooks and folders in supply kits. Which ratio of notebooks to folders matches the table?",
  "visual": { "type": "table", "data": { "headers": ["Notebooks", "Folders"], "rows": [["8", "14"], ["12", "21"], ["16", "28"]] } }

14. If a question involves a diagram, shape, chart, or any visual concept that cannot be shown with a table/number_line/coordinate_plot, describe it clearly in the questionText with labeled measurements and relationships. Do NOT say "look at the diagram" without providing the data needed to answer the question.

15. MANDATORY: When a question asks students to compare multiple tables (e.g., "Which table shows a proportional relationship between x and y?"), use the "multi_table" visual type. Each option (Table A, Table B, etc.) MUST have its data defined in the visual field. Example:
  "questionText": "Which table shows a proportional relationship between x and y?",
  "options": ["Table A", "Table B", "Table C", "Table D"],
  "visual": { "type": "multi_table", "data": { "tables": [
    { "label": "Table A", "headers": ["x", "y"], "rows": [["1", "5"], ["2", "9"]] },
    { "label": "Table B", "headers": ["x", "y"], "rows": [["1", "3"], ["2", "6"], ["4", "12"]] },
    { "label": "Table C", "headers": ["x", "y"], "rows": [["2", "4"], ["4", "7"]] },
    { "label": "Table D", "headers": ["x", "y"], "rows": [["1", "2"], ["2", "5"]] }
  ] } }

16. MANDATORY: When a question references a "line plot", "dot plot", or data collected from students/objects, ALWAYS include a "dot_plot" visual with the actual data values. Never reference a plot without providing the values. Example:
  "questionText": "The dot plot shows the number of books 8 students read. What is the median?",
  "visual": { "type": "dot_plot", "data": { "values": [2, 3, 3, 4, 4, 4, 5, 6], "label": "Books Read" } }

17. MANDATORY: When a question references a "bar chart", "bar graph", "histogram", or "tally chart" with named categories, ALWAYS include a "bar_chart" visual. Example:
  "questionText": "The bar chart shows favorite subjects. How many more students prefer Math than Science?",
  "visual": { "type": "bar_chart", "data": { "categories": ["Math", "Science", "Reading", "Art"], "values": [8, 5, 6, 4], "xLabel": "Subject", "yLabel": "Number of Students" } }

18. CRITICAL: When a question says "the table shows the number of [items] [N] [people] [did something]" and involves computing mean/median/mode/range, you MUST include a "table" visual listing each person/item and their value. Example:
  "questionText": "The table shows the number of books 5 students read during a reading challenge. What is the mean number of books read?",
  "visual": { "type": "table", "data": { "headers": ["Student", "Books Read"], "rows": [["1", "6"], ["2", "9"], ["3", "7"], ["4", "10"], ["5", "8"]] } }

Generation ID: ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const VALIDATE_ANSWER_PROMPT = (
  question: string,
  studentAnswer: string,
  correctAnswer: string
) => `Evaluate this student's math answer:

Question: ${question}
Student's Answer: ${studentAnswer}
Correct Answer: ${correctAnswer}

Provide your response in this format:
{
  "isCorrect": boolean,
  "explanation": "Detailed explanation of why the answer is correct/incorrect",
  "hints": ["Helpful hint 1", "Helpful hint 2"]
}`;