#!/usr/bin/env node

import OpenAI from 'openai';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'src', 'fixtures');

const endpoint = process.env.VITE_AZURE_OPENAI_ENDPOINT || 'https://daita.openai.azure.com/';
const apiKey = process.env.VITE_AZURE_OPENAI_API_KEY;
const deployment = process.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-5.4';
const apiVersion = process.env.VITE_AZURE_OPENAI_API_VERSION || '2025-04-01-preview';

if (!apiKey) {
  console.error('Missing VITE_AZURE_OPENAI_API_KEY. Set it in your .env file before running this script.');
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: `${endpoint}openai/deployments/${deployment}`,
  defaultQuery: { 'api-version': apiVersion },
  defaultHeaders: { 'api-key': apiKey },
  dangerouslyAllowBrowser: true,
});

async function callModel(prompt, label, maxTokens = 4000) {
  console.log(`Capturing ${label}...`);
  try {
    const completion = await client.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: deployment,
      temperature: 0.3,
      max_completion_tokens: maxTokens,
    });
    const content = completion.choices[0].message.content;
    if (!content) {
      console.error(`  No content returned for ${label}`);
      return;
    }
    const fixture = { content };
    const outPath = join(fixturesDir, `${label}.json`);
    writeFileSync(outPath, JSON.stringify(fixture, null, 2) + '\n');
    console.log(`  Saved to ${outPath} (${content.length} chars)`);
  } catch (err) {
    console.error(`  Error capturing ${label}:`, err.message);
  }
}

const GROUPING_PROMPT = (studentData) =>
`Create small learning groups from this student data.
Return ONLY a valid JSON object matching this exact format:
{"groups":[{"focusAreas":["concept"],"students":[1],"recommendedApproach":"strategy"}]}
Input data: ${JSON.stringify(studentData, null, 2)}
CRITICAL GROUPING RULES: Students must only be grouped if they share the EXACT SAME struggle topics.`;

const LESSON_PLAN_PROMPT = (studentInfo, focusAreas) =>
`You are an expert math educator creating a HIGHLY PERSONALIZED 25-minute lesson plan.
Student Data: ${JSON.stringify(studentInfo[0], null, 2)}
Primary Focus Areas: ${JSON.stringify(focusAreas)}
Return ONLY a valid JSON object with: objective, alignedStandards, engagement, representation, actionExpression, wrapup, duration, dokLevels, detailedActivities.`;

const GROUP_LESSON_PLAN_PROMPT = (students, focusAreas) =>
`You are an expert math educator creating a DETAILED 25-minute small-group lesson plan for ${students.length} students.
GROUP FOCUS AREAS: ${JSON.stringify(focusAreas)}
STUDENT DATA: ${JSON.stringify(students)}
Return ONLY valid JSON with: objective, engagement, representation, actionExpression, wrapup, duration, dokLevels, detailedActivities.`;

const QUIZ_PROMPT = (settings) =>
`Generate a math quiz with the following specifications:
Topic: ${settings.topic}
Subtopics: ${settings.subtopics.join(', ')}
Number of Questions: ${settings.numQuestions}
Grade Level: ${settings.gradeLevel}
Difficulty: ${settings.difficulty}
Return ONLY a valid JSON object: {"questions":[{"questionText":"","correctAnswer":"","explanation":"","options":[],"type":"","subtopic":""}]}`;

const RELATED_PROBLEMS_PROMPT = (area, gradeLevel) =>
`Generate 3 practice problems for students struggling with "${area}" at grade ${gradeLevel} level.
Return ONLY a valid JSON object: {"questions":[{"questionText":"","answer":"","explanation":"","difficulty":"","options":[]}]}`;

async function main() {
  mkdirSync(fixturesDir, { recursive: true });

  const sampleStudentData = [
    { id: 1, name: 'Alex', struggles: ['Volume'], score: 2, total: 5 },
    { id: 2, name: 'Sam', struggles: ['Volume'], score: 3, total: 5 },
    { id: 3, name: 'Jordan', struggles: ['Fractions'], score: 1, total: 5 },
    { id: 4, name: 'Taylor', struggles: ['Fractions', 'Decimals'], score: 2, total: 5 },
    { id: 5, name: 'Casey', struggles: ['Volume'], score: 4, total: 5 },
    { id: 6, name: 'Morgan', struggles: ['Fractions'], score: 2, total: 5 },
    { id: 7, name: 'Riley', struggles: ['Volume', 'Surface Area'], score: 3, total: 5 },
  ];

  await callModel(GROUPING_PROMPT(sampleStudentData), 'grouping', 2000);

  await callModel(
    LESSON_PLAN_PROMPT(
      [{ studentId: 1, gradeLevel: '5', lastLesson: 'Area of rectangles', struggledAreas: ['Volume'], quizPerformance: { score: 2, totalQuestions: 5, incorrectSubtopics: ['Volume'] } }],
      ['Volume']
    ),
    'lessonPlan',
    6000
  );

  await callModel(
    GROUP_LESSON_PLAN_PROMPT(
      [
        { firstName: 'Alex', lastInitial: 'B.', gradeLevel: '5', score: 2, totalQuestions: 5, missedSubtopics: ['Volume'], missedQuestionTexts: ['What is the volume of a 4x3x2 prism?'] },
        { firstName: 'Sam', lastInitial: 'K.', gradeLevel: '5', score: 3, totalQuestions: 5, missedSubtopics: ['Volume'], missedQuestionTexts: ['A box is 5x3x4. Find volume.'] },
      ],
      ['Volume']
    ),
    'groupLessonPlan',
    6000
  );

  await callModel(
    QUIZ_PROMPT({ topic: 'Volume', subtopics: ['Volume of rectangular prisms'], numQuestions: 5, gradeLevel: '5', difficulty: 'medium' }),
    'quiz',
    4000
  );

  await callModel(RELATED_PROBLEMS_PROMPT('Volume', '5'), 'relatedProblems', 3000);

  console.log('\nDone. Fixtures saved to src/fixtures/');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
