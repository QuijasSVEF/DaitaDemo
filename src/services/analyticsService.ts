import { StudentAnalytics, ExitTicketResult } from '../types';

export function calculateStudentAnalytics(exitTickets: ExitTicketResult[]): StudentAnalytics {
  if (!exitTickets.length) {
    return {
      studentId: 0,
      averageScore: 0,
      totalAssessments: 0,
      commonStruggles: [],
      progressTrend: 'steady'
    };
  }

  const studentId = exitTickets[0].studentId;
  
  // Calculate average score
  const totalScore = exitTickets.reduce((sum, ticket) => 
    sum + (ticket.score / ticket.totalQuestions) * 100, 0);
  const averageScore = totalScore / exitTickets.length;

  // Analyze progress trend
  const recentScores = exitTickets
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 3)
    .map(ticket => (ticket.score / ticket.totalQuestions) * 100);
  
  let progressTrend: 'improving' | 'steady' | 'declining' = 'steady';
  if (recentScores.length >= 2) {
    const trend = recentScores[0] - recentScores[recentScores.length - 1];
    if (trend > 5) progressTrend = 'improving';
    else if (trend < -5) progressTrend = 'declining';
  }

  // Analyze common struggles
  const struggleMap = new Map<string, number>();
  exitTickets.forEach(ticket => {
    ticket.struggledAreas.forEach(area => {
      struggleMap.set(area, (struggleMap.get(area) || 0) + 1);
    });
  });

  const commonStruggles = Array.from(struggleMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([struggle]) => struggle);

  return {
    studentId,
    averageScore,
    totalAssessments: exitTickets.length,
    commonStruggles,
    progressTrend,
  };
}