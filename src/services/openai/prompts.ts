export const ANALYTICS_PROMPT = (uniqueStruggles: string[]) => 
`You are a JSON-only response API. Return ONLY raw JSON without any markdown formatting, quotes, or explanation.

Analyze these mathematical struggles and group similar concepts using this exact format:
{
  "struggleAreas": [
    {
      "area": "standardized name for the concept",
      "relatedTerms": ["similar terms found in input"],
      "relatedConcepts": ["prerequisites and related concepts"],
      "recommendations": ["specific teaching strategies"]
    }
  ]
}

Input struggles:
${JSON.stringify(uniqueStruggles)}

Format requirements:
1. Must return valid JSON matching format exactly
2. Group similar concepts (e.g., "adding fractions"/"fraction addition")
3. 2-3 specific recommendations per area
4. Keep all text concise
5. Do not include any markdown formatting or explanation text
6. Response must start with { and end with }`;

export const STANDARDS_ALIGNMENT_PROMPT = (uniqueStruggles: string[], standards: any[]) => 
`Analyze these mathematical struggles and align them with California Math Standards.
For each struggle area, find the most relevant standards and rate the confidence of the match.

Struggles:
${JSON.stringify(uniqueStruggles)}

Available Standards:
${JSON.stringify(standards)}

Return ONLY a valid JSON object with this structure:
{
  "alignments": [
    {
      "struggleArea": "string",
      "standards": [
        {
          "standardCode": "string",
          "description": "string",
          "matchConfidence": number // 0-1 scale
        }
      ]
    }
  ]
}

Requirements:
1. Only include standards with confidence > 0.7
2. Sort standards by confidence descending
3. Consider grade level progression
4. Match conceptual relationships
5. Include prerequisite standards where relevant`;

export const GROUPING_PROMPT = (studentData: any) =>
`Create small learning groups from this student data.
Return ONLY a valid JSON object matching this exact format:

{
  "groups": [
    {
      "focusAreas": ["specific mathematical concepts students share"],
      "students": [student IDs],
      "recommendedApproach": "detailed teaching strategy"
    }
  ]
}

Input data:
${JSON.stringify(studentData, null, 2)}

CRITICAL GROUPING RULES:
1. Students must ONLY be grouped together if they struggle with the EXACT SAME set of topics
2. If Student A struggles with ["Volume"] and Student B struggles with ["Volume", "Volume of Composite Figures"], they are NOT in the same group
3. A student who struggles with only one topic goes in a different group than a student who struggles with multiple topics
4. Students with the same struggle topics should ALWAYS be in the same group regardless of score differences. The lesson plan will differentiate for individual needs.
5. Target 3-5 students per group. Maximum 5 students per group.
6. Each student must appear in exactly one group
7. Solo groups should only exist when a student has a truly unique combination of struggles that NO other student shares
8. A group's focusAreas must be the EXACT struggles shared by ALL students in that group
9. Never merge students with different struggle sets just to make bigger groups
10. If multiple students share the exact same struggles, they MUST be in the same group (up to the max of 5)

Return valid JSON starting with { and ending with }`;

export interface EMContext {
  reference?: string;
  levelTitle?: string;
  moduleTitle?: string;
  subtopicTitles?: string[];
  bigIdeas?: string[];
  academicVocabulary?: string[];
  commonMisconceptions?: string[];
  alignedStandards?: string[];
}

