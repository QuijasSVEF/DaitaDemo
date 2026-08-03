import { LessonPlan } from '../types';
import { createChatCompletion } from './openai/config';
import { LESSON_PLAN_PROMPT, DETAILED_ACTIVITIES_PROMPT, EMContext } from './openai/prompts';
import { getStandardsByGrade } from './supabase/standards';
import { parseLessonPlanResponse } from './openai/parser';
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
    console.warn('Unable to load EM context for teacher:', err);
    return undefined;
  }
}

interface StudentContext {
  grade: string;
  studentId?: number;
  lastLesson?: string;
  currentStruggleAreas?: string[];
  standards?: any[];
  quizPerformance?: {
    score: number;
    totalQuestions: number;
    incorrectSubtopics: string[];
    quizTitle?: string;
    quizTopic?: string;
    quizSubtopics?: string[];
  };
  previousStruggleAreas?: string[];
}

async function getLatestQuizResult(studentId: number): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select(`
        id,
        score,
        total_questions,
        answers,
        quiz_templates:quiz_templates (
          id,
          title,
          quiz_questions:quiz_questions (
            id, 
            subtopic
          )
        )
      `)
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        // No quiz attempts found - this is normal for new students
        return null;
      }
      throw error;
    }

    if (!data) return null;

    const incorrectSubtopics = new Set<string>();
    const answers = Array.isArray(data.answers) ? data.answers : [];

    for (const answer of answers) {
      if (!answer.correct && answer.questionSubtopic) {
        incorrectSubtopics.add(answer.questionSubtopic);
      }
    }

    return {
      score: data.score || 0,
      totalQuestions: answers.length,
      incorrectSubtopics: Array.from(incorrectSubtopics)
    };
  } catch (error) {
    console.error('Error getting quiz result:', error);
    return null;
  }
}

