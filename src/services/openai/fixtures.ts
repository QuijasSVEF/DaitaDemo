import groupingFixture from '../../fixtures/grouping.json';
import lessonPlanFixture from '../../fixtures/lessonPlan.json';
import groupLessonPlanFixture from '../../fixtures/groupLessonPlan.json';
import quizFixture from '../../fixtures/quiz.json';
import relatedProblemsFixture from '../../fixtures/relatedProblems.json';
import genericFixture from '../../fixtures/generic.json';

export interface FixtureResult {
  content: string;
  latency: number;
}

type FixtureCategory = 'grouping' | 'lessonPlan' | 'groupLessonPlan' | 'quiz' | 'relatedProblems' | 'generic';

const fixtures: Record<FixtureCategory, string> = {
  grouping: groupingFixture.content,
  lessonPlan: lessonPlanFixture.content,
  groupLessonPlan: groupLessonPlanFixture.content,
  quiz: quizFixture.content,
  relatedProblems: relatedProblemsFixture.content,
  generic: genericFixture.content,
};

const latencies: Record<FixtureCategory, number> = {
  grouping: 2500,
  lessonPlan: 3000,
  groupLessonPlan: 3000,
  quiz: 1800,
  relatedProblems: 2000,
  generic: 2000,
};

function categorizePrompt(prompt: string): FixtureCategory {
  const lower = prompt.toLowerCase();

  if (lower.includes('create small learning groups') || lower.includes('critical grouping rules')) {
    return 'grouping';
  }

  if (lower.includes('detailed 25-minute small-group lesson plan') || lower.includes('group focus areas')) {
    return 'groupLessonPlan';
  }

  if (lower.includes('highly personalized 25-minute lesson plan') || lower.includes('create detailed lesson plan activities')) {
    return 'lessonPlan';
  }

  if (lower.includes('generate a math quiz') || lower.includes('generate 3 practice problems')) {
    return 'quiz';
  }

  if (lower.includes('practice problems for students struggling')) {
    return 'relatedProblems';
  }

  return 'generic';
}

export function resolveFixture(prompt: string): FixtureResult {
  const category = categorizePrompt(prompt);
  return {
    content: fixtures[category] ?? fixtures.generic,
    latency: latencies[category],
  };
}