export const LESSON_PLAN_PROMPT = (
  studentInfo: any[],
  focusAreas: string[],
  teacherUsername?: string,
  emContext?: EMContext
) =>
`You are an expert math educator creating a HIGHLY PERSONALIZED 25-minute lesson plan for a specific student.

AUDIENCE: The teacher reading this plan may be brand-new to teaching. Write so they can
deliver the lesson without prior math-teaching experience: every activity needs exact
teacher language, numbered steps, and visible "what to look for" cues.

CRITICAL: This must be tailored to the individual student's actual performance data and specific needs.

Student Data: ${JSON.stringify(studentInfo[0], null, 2)}
Primary Focus Areas: ${JSON.stringify(focusAreas)}
Teacher: ${teacherUsername || 'Not specified'}
${emContext ? `
Elevate Math Curriculum Context (cite this reference in the objective and in each activity):
- Reference: ${emContext.reference || ''}
- Level: ${emContext.levelTitle || ''}
- Module: ${emContext.moduleTitle || ''}
- Subtopics: ${(emContext.subtopicTitles || []).join('; ')}
- Big ideas: ${(emContext.bigIdeas || []).join('; ') || 'n/a'}
- Academic vocabulary: ${(emContext.academicVocabulary || []).join(', ') || 'n/a'}
- Common misconceptions: ${(emContext.commonMisconceptions || []).join('; ') || 'n/a'}
- Aligned standards: ${(emContext.alignedStandards || []).join(', ') || 'n/a'}
` : ''}

PERSONALIZATION REQUIREMENTS:
1. Reference the student's actual quiz performance and specific missed topics
2. Address the exact struggle areas identified from their assessments
3. Build directly on their last lesson: "${studentInfo[0]?.lastLesson || 'previous lesson'}"
4. Use their specific grade level: ${studentInfo[0]?.gradeLevel || 'grade level'}
5. Include activities that directly target their missed quiz questions
6. Provide scaffolding appropriate for their performance level

Return ONLY a valid JSON object with DOK levels matching this exact format:

{
  "objective": "Specific objective targeting [student's struggle areas] for Grade [X] student who scored [X/X] on [last lesson]",
  "alignedStandards": [
    {
      "standardCode": "string",
      "description": "string"
    }
  ],
  "engagement": [
    "Warm-up reviewing [specific missed concepts from quiz]",
    "Engagement activity targeting [specific struggle area]", 
    "Real-world connection to [student's grade level] experiences",
    "Discussion addressing [specific misconceptions from assessment]"
  ],
  "representation": [
    "Visual model specifically for [struggle area]",
    "Multiple representations of [missed quiz concepts]",
    "Scaffolded examples at [student's performance level]",
    "Concrete manipulatives for [specific struggle area]"
  ],
  "actionExpression": [
    "Guided practice on [specific missed quiz topics]",
    "Differentiated activity for [student's performance level]",
    "Individual work targeting [specific struggle areas]",
    "Assessment checking [specific concepts from last lesson]"
  ],
  "wrapup": [
    "Exit ticket on [specific struggle areas]",
    "Reflection on progress with [missed concepts]",
    "Connection to next lesson building on [current focus]",
    "Preview of how [struggle area] connects to upcoming topics"
  ],
  "duration": 25,
  "dokLevels": {
    "engagement": 1,
    "representation": 2,
    "action_expression": 3,
    "wrapup": 2
  }
}

CRITICAL GUIDELINES:
1. MUST reference actual student data - quiz scores, missed topics, grade level
2. MUST address specific struggle areas, not generic math concepts
3. MUST build on the specific last lesson topic
4. Each activity MUST be specific to this student's needs
5. Include specific scaffolding based on their performance level
6. Reference their actual quiz performance in activities
7. Make every activity directly address their identified struggles
8. Use their exact grade level throughout
9. Connect to their specific previous lessons and assessments
10. Provide concrete, actionable activities, not generic suggestions

EXAMPLE of specificity needed:
Instead of: "Practice addition problems"
Use: "Practice 2-digit addition with regrouping, focusing on place value concepts missed in yesterday's assessment where student scored 3/5"

NOVICE-TEACHER WRITING STYLE:
- Every bullet in engagement / representation / actionExpression / wrapup must read as
  a complete mini-instruction a new teacher can follow. Include WHAT to do, HOW to say it,
  and HOW LONG it takes. Example:
  "(2 min) Say: 'Yesterday we added fractions with the same denominator. Today we'll
  find common denominators first.' Write 1/2 + 1/3 on the board and wait 10 seconds for
  students to try it silently."
- Weave the Elevate Math reference into the objective (e.g., "Aligned with EM 5 Module 2:
  Fractions — Adding & Subtracting with Unlike Denominators").`;