export async function generateLessonPlan(
  gradeLevel: string,
  lastLesson: string,
  struggledAreas: string | string[],
  teacherUsername: string,
  studentId: number,
  exitTicketId?: string
): Promise<LessonPlan> {
  try {
    console.log('Generating lesson plan with parameters:', {
      gradeLevel,
      lastLesson,
      struggledAreas,
      teacherUsername,
      studentId,
      exitTicketId
    });

    // Get standards for the grade level
    const standards = await getStandardsByGrade([gradeLevel]);

    // Normalize struggled areas to an array
    const areas = Array.isArray(struggledAreas) 
      ? struggledAreas 
      : struggledAreas.split(',').map(s => s.trim()).filter(Boolean);

    console.log('Normalized struggle areas:', areas);

    // Get latest quiz results
    const quizResult = await getLatestQuizResult(studentId);
    console.log('Quiz result for student:', quizResult);

    // Get student's previous struggle areas
    const { data: previousExitTickets } = await supabase
      .from('exit_tickets')
      .select('struggled_areas')
      .eq('student_id', studentId)
      .eq('teacher_username', teacherUsername)
      .order('created_at', { ascending: false })
      .limit(5);

    const previousStruggleAreas = previousExitTickets
      ?.flatMap(ticket => ticket.struggled_areas)
      .filter(Boolean);

    console.log('Previous struggle areas:', previousStruggleAreas);

    // Combine quiz results with other struggle areas
    const allStruggleAreas = quizResult
      ? [...new Set([...areas, ...quizResult.incorrectSubtopics])]
      : areas;

    console.log('All struggle areas combined:', allStruggleAreas);

    // Always use OpenAI for personalized lesson plans
    console.log('Generating personalized lesson plan using OpenAI');
    
    // Build comprehensive student context
    const studentInfo = [{
      studentId,
      gradeLevel,
      lastLesson,
      struggledAreas: allStruggleAreas,
      quizPerformance: quizResult,
      previousStruggleAreas: previousStruggleAreas?.slice(0, 10) || []
    }];

    const emContext = await getEMContextForTeacher(teacherUsername);

    try {
      const response = await createChatCompletion(
        LESSON_PLAN_PROMPT(studentInfo, allStruggleAreas, teacherUsername, emContext),
        0.3
      );
      
      if (!response) {
        throw new Error('Empty response from OpenAI');
      }
      
      // Parse the lesson plan response
      const plan = parseLessonPlanResponse(response);
      if (emContext?.reference) {
        plan.emReference = emContext.reference;
      }
      
      // Generate detailed activities if the plan was successfully created
      try {
        const studentContext = {
          grade: gradeLevel,
          studentId,
          quizPerformance: quizResult,
          struggledAreas: allStruggleAreas,
          lastLesson: lastLesson,
          specificMissedTopics: quizResult?.incorrectSubtopics || [],
          performanceLevel: quizResult ? (quizResult.score / quizResult.totalQuestions) : 0.5
        };
        
        console.log('Generating detailed activities with context:', studentContext);
        
        const detailedResponse = await createChatCompletion(
          DETAILED_ACTIVITIES_PROMPT(studentContext, allStruggleAreas, teacherUsername, emContext),
          0.3
        );
        
        console.log('Raw detailed activities response:', detailedResponse);
        
        if (!detailedResponse) {
          console.warn('Empty response from detailed activities generation');
          plan.detailedActivities = createDefaultDetailedActivities(allStruggleAreas[0] || 'key concepts');
          return plan;
        }
        
        // Enhanced JSON cleaning process
        let cleanedResponse = detailedResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/\/\/.*$/gm, '')  // Remove single-line comments
          .replace(/\/\*[\s\S]*?\*\//g, '')  // Remove multi-line comments
          .trim();
        
        // Remove trailing commas before closing brackets/braces
        cleanedResponse = cleanedResponse
          .replace(/,(\s*[}\]])/g, '$1')
          .replace(/,(\s*$)/g, '');
        
        // Extract JSON object if response contains extra text
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanedResponse = jsonMatch[0];
        }
        
        // Additional cleanup for common AI response issues
        cleanedResponse = cleanedResponse
          .replace(/\n\s*\n/g, '\n')  // Remove extra newlines
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas again after other cleanup
          .trim();
          
        console.log('Cleaned detailed activities response:', cleanedResponse);
        
        try {
          const parsedResponse = JSON.parse(cleanedResponse);
          console.log('Parsed detailed activities:', parsedResponse);
          
          if (parsedResponse.detailedActivities) {
            plan.detailedActivities = parsedResponse.detailedActivities;
            console.log('Successfully set detailed activities');
          } else {
            console.warn('No detailedActivities found in parsed response');
            plan.detailedActivities = createDefaultDetailedActivities(allStruggleAreas[0] || 'key concepts');
          }
        } catch (parseError) {
          console.warn('Warning: Error parsing detailed activities JSON. Using fallback:', parseError);
          console.log('Failed to parse response:', cleanedResponse);
          plan.detailedActivities = createDefaultDetailedActivities(allStruggleAreas[0] || 'key concepts');
        }
      } catch (parseError) {
        console.warn('Warning: Error parsing detailed activities. Using fallback:', parseError);
        plan.detailedActivities = createDefaultDetailedActivities(allStruggleAreas[0] || 'key concepts');
      }

      console.log('Generated lesson plan:', plan);
      return plan;
    } catch (openAIError) {
      console.error('OpenAI generation failed:', openAIError);
      throw openAIError;
    }
  } catch (error) {
    console.error('Error generating lesson plan:', error);
    // Only use fallback if all else fails
    return createFallbackLessonPlan(allStruggleAreas, gradeLevel, lastLesson, quizResult);
  }
}

