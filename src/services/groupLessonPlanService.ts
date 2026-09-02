import { LessonPlan } from '../types';
import { createChatCompletion } from './openai/config';
import { EMContext } from './openai/prompts';
import { supabase } from './supabase/config';

async function getEMContextForTeacher(teacherUsername: string): Promise<EMContext | undefined> {
  try {
    const { data: template } = await supabase
      .from('quiz_templates')
      .select('em_level_code, em_module_id, em_subtopic_ids')
      .eq('teacher_username', teacherUsername)
      .not('em_level_code', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!template?.em_level_code) return undefined;

    const [levelRes, moduleRes, subtopicsRes] = await Promise.all([
      supabase.from('em_levels').select('level_code, title').eq('level_code', template.em_level_code).maybeSingle(),
      template.em_module_id
        ? supabase.from('em_modules').select('id, title').eq('id', template.em_module_id).maybeSingle()
        : Promise.resolve({ data: null }),
      template.em_subtopic_ids?.length
        ? supabase
            .from('em_subtopics')
            .select('title, big_ideas, academic_vocabulary, common_misconceptions, aligned_standards')
            .in('id', template.em_subtopic_ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const level = (levelRes as any)?.data;
    const module = (moduleRes as any)?.data;
    const subtopics = ((subtopicsRes as any)?.data || []) as any[];

    if (!level) return undefined;

    const subtopicTitles = subtopics.map((s) => s.title).filter(Boolean);
    const reference = [
      `EM ${level.level_code}`,
      module?.title ? `Module: ${module.title}` : null,
      subtopicTitles.length ? subtopicTitles.join(', ') : null,
    ]
      .filter(Boolean)
      .join(' — ');

    const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

    return {
      reference,
      levelTitle: level.title || `Level ${level.level_code}`,
      moduleTitle: module?.title || '',
      subtopicTitles,
      bigIdeas: uniq(subtopics.flatMap((s) => s.big_ideas || [])),
      academicVocabulary: uniq(subtopics.flatMap((s) => s.academic_vocabulary || [])),
      commonMisconceptions: uniq(subtopics.flatMap((s) => s.common_misconceptions || [])),
      alignedStandards: uniq(subtopics.flatMap((s) => s.aligned_standards || [])),
    };
  } catch (err) {
    console.warn('Unable to load EM context:', err);
    return undefined;
  }
}

interface StudentPerformance {
  id: number;
  firstName: string;
  lastInitial: string;
  gradeLevel: string;
  score: number;
  totalQuestions: number;
  missedSubtopics: string[];
  missedQuestionTexts: string[];
}

async function getStudentPerformanceData(studentIds: number[], teacherUsername: string): Promise<StudentPerformance[]> {
  const results: StudentPerformance[] = [];

  const { data: profiles } = await supabase
    .from('students')
    .select('id, first_name, last_initial, grade_level')
    .in('id', studentIds)
    .eq('teacher_username', teacherUsername);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  for (const studentId of studentIds) {
    const { data: attempt } = await supabase
      .from('quiz_attempts')
      .select('score, total_questions, answers')
      .eq('student_id', studentId)
      .eq('teacher_username', teacherUsername)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const profile = profileMap.get(studentId);
    const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];
    const missedSubtopics = [...new Set(
      answers.filter((a: any) => !a.correct && a.questionSubtopic).map((a: any) => a.questionSubtopic as string)
    )];
    const missedQuestionTexts = answers
      .filter((a: any) => !a.correct && a.questionText)
      .map((a: any) => a.questionText as string)
      .slice(0, 5);

    results.push({
      id: studentId,
      firstName: profile?.first_name || 'Student',
      lastInitial: profile?.last_initial || '',
      gradeLevel: profile?.grade_level || '5',
      score: attempt?.score || 0,
      totalQuestions: attempt?.total_questions || 0,
      missedSubtopics,
      missedQuestionTexts,
    });
  }

  return results;
}

function buildGroupLessonPlanPrompt(
  students: StudentPerformance[],
  focusAreas: string[],
  emContext?: EMContext
): string {
  const studentDetails = students.map(s =>
    `- ${s.firstName} ${s.lastInitial}. (Grade ${s.gradeLevel}): Scored ${s.score}/${s.totalQuestions}. Missed: ${s.missedSubtopics.join(', ')}. Example missed questions: ${s.missedQuestionTexts.slice(0, 3).map(q => `"${q}"`).join('; ')}`
  ).join('\n');

  return `You are an expert math educator creating a DETAILED 25-minute small-group lesson plan for ${students.length} students who all struggle with the same topics.

AUDIENCE: The person delivering this lesson may have NEVER taught before. Write every instruction so clearly that someone with zero teaching experience can follow it word-for-word. Include exact sentences to say, exact timing, and exact "what to look for" cues.

GROUP FOCUS AREAS: ${JSON.stringify(focusAreas)}

STUDENT DATA:
${studentDetails}

${emContext ? `
CURRICULUM REFERENCE (Elevate Math):
- Reference: ${emContext.reference}
- Level: ${emContext.levelTitle}
- Module: ${emContext.moduleTitle}
- Subtopics: ${(emContext.subtopicTitles || []).join('; ')}
- Big Ideas: ${(emContext.bigIdeas || []).join('; ') || 'n/a'}
- Academic Vocabulary to use: ${(emContext.academicVocabulary || []).join(', ') || 'n/a'}
- Common Misconceptions to address: ${(emContext.commonMisconceptions || []).join('; ') || 'n/a'}
- Aligned Standards: ${(emContext.alignedStandards || []).join(', ') || 'n/a'}

YOU MUST cite the curriculum reference (e.g., "From ${emContext.reference}") in the objective and in each activity's setup.
` : ''}

Return ONLY valid JSON with this structure:
{
  "objective": "Specific objective citing curriculum reference and naming the focus areas",
  "emReference": "${emContext?.reference || ''}",
  "alignedStandards": [{"standardCode": "string", "description": "string"}],
  "engagement": [
    "(3 min) Exact step-by-step instruction with verbatim teacher script"
  ],
  "representation": [
    "(5 min) Exact step-by-step instruction with verbatim teacher script"
  ],
  "actionExpression": [
    "(10 min) Exact step-by-step instruction with verbatim teacher script"
  ],
  "wrapup": [
    "(4 min) Exact step-by-step instruction with verbatim teacher script"
  ],
  "duration": 25,
  "dokLevels": {
    "engagement": 1,
    "representation": 2,
    "action_expression": 3,
    "wrapup": 2
  },
  "detailedActivities": {
    "engagement": [{
      "description": "Activity title",
      "timeAllocation": "3-4 minutes",
      "objective": "What students will learn in this phase",
      "curriculumReference": "Where in the curriculum this comes from",
      "materials": ["Specific materials needed"],
      "setup": "Exact setup steps before students arrive",
      "steps": [
        {"phase": "Launch", "duration": "1 min", "instruction": "Exact instruction", "teacherSays": "Verbatim script", "lookFor": "What to observe"},
        {"phase": "Explore", "duration": "2 min", "instruction": "Exact instruction", "teacherSays": "Verbatim script", "lookFor": "What to observe"}
      ],
      "differentiation": {
        "ifStrugglingMore": "What to do if a student seems more lost than others",
        "ifGettingIt": "Extension for students who get it quickly"
      },
      "commonMistakes": ["Specific mistake to watch for and how to correct it"]
    }],
    "representation": [{
      "description": "Visual/model activity",
      "timeAllocation": "5-6 minutes",
      "objective": "Objective for this phase",
      "curriculumReference": "Curriculum location",
      "materials": ["Materials"],
      "setup": "Setup steps",
      "steps": [
        {"phase": "Model", "duration": "2 min", "instruction": "Instruction", "teacherSays": "Script", "lookFor": "Observation"},
        {"phase": "Guided Practice", "duration": "3 min", "instruction": "Instruction", "teacherSays": "Script", "lookFor": "Observation"}
      ],
      "differentiation": {"ifStrugglingMore": "", "ifGettingIt": ""},
      "commonMistakes": []
    }],
    "actionExpression": [{
      "description": "Practice activity",
      "timeAllocation": "10 minutes",
      "objective": "Practice objective",
      "curriculumReference": "Curriculum location",
      "materials": ["Materials"],
      "setup": "Setup",
      "steps": [
        {"phase": "Guided", "duration": "3 min", "instruction": "Instruction", "teacherSays": "Script", "lookFor": "Observation"},
        {"phase": "Independent", "duration": "5 min", "instruction": "Instruction", "teacherSays": "Script", "lookFor": "Observation"},
        {"phase": "Check", "duration": "2 min", "instruction": "Instruction", "teacherSays": "Script", "lookFor": "Observation"}
      ],
      "differentiation": {"ifStrugglingMore": "", "ifGettingIt": ""},
      "commonMistakes": []
    }],
    "wrapup": [{
      "description": "Synthesis and exit check",
      "timeAllocation": "4 minutes",
      "objective": "Wrap up objective",
      "curriculumReference": "Curriculum location",
      "materials": ["Exit ticket paper"],
      "setup": "Setup",
      "steps": [
        {"phase": "Review", "duration": "2 min", "instruction": "Instruction", "teacherSays": "Script", "lookFor": "Observation"},
        {"phase": "Exit Check", "duration": "2 min", "instruction": "Instruction", "teacherSays": "Script", "lookFor": "Observation"}
      ],
      "differentiation": {"ifStrugglingMore": "", "ifGettingIt": ""},
      "commonMistakes": []
    }]
  }
}

CRITICAL REQUIREMENTS:
1. Every "teacherSays" field must contain EXACT sentences to say out loud -- not summaries
2. Every "steps" entry must have timing that adds up to the timeAllocation
3. Address the SPECIFIC questions these students missed (reference their actual errors)
4. Include "lookFor" in every step so the teacher knows if students are getting it
5. "commonMistakes" must reference the actual errors these students made
6. Each phase must build on the previous one
7. Name students by first name in differentiation when relevant
8. ${emContext ? `Reference "${emContext.reference}" in curriculumReference fields` : 'Provide general curriculum guidance'}
9. Materials must be specific and concrete (not "visual aids" but "fraction bars" or "grid paper")
10. The plan must be followable by someone who has never taught math before`;
}

function normalizeActivity(activity: any): any {
  if (!activity || typeof activity !== 'object') return activity;

  const steps = Array.isArray(activity.steps) ? activity.steps : [];

  const teacherScript: string[] = activity.teacherScript || [];
  const studentBehaviors: string[] = activity.expectedStudentBehaviors || activity.studentBehaviors || [];

  // Extract teacherSays and lookFor from steps if top-level arrays are empty
  if (teacherScript.length === 0) {
    for (const step of steps) {
      if (typeof step === 'object' && step.teacherSays) {
        teacherScript.push(step.teacherSays);
      }
    }
  }
  if (studentBehaviors.length === 0) {
    for (const step of steps) {
      if (typeof step === 'object' && step.lookFor) {
        studentBehaviors.push(step.lookFor);
      }
    }
  }

  // Normalize differentiation field names
  const rawDiff = activity.differentiation || {};
  const struggling: string[] = Array.isArray(rawDiff.struggling)
    ? rawDiff.struggling
    : rawDiff.ifStrugglingMore
      ? [rawDiff.ifStrugglingMore]
      : [];
  const advanced: string[] = Array.isArray(rawDiff.advanced)
    ? rawDiff.advanced
    : rawDiff.ifGettingIt
      ? [rawDiff.ifGettingIt]
      : [];

  // Normalize steps to include expectedResponse from lookFor
  const normalizedSteps = steps.map((step: any) => {
    if (typeof step === 'string') return step;
    return {
      phase: step.phase || '',
      duration: step.duration || '',
      instruction: step.instruction || '',
      expectedResponse: step.expectedResponse || step.lookFor || '',
      teacherSays: step.teacherSays || '',
      lookFor: step.lookFor || '',
    };
  });

  return {
    description: activity.description || '',
    timeAllocation: activity.timeAllocation || '',
    objective: activity.objective || '',
    setup: activity.setup || '',
    materials: activity.materials || [],
    steps: normalizedSteps,
    teacherScript,
    expectedStudentBehaviors: studentBehaviors,
    studentBehaviors,
    differentiation: { struggling, advanced },
    commonMisconceptions: activity.commonMisconceptions || activity.commonMistakes || [],
    quickAssessment: activity.quickAssessment || [],
    successCriteria: activity.successCriteria || [],
  };
}

function normalizeDetailedActivities(raw: any): any {
  if (!raw || typeof raw !== 'object') return undefined;

  const phases = ['engagement', 'representation', 'actionExpression', 'wrapup'];
  const result: any = {};

  for (const phase of phases) {
    const activities = raw[phase];
    if (Array.isArray(activities)) {
      result[phase] = activities.map(normalizeActivity);
    } else {
      result[phase] = [];
    }
  }

  return result;
}

export async function generateGroupLessonPlan(
  studentIds: number[],
  focusAreas: string[],
  teacherUsername: string
): Promise<LessonPlan> {
  try {
    if (!studentIds.length) {
      throw new Error('No students provided for group lesson plan');
    }

    const [studentPerformance, emContext] = await Promise.all([
      getStudentPerformanceData(studentIds, teacherUsername),
      getEMContextForTeacher(teacherUsername),
    ]);

    const prompt = buildGroupLessonPlanPrompt(studentPerformance, focusAreas, emContext);

    const response = await createChatCompletion(prompt, 0.3, 6000);

    let cleanedResponse = response.trim();
    cleanedResponse = cleanedResponse.replace(/```json\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/```\s*/g, '');
    cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, '$1');

    const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanedResponse = jsonMatch[0];
    }

    const parsed = JSON.parse(cleanedResponse);

    const rawDetailed = parsed.detailedActivities || parsed.detailed_activities || undefined;
    const normalizedDetailed = rawDetailed ? normalizeDetailedActivities(rawDetailed) : undefined;

    return {
      objective: parsed.objective || `Group lesson: ${focusAreas.join(', ')}`,
      engagement: parsed.engagement || [],
      representation: parsed.representation || [],
      actionExpression: parsed.actionExpression || parsed.action_expression || [],
      wrapup: parsed.wrapup || [],
      duration: parsed.duration || 25,
      dokLevels: parsed.dokLevels || parsed.dok_levels || {
        engagement: 1,
        representation: 2,
        action_expression: 3,
        wrapup: 2
      },
      alignedStandards: parsed.alignedStandards || parsed.aligned_standards || [],
      emReference: parsed.emReference || emContext?.reference || undefined,
      detailedActivities: normalizedDetailed,
    };
  } catch (error) {
    console.error('Error generating group lesson plan:', error);
    return createFallbackLessonPlan(focusAreas);
  }
}

