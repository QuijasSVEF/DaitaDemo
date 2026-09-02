import { ExitTicketResult, Student } from '../types';
import { openai, MODEL } from './openai/config';
import { ANALYTICS_PROMPT, STANDARDS_ALIGNMENT_PROMPT } from './openai/prompts';
import { getStandardsByGrade } from './supabase/standards';

export interface ClassroomAnalysis {
  totalStudents: number;
  averageScore: number;
  totalAssessments: number;
  struggleAreas: {
    area: string;
    count: number;
    students: number[];
    recommendations: string[];
    relatedConcepts: string[];
    alignedStandards: {
      standardCode: string;
      description: string;
      matchConfidence: number;
    }[];
  }[];
  insights: string[];
  recommendations: string[];
}

export async function analyzeClassroomData(
  students: Student[],
  exitTickets: ExitTicketResult[]
): Promise<ClassroomAnalysis> {
  const uniqueStudents = Array.from(
    new Map(students.map(student => [student.id, student])).values()
  );

  if (uniqueStudents.length === 0 || exitTickets.length === 0) {
    return createFallbackAnalysis(uniqueStudents, exitTickets);
  }

  const allStruggles = exitTickets.flatMap(ticket => ticket.struggledAreas);
  const uniqueStruggles = Array.from(new Set(allStruggles));
  const gradeLevels = [...new Set(students.map(s => s.gradeLevel))];
  const standards = await getStandardsByGrade(gradeLevels);

  try {
    // First get analytics
    const analyticsCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: ANALYTICS_PROMPT(uniqueStruggles) }],
      model: MODEL,
      temperature: 0.3 // Lower temperature for more consistent responses
    });

    const analyticsResponse = analyticsCompletion.choices[0].message.content;
    if (!analyticsResponse) {
      throw new Error('Empty response from OpenAI');
    }

    // Clean the response of any markdown formatting
    const cleanAnalyticsResponse = analyticsResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    // Then get standards alignment
    const standardsCompletion = await openai.chat.completions.create({
      messages: [{ role: "user", content: STANDARDS_ALIGNMENT_PROMPT(uniqueStruggles, standards) }],
      model: MODEL,
      temperature: 0.3
    });

    const standardsResponse = standardsCompletion.choices[0].message.content;
    if (!standardsResponse) {
      throw new Error('Empty standards response from OpenAI');
    }

    // Clean the standards response of any markdown formatting
    const cleanStandardsResponse = standardsResponse
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let aiResponse;
    let standardsData;
    try {
      aiResponse = JSON.parse(cleanAnalyticsResponse);
      standardsData = JSON.parse(cleanStandardsResponse);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      return createFallbackAnalysis(uniqueStudents, exitTickets);
    }

    if (!aiResponse?.struggleAreas?.length || !standardsData?.alignments) {
      console.warn('Invalid response format from OpenAI');
      return createFallbackAnalysis(uniqueStudents, exitTickets);
    }
    
    const processedAreas = aiResponse.struggleAreas.map(area => {
      const matchingStudents = new Set<number>();
      
      const searchTerms = [area.area, ...area.relatedTerms].map(term => term.toLowerCase());
      
      exitTickets.forEach(ticket => {
        const struggles = ticket.struggledAreas.map(s => s.toLowerCase());
        if (struggles.some(struggle => 
          searchTerms.some(term => struggle.includes(term) || term.includes(struggle))
        )) {
          matchingStudents.add(ticket.studentId);
        }
      });

      return {
        area: area.area,
        count: matchingStudents.size,
        students: Array.from(matchingStudents),
        recommendations: area.recommendations,
        relatedConcepts: area.relatedConcepts,
        alignedStandards: standardsData.alignments
          .find(alignment => alignment.struggleArea === area.area)?.standards || []
      };
    });

    return {
      totalStudents: uniqueStudents.length,
      averageScore: calculateAverageScore(exitTickets),
      totalAssessments: exitTickets.length,
      struggleAreas: processedAreas,
      insights: generateInsights(processedAreas, uniqueStudents.length),
      recommendations: generateRecommendations(processedAreas)
    };
  } catch (error) {
    console.error('Error analyzing classroom data:', error);
    return createFallbackAnalysis(uniqueStudents, exitTickets);
  }
}

function calculateAverageScore(exitTickets: ExitTicketResult[]): number {
  if (exitTickets.length === 0) return 0;
  return exitTickets.reduce((sum, ticket) => 
    sum + (ticket.score / ticket.totalQuestions) * 100, 0
  ) / exitTickets.length;
}

function generateInsights(
  struggleAreas: ClassroomAnalysis['struggleAreas'],
  totalStudents: number
): string[] {
  const insights: string[] = [];
  
  const mostCommonStruggle = struggleAreas.reduce((prev, current) => 
    current.count > prev.count ? current : prev
  );
  
  if (mostCommonStruggle.count > totalStudents / 2) {
    insights.push(`More than half of the class needs support with ${mostCommonStruggle.area}`);
  }

  const multipleStruggles = struggleAreas.filter(area => area.count >= 2);
  if (multipleStruggles.length > 0) {
    insights.push(`${multipleStruggles.length} concepts need class-wide attention`);
  }

  return insights;
}

function generateRecommendations(
  struggleAreas: ClassroomAnalysis['struggleAreas']
): string[] {
  const recommendations: string[] = [];
  
  if (struggleAreas.length > 0) {
    recommendations.push(
      "Implement targeted small group instruction for specific concept areas",
      "Use visual aids and manipulatives to reinforce understanding",
      "Provide regular opportunities for student self-assessment",
      "Create concept-specific practice stations for differentiated learning"
    );
  }

  return recommendations;
}

function createFallbackAnalysis(
  students: Student[],
  exitTickets: ExitTicketResult[]
): ClassroomAnalysis {
  const struggleAreas = new Map<string, Set<number>>();
  
  exitTickets.forEach(ticket => {
    ticket.struggledAreas.forEach(area => {
      if (!struggleAreas.has(area)) {
        struggleAreas.set(area, new Set());
      }
      struggleAreas.get(area)?.add(ticket.studentId);
    });
  });

  return {
    totalStudents: students.length,
    averageScore: calculateAverageScore(exitTickets),
    totalAssessments: exitTickets.length,
    struggleAreas: Array.from(struggleAreas.entries()).map(([area, students]) => ({
      area,
      count: students.size,
      students: Array.from(students),
      recommendations: ['Review core concepts', 'Provide additional practice'],
      relatedConcepts: [],
      alignedStandards: []
    })),
    insights: ['Analysis based on available assessment data'],
    recommendations: ['Consider differentiated instruction based on student needs']
  };
}