function getEnhancedLessonPlanPrompt(
  studentContext: StudentContext,
  allStruggleAreas: string[],
  teacherUsername: string
): string {
  return `Create a highly personalized 25-minute math lesson plan for a specific student.

CRITICAL: This lesson plan must be specifically tailored to this individual student's needs and performance data.

Student Context:
- Grade Level: ${studentContext.grade}
- Student ID: ${studentContext.studentId}
- Last Lesson Topic: ${studentContext.lastLesson}
- Current Struggle Areas: ${JSON.stringify(studentContext.currentStruggleAreas)}
- Previous Struggle Areas: ${JSON.stringify(studentContext.previousStruggleAreas)}
- Teacher: ${teacherUsername}

${studentContext.quizPerformance ? `
Recent Quiz Performance:
- Score: ${studentContext.quizPerformance.score}/${studentContext.quizPerformance.totalQuestions} (${Math.round((studentContext.quizPerformance.score / studentContext.quizPerformance.totalQuestions) * 100)}%)
- Specific Topics Missed: ${JSON.stringify(studentContext.quizPerformance.incorrectSubtopics)}
` : 'No recent quiz data available.'}

Focus Areas for This Lesson: ${JSON.stringify(allStruggleAreas)}

REQUIREMENTS:
1. Address the specific struggle areas identified from this student's assessment
2. Reference the student's actual quiz performance if available
3. Build on the last lesson topic: "${studentContext.lastLesson}"
4. Include specific activities that target the missed quiz topics
5. Provide scaffolding based on the student's performance level
6. Make the lesson highly specific to this student's needs

Return ONLY a valid JSON object with this exact format:
{
  "objective": "Specific learning objective addressing [student's struggle areas]",
  "alignedStandards": [
    {
      "standardCode": "string",
      "description": "string"
    }
  ],
  "engagement": [
    "Activity 1 targeting [specific struggle area]",
    "Activity 2 building on [last lesson topic]",
    "Activity 3 addressing [quiz performance gaps]",
    "Activity 4 connecting to [student's grade level]"
  ],
  "representation": [
    "Visual model for [specific struggle area]",
    "Multiple representations of [quiz topic missed]",
    "Scaffolded examples for [student's level]",
    "Real-world application of [struggle area]"
  ],
  "actionExpression": [
    "Guided practice on [specific struggle area]",
    "Differentiated activity for [student's performance level]",
    "Assessment targeting [quiz gaps]",
    "Student demonstration of [lesson objective]"
  ],
  "wrapup": [
    "Review of [specific concepts covered]",
    "Exit ticket on [struggle areas]",
    "Connection to next lesson on [related topic]",
    "Student reflection on [learning progress]"
  ],
  "duration": 25,
  "dokLevels": {
    "engagement": 1,
    "representation": 2,
    "action_expression": 3,
    "wrapup": 2
  }
}

CRITICAL: Make this lesson plan specific to this student's actual data, not generic. Reference the specific struggle areas, quiz performance, and grade level throughout.`;
}