function createFallbackLessonPlan(focusAreas: string[]): LessonPlan {
  const topic = focusAreas[0] || 'key concepts';
  return {
    objective: `Students will strengthen understanding of ${topic} through guided small-group instruction`,
    engagement: [
      `(3 min) Say: "Today we're going to work together on ${topic}. Let's start by looking at a problem." Write a sample problem on the board. Ask: "What do you notice? What do you think we need to do?" Wait 15 seconds for responses.`,
    ],
    representation: [
      `(5 min) Say: "Let me show you one way to think about this." Draw a visual model on the whiteboard. Say: "Watch how I break this into steps." Model solving step-by-step, narrating each decision. Then say: "Now you try the next one with your partner."`,
    ],
    actionExpression: [
      `(10 min) Hand out practice sheet. Say: "Try problems 1-3 on your own. I'll come check on each of you." Circulate and observe. For students who are stuck, ask: "What do you know so far?" and "What's the first step?" After 5 minutes, say: "Let's compare answers as a group."`,
    ],
    wrapup: [
      `(4 min) Say: "Before we finish, I want to see one problem from each of you." Hand each student an exit slip with one problem. Collect and check immediately. If any student got it wrong, make a note to follow up tomorrow.`,
    ],
    duration: 25,
    dokLevels: {
      engagement: 1,
      representation: 2,
      action_expression: 3,
      wrapup: 2
    },
  };
}
