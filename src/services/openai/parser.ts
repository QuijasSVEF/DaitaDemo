import { LessonPlan } from '../../types';

export function parseLessonPlanResponse(response: string | null | undefined): LessonPlan {
  if (!response) {
    return createDefaultLessonPlan();
  }

  try {
    // Handle both markdown-wrapped and raw JSON responses
    let jsonResponse;
    try {
      // First try parsing directly
      jsonResponse = JSON.parse(response);
    } catch {
      // If that fails, try cleaning markdown formatting
      const cleanResponse = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      jsonResponse = JSON.parse(cleanResponse);
    }

    // Validate JSON structure
    if (
      typeof jsonResponse.objective === 'string' &&
      Array.isArray(jsonResponse.alignedStandards) &&
      Array.isArray(jsonResponse.engagement) &&
      Array.isArray(jsonResponse.representation) &&
      Array.isArray(jsonResponse.actionExpression) &&
      Array.isArray(jsonResponse.wrapup) &&
      (!jsonResponse.dokLevels || typeof jsonResponse.dokLevels === 'object')
    ) {
      return {
        objective: jsonResponse.objective,
        alignedStandards: jsonResponse.alignedStandards || [],
        engagement: jsonResponse.engagement,
        representation: jsonResponse.representation || [],
        actionExpression: jsonResponse.actionExpression || [],
        wrapup: jsonResponse.wrapup || [],
        dokLevels: jsonResponse.dokLevels,
        duration: jsonResponse.duration || 25
      };
    }
    
    // If JSON structure is invalid, return default plan
    console.warn('Invalid lesson plan structure in response');
    return createDefaultLessonPlan();
  } catch (error) {
    console.error('Failed to parse lesson plan response:', error);
    return createDefaultLessonPlan();
  }
}

function createDefaultLessonPlan(): LessonPlan {
  return {
    objective: 'Master the concept through interactive learning',
    alignedStandards: [],
    engagement: [
      'Group discussion of key concepts',
      'Peer teaching opportunities',
      'Interactive problem solving'
    ],
    representation: [
      'Visual models and diagrams',
      'Multiple solution strategies',
      'Real-world applications'
    ],
    actionExpression: [
      'Small group practice',
      'Individual skill demonstration',
      'Peer feedback sessions'
    ],
    wrapup: [
      'Group reflection on learning',
      'Individual exit tickets'
    ],
    duration: 25
  };
}