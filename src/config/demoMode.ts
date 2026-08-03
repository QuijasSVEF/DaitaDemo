export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_LATENCY = {
  grouping: 2500,
  lessonPlan: 3000,
  quiz: 1800,
  relatedProblems: 2000,
} as const;

export function demoDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
