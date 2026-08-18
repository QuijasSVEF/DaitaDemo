import { Student, ExitTicketResult } from '../../types';
import { StudentGroupData } from './types';

export function prepareStudentData(
  students: Student[],
  exitTickets: ExitTicketResult[]
): StudentGroupData[] {
  // Callers are responsible for providing already-filtered current-week tickets
  const weeklyTickets = exitTickets;

  if (weeklyTickets.length === 0) {
    return [];
  }

  // Get unique students who have tickets this week
  const studentsWithTickets = new Set(weeklyTickets.map(ticket => ticket.studentId));
  const relevantStudents = students.filter(student => studentsWithTickets.has(student.id));

  const studentData = relevantStudents.map(student => {
    const studentTickets = weeklyTickets.filter(ticket => ticket.studentId === student.id);

    // Get unique struggles sorted for consistent comparison
    const struggles = Array.from(new Set(
      studentTickets.flatMap(ticket => ticket.struggledAreas)
    )).sort();

    const averageScore = studentTickets.length > 0
      ? studentTickets.reduce((sum, ticket) =>
          sum + (ticket.score / ticket.totalQuestions), 0) / studentTickets.length
      : 0;

    return {
      id: student.id,
      gradeLevel: student.gradeLevel,
      struggles,
      averageScore
    };
  }).filter(student => student.struggles.length > 0);

  return studentData;
}