function createDefaultDetailedActivities(struggleArea: string) {
  return {
    engagement: [{
      description: `Real-world problem exploration targeting ${struggleArea}`,
      timeAllocation: '5-7 minutes',
      objective: `Engage students in exploring ${struggleArea} through hands-on, real-world problem solving`,
      materials: [
        `Manipulatives related to ${struggleArea}`,
        'Printed visual aids or fraction circles',
        'Whiteboard and markers',
        'Student recording sheets or mini whiteboards'
      ],
      setup: `Arrange students in pairs or groups of 3. Distribute manipulatives and visual aids. Have recording materials ready for each student.`,
      steps: [
        {
          phase: 'Launch',
          duration: '30 seconds',
          instruction: `Present a concrete real-world problem involving ${struggleArea}. Ask students to make quick estimates before calculating.`,
          expectedResponse: 'Students make predictions and share initial thinking about the problem'
        },
        {
          phase: 'Private Think',
          duration: '30 seconds',
          instruction: 'Have students individually think about the problem and write down their estimate or initial approach',
          expectedResponse: 'Students record individual estimates and initial problem-solving ideas'
        },
        {
          phase: 'Group Model',
          duration: '2-3 minutes',
          instruction: `Have groups use manipulatives to model and solve the ${struggleArea} problem. Encourage labeling and clear representations.`,
          expectedResponse: 'Students work collaboratively to create accurate models and solve the problem using concrete materials'
        },
        {
          phase: 'Share and Connect',
          duration: '1-2 minutes',
          instruction: 'Have groups share their solution and explain their reasoning. Connect to mathematical concepts.',
          expectedResponse: 'Students clearly explain their problem-solving strategy and mathematical reasoning'
        }
      ],
      teacherScript: [
        `Let's explore ${struggleArea} through this real-world problem. Look at this situation carefully.`,
        'Before we start working, take 30 seconds to estimate the answer. What do you think?',
        'Now work with your partner to model this problem using your materials. Make sure to label your work clearly.',
        'Great! Now share your solution with the class. How did you approach this ${struggleArea} problem?'
      ],
      expectedStudentBehaviors: [
        'Making thoughtful estimates and predictions',
        'Using manipulatives to model the problem',
        'Collaborating effectively with partners',
        'Explaining their reasoning clearly to others'
      ],
      differentiation: {
        struggling: [
          'Provide pre-organized manipulatives and templates',
          `Guiding questions: "How can we break this ${struggleArea} problem into smaller steps?"`,
          'Visual templates for recording work and organizing thinking',
          'Simplified numbers while maintaining the same concept'
        ],
        advanced: [
          `Extension: Create their own ${struggleArea} problem with different numbers`,
          'Challenge to solve the problem using multiple methods or representations',
          'Take leadership roles in group discussions and explanations',
          'Make connections between ${struggleArea} and other mathematical concepts'
        ]
      },
      commonMisconceptions: [
        `Common procedural errors in ${struggleArea}`,
        'Misunderstanding of the problem context or setup',
        'Incorrect use of manipulatives or visual models'
      ],
      quickAssessment: [
        `"How did you approach this ${struggleArea} problem?"`,
        '"Can you explain your reasoning to a partner?"',
        'Observe student use of manipulatives and mathematical language'
      ],
      successCriteria: [
        `Student can accurately model the ${struggleArea} problem using concrete materials`,
        'Student can explain their problem-solving strategy using mathematical language',
        'Student demonstrates understanding of the underlying mathematical concept'
      ]
    }],
    representation: [{
      description: `Visual modeling and multiple representations for ${struggleArea}`,
      timeAllocation: '6-8 minutes',
      objective: `Create and analyze multiple visual representations of ${struggleArea} concepts`,
      materials: [
        'Chart paper or large whiteboards',
        `Visual models specific to ${struggleArea}`,
        'Colored markers or pencils',
        'Comparison templates'
      ],
      setup: 'Post chart paper around the room. Have different colored markers available. Prepare comparison templates.',
      steps: [
        {
          phase: 'Model Introduction',
          duration: '1 minute',
          instruction: `Introduce different ways to represent ${struggleArea} visually. Show 2-3 different model types.`,
          expectedResponse: 'Students observe and ask clarifying questions about the different representations'
        },
        {
          phase: 'Guided Creation',
          duration: '3-4 minutes',
          instruction: `Guide students to create their own visual model for ${struggleArea}. Encourage different approaches.`,
          expectedResponse: 'Students create accurate and clear visual representations using their chosen method'
        },
        {
          phase: 'Gallery Walk',
          duration: '2-3 minutes',
          instruction: 'Have students walk around to view different representations. Ask them to identify similarities and differences.',
          expectedResponse: 'Students analyze and compare different visual approaches to the same concept'
        }
      ],
      teacherScript: [
        `Today we'll explore different ways to show ${struggleArea} visually. Look at these different models.`,
        'Choose the representation method that makes the most sense to you and create your own model.',
        'Walk around and look at how others represented the same concept. What do you notice?',
        'What are the similarities between these different representations?'
      ],
      expectedStudentBehaviors: [
        'Creating clear and accurate visual representations',
        'Using appropriate mathematical symbols and labels',
        'Analyzing and comparing different approaches',
        'Making connections between different representation methods'
      ],
      differentiation: {
        struggling: [
          'Provide templates or partially completed models',
          'Offer choice between 2-3 specific representation types',
          'Pair with a supportive partner for the gallery walk'
        ],
        advanced: [
          'Challenge to create multiple representations of the same concept',
          'Ask to identify the most efficient representation and explain why',
          'Lead discussions about the strengths of different approaches'
        ]
      },
      commonMisconceptions: [
        'Creating visually appealing but mathematically incorrect representations',
        'Confusing different representation methods or mixing approaches incorrectly'
      ],
      quickAssessment: [
        'Check that visual models accurately represent the mathematical concept',
        'Ask students to explain their representation choice and reasoning'
      ],
      successCriteria: [
        'Student creates a mathematically accurate visual representation',
        'Student can explain how their model shows the key concept',
        'Student can identify connections between different representation methods'
      ]
    }],
    actionExpression: [{
      description: `Independent practice and application of ${struggleArea}`,
      timeAllocation: '8-10 minutes',
      objective: `Apply ${struggleArea} concepts through independent problem-solving and peer collaboration`,
      materials: [
        'Practice problem sets with varying difficulty',
        'Answer recording sheets',
        'Manipulatives for student choice',
        'Timer for pacing'
      ],
      setup: 'Distribute practice problems based on student readiness levels. Have manipulatives available for student choice.',
      steps: [
        {
          phase: 'Problem Introduction',
          duration: '1 minute',
          instruction: `Introduce the practice problems focusing on ${struggleArea}. Explain expectations and available resources.`,
          expectedResponse: 'Students understand the task and know what resources are available'
        },
        {
          phase: 'Independent Work',
          duration: '5-6 minutes',
          instruction: 'Students work independently on problems. Circulate to provide individual support as needed.',
          expectedResponse: 'Students work systematically through problems, using appropriate strategies and tools'
        },
        {
          phase: 'Peer Check',
          duration: '2-3 minutes',
          instruction: 'Have students compare answers with a partner and discuss any differences in approach.',
          expectedResponse: 'Students engage in mathematical discourse and resolve differences through reasoning'
        }
      ],
      teacherScript: [
        `Now you'll practice ${struggleArea} independently. Use any of the strategies we've learned today.`,
        'Work at your own pace, but focus on accuracy. Use manipulatives if they help you think through the problems.',
        'Compare your answers with your partner. If you disagree, work together to figure out the correct approach.',
        'Remember to show your thinking clearly so others can follow your reasoning.'
      ],
      expectedStudentBehaviors: [
        'Working independently with focus and persistence',
        'Choosing appropriate tools and strategies for each problem',
        'Engaging in productive mathematical discussions with peers',
        'Self-monitoring and adjusting their approach when needed'
      ],
      differentiation: {
        struggling: [
          'Provide problems with smaller numbers or simpler contexts',
          'Offer choice of manipulatives and visual supports',
          'Check in more frequently during independent work time'
        ],
        advanced: [
          'Provide extension problems with more complex scenarios',
          'Challenge to solve problems using multiple methods',
          'Ask to create their own similar problems for classmates'
        ]
      },
      commonMisconceptions: [
        'Rushing through problems without checking work',
        'Applying procedures incorrectly or inconsistently',
        'Not using appropriate tools when struggling'
      ],
      quickAssessment: [
        'Observe student problem-solving strategies during independent work',
        'Listen to peer discussions for evidence of understanding',
        'Review student work samples for accuracy and reasoning'
      ],
      successCriteria: [
        'Student completes problems accurately using appropriate strategies',
        'Student can explain their reasoning to a peer',
        'Student demonstrates confidence and independence with the concept'
      ]
    }],
    wrapup: [{
      description: `Synthesis and reflection on ${struggleArea} learning`,
      timeAllocation: '3-4 minutes',
      objective: `Synthesize key learning about ${struggleArea} and connect to future learning`,
      materials: [
        'Exit tickets or reflection prompts',
        'Chart paper for class summary',
        'Markers for recording key ideas'
      ],
      setup: 'Have exit tickets ready. Prepare chart paper for recording class insights.',
      steps: [
        {
          phase: 'Key Learning Review',
          duration: '1-2 minutes',
          instruction: `Ask students to share one key thing they learned about ${struggleArea} today.`,
          expectedResponse: 'Students articulate specific learning related to the lesson objective'
        },
        {
          phase: 'Exit Ticket',
          duration: '2 minutes',
          instruction: `Have students complete a brief exit ticket assessing their understanding of ${struggleArea}.`,
          expectedResponse: 'Students complete the assessment showing their current level of understanding'
        },
        {
          phase: 'Next Steps Preview',
          duration: '30 seconds',
          instruction: `Preview how today's ${struggleArea} learning will connect to tomorrow's lesson.`,
          expectedResponse: 'Students understand how their learning will continue and build'
        }
      ],
      teacherScript: [
        `Let's think about what we learned about ${struggleArea} today. Turn to your partner and share one key insight.`,
        'Now complete this exit ticket to show me what you understand about the concepts we practiced.',
        `Tomorrow we'll build on your ${struggleArea} understanding by exploring [preview next concept].`,
        'Great work today! You\'ve made real progress with these challenging concepts.'
      ],
      expectedStudentBehaviors: [
        'Reflecting thoughtfully on their learning process',
        'Articulating specific insights and connections',
        'Completing exit assessments honestly and thoroughly',
        'Showing interest in continued learning'
      ],
      differentiation: {
        struggling: [
          'Provide sentence starters for reflection prompts',
          'Offer choice in how to express their learning (verbal, written, or visual)',
          'Give additional encouragement and specific positive feedback'
        ],
        advanced: [
          'Ask to make connections to other mathematical concepts',
          'Challenge to identify questions they still have about the topic',
          'Encourage them to help explain concepts to struggling peers'
        ]
      },
      commonMisconceptions: [
        'Thinking they understand when they can only repeat procedures',
        'Not recognizing areas where they still need support'
      ],
      quickAssessment: [
        'Review exit ticket responses for evidence of understanding',
        'Listen to student reflections for depth of insight',
        'Note which students seem confident vs. uncertain'
      ],
      successCriteria: [
        'Student can articulate what they learned about the concept',
        'Student demonstrates understanding on the exit ticket',
        'Student shows readiness to continue learning the concept'
      ]
    }]
  };
}