export const DETAILED_ACTIVITIES_PROMPT = (
  studentContext: any,
  focusAreas: string[],
  teacherUsername?: string,
  emContext?: EMContext
) =>
`Create detailed lesson plan activities for a math lesson. You must return ONLY valid JSON without any markdown formatting.

AUDIENCE: The teacher may be new to teaching. Every activity must be followable
step-by-step without outside knowledge. Teacher script must be verbatim sentences,
not summaries. Steps must include exact timing.

Student Context: ${JSON.stringify(studentContext)}
Focus Areas: ${JSON.stringify(focusAreas)}
${teacherUsername ? `Teacher: ${teacherUsername}` : ''}
${emContext ? `
Elevate Math Reference (cite in each activity's objective and setup):
- Reference: ${emContext.reference || ''}
- Level: ${emContext.levelTitle || ''}
- Module: ${emContext.moduleTitle || ''}
- Subtopics: ${(emContext.subtopicTitles || []).join('; ')}
- Big ideas to reinforce: ${(emContext.bigIdeas || []).join('; ') || 'n/a'}
- Academic vocabulary: ${(emContext.academicVocabulary || []).join(', ') || 'n/a'}
- Common misconceptions to address: ${(emContext.commonMisconceptions || []).join('; ') || 'n/a'}
- Aligned standards: ${(emContext.alignedStandards || []).join(', ') || 'n/a'}

REQUIREMENTS WHEN EM CONTEXT IS PROVIDED:
- Each activity's "objective" must name the EM reference in plain language (e.g.,
  "From EM 5 Module 2: students build common denominators using fraction bars").
- "setup" must tell the teacher exactly what to place on desks, pull up on the board,
  and pre-write before students arrive.
- "teacherScript" must contain verbatim sentences the teacher reads aloud, including
  transitions and the specific vocabulary from the EM reference.
- "steps" must be numbered with exact minute/second timings that add up to timeAllocation.
- Include at least one step labeled "Look-fors" describing what the teacher should observe
  to know students are getting it (and what to do if they are not).
` : ''}

Create detailed activities that follow this EXACT format. Return ONLY valid JSON:
{
  "detailedActivities": {
    "engagement": [
      {
        "description": "Real-world problem exploration",
        "timeAllocation": "5-7 minutes",
        "objective": "Specific learning objective for this activity",
        "materials": [
          "Specific materials needed",
          "Manipulatives or tools",
          "Visual aids"
        ],
        "setup": "Detailed setup instructions for the classroom",
        "steps": [
          {
            "phase": "Launch",
            "duration": "30 seconds",
            "instruction": "Specific teacher instruction",
            "expectedResponse": "What students should do/say"
          },
          {
            "phase": "Private Think",
            "duration": "30 seconds", 
            "instruction": "Individual work instruction",
            "expectedResponse": "Expected student response"
          },
          {
            "phase": "Group Work",
            "duration": "2-3 minutes",
            "instruction": "Group activity instruction",
            "expectedResponse": "Expected group outcome"
          },
          {
            "phase": "Share",
            "duration": "1-2 minutes",
            "instruction": "Sharing and discussion prompt",
            "expectedResponse": "Expected sharing outcome"
          }
        ],
        "teacherScript": [
          "Exact dialogue for launch",
          "Questions to ask students",
          "Prompts for group work",
          "Closing statements"
        ],
        "expectedStudentBehaviors": [
          "Observable student actions",
          "Expected participation",
          "Learning behaviors"
        ],
      "differentiation": {
        "struggling": ["Support strategies"],
          "struggling": [
            "Specific support strategies",
            "Guiding questions",
            "Additional scaffolds"
          ],
          "advanced": [
            "Extension activities",
            "Challenge problems",
            "Leadership roles"
          ]
        },
        "commonMisconceptions": [
          "Specific misconceptions to watch for",
          "Common errors students make"
        ],
        "quickAssessment": [
          "Formative assessment questions",
          "Check for understanding strategies"
        ],
        "successCriteria": [
          "Observable evidence of learning",
          "What students should be able to do"
        ]
      }
    ],
    "representation": [
      {
        "description": "Visual modeling activity",
        "timeAllocation": "6-8 minutes",
        "objective": "Specific objective for representation",
        "materials": ["Visual materials", "Modeling tools"],
        "setup": "Setup for visual work",
        "steps": [
          {
            "phase": "Model Introduction",
            "duration": "1 minute",
            "instruction": "Introduce the visual model",
            "expectedResponse": "Student attention and questions"
          },
          {
            "phase": "Guided Practice",
            "duration": "3-4 minutes",
            "instruction": "Guide students through modeling",
            "expectedResponse": "Students create accurate models"
          },
          {
            "phase": "Independent Practice",
            "duration": "2-3 minutes",
            "instruction": "Students work independently",
            "expectedResponse": "Individual model creation"
          }
        ],
        "teacherScript": [
          "Model introduction dialogue",
          "Guided practice prompts",
          "Independent work instructions"
        ],
        "expectedStudentBehaviors": [
          "Creating visual representations",
          "Using mathematical tools correctly"
        ],
        "differentiation": {
          "struggling": ["Visual supports", "Templates"],
          "advanced": ["Complex models", "Multiple representations"]
        },
        "commonMisconceptions": ["Visual modeling errors"],
        "quickAssessment": ["Model accuracy checks"],
        "successCriteria": ["Accurate visual representations"]
      }
    ],
    "actionExpression": [
      {
        "description": "Problem-solving practice",
        "timeAllocation": "8-10 minutes",
        "objective": "Apply learning through practice",
        "materials": ["Practice materials", "Assessment tools"],
        "setup": "Practice setup instructions",
        "steps": [
          {
            "phase": "Guided Practice",
            "duration": "3-4 minutes",
            "instruction": "Guide through practice problems",
            "expectedResponse": "Successful problem solving"
          },
          {
            "phase": "Independent Work",
            "duration": "4-5 minutes",
            "instruction": "Independent practice time",
            "expectedResponse": "Individual problem solving"
          },
          {
            "phase": "Check and Adjust",
            "duration": "1-2 minutes",
            "instruction": "Review and provide feedback",
            "expectedResponse": "Self-correction and improvement"
          }
        ],
        "teacherScript": [
          "Practice introduction",
          "Guidance during work",
          "Feedback and corrections"
        ],
        "expectedStudentBehaviors": [
          "Applying strategies learned",
          "Working independently"
        ],
        "differentiation": {
          "struggling": ["Additional support", "Simplified problems"],
          "advanced": ["Challenge problems", "Extension tasks"]
        },
        "commonMisconceptions": ["Practice errors to watch"],
        "quickAssessment": ["Progress monitoring"],
        "successCriteria": ["Successful problem completion"]
      }
    ],
    "wrapup": [
      {
        "description": "Lesson synthesis and closure",
        "timeAllocation": "3-4 minutes",
        "objective": "Synthesize and reflect on learning",
        "materials": ["Exit tickets", "Reflection tools"],
        "setup": "Closure setup",
        "steps": [
          {
            "phase": "Review",
            "duration": "1 minute",
            "instruction": "Review key concepts",
            "expectedResponse": "Student summary of learning"
          },
          {
            "phase": "Exit Ticket",
            "duration": "2 minutes",
            "instruction": "Complete exit assessment",
            "expectedResponse": "Completed exit ticket"
          },
          {
            "phase": "Preview",
            "duration": "30 seconds",
            "instruction": "Preview next lesson",
            "expectedResponse": "Understanding of next steps"
          }
        ],
        "teacherScript": [
          "Review prompts",
          "Exit ticket instructions",
          "Next lesson preview"
        ],
        "expectedStudentBehaviors": [
          "Reflecting on learning",
          "Completing assessments"
        ],
        "differentiation": {
          "struggling": ["Simplified exit tickets"],
          "advanced": ["Extension reflections"]
        },
        "commonMisconceptions": ["End-of-lesson errors"],
        "quickAssessment": ["Exit ticket analysis"],
        "successCriteria": ["Demonstrated understanding"]
      }
    ]
  }
}

CRITICAL REQUIREMENTS:
1. Return ONLY valid JSON - no markdown, no explanations, no code blocks
2. Each activity must have ALL the fields shown above
3. Steps must include specific timing that adds up to the timeAllocation
4. Include specific teacher dialogue in teacherScript
5. Address the student's actual struggle areas: ${JSON.stringify(focusAreas)}
6. Make activities grade-appropriate for: ${studentContext.grade || 'grade level'}
7. Reference the student's quiz performance if available
8. Include real-world contexts and concrete examples
9. Provide specific differentiation strategies
10. Include observable success criteria

The response must start with { and end with } and be valid JSON that can be parsed directly.`;