function createFallbackLessonPlan(
  struggledAreas: string[], 
  gradeLevel: string, 
  lastLesson: string, 
  quizResult: any
): LessonPlan {
  const primaryStruggle = struggledAreas[0] || 'key mathematical concepts';
  const hasMultipleAreas = struggledAreas.length > 1;
  const scoreContext = quizResult 
    ? ` (based on ${quizResult.score}/${quizResult.totalQuestions} quiz performance)`
    : '';
  
  return {
    objective: `Master ${primaryStruggle} through targeted Grade ${gradeLevel} instruction${scoreContext}${hasMultipleAreas ? ` while addressing ${struggledAreas.slice(1).join(', ')}` : ''}`,
    engagement: [
      `Grade ${gradeLevel} interactive exploration of ${primaryStruggle} using hands-on materials`,
      `Guided discovery connecting ${primaryStruggle} to real-world Grade ${gradeLevel} applications`,
      `Targeted problem-solving addressing specific ${primaryStruggle} misconceptions from ${lastLesson}`,
      `Student discussion about effective strategies for ${primaryStruggle} at Grade ${gradeLevel} level`
    ],
    representation: [
      `Grade ${gradeLevel} appropriate visual models and diagrams for ${primaryStruggle}`,
      `Multiple solution strategies specifically targeting ${primaryStruggle} difficulties`,
      `Concrete-to-abstract progression addressing ${primaryStruggle} misconceptions from ${lastLesson}`,
      `Real-world applications demonstrating ${primaryStruggle} relevance at Grade ${gradeLevel} level`
    ],
    actionExpression: [
      `Guided practice with ${primaryStruggle} problems at Grade ${gradeLevel} difficulty level`,
      `Individual work targeting specific ${primaryStruggle} gaps identified in ${lastLesson}`,
      `Scaffolded exercises addressing ${primaryStruggle} misconceptions`,
      `Assessment activities to check ${primaryStruggle} understanding progress`
    ],
    wrapup: [
      `Review of key ${primaryStruggle} strategies learned in today's Grade ${gradeLevel} lesson`,
      `Exit ticket specifically assessing ${primaryStruggle} understanding improvements`,
      `Student reflection on ${primaryStruggle} progress since ${lastLesson}`,
      `Preview of next lesson building on ${primaryStruggle} foundation with Grade ${gradeLevel} extensions`
    ],
    duration: 25,
    dokLevels: {
      engagement: 1,
      representation: 2,
      action_expression: 3,
      wrapup: 2
    },
    alignedStandards: [],
    detailedActivities: createDefaultDetailedActivities(primaryStruggle)
  };
}