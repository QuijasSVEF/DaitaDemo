import { supabase } from './config';
import { ExitTicketResult } from '../../types';

export async function saveExitTicket(exitTicket: ExitTicketResult, teacherUsername: string): Promise<ExitTicketResult> {
  const { data, error } = await supabase
    .from('exit_tickets')
    .insert([{
      student_id: exitTicket.studentId,
      teacher_username: teacherUsername,
      score: exitTicket.score,
      total_questions: exitTicket.totalQuestions,
      struggled_areas: exitTicket.struggledAreas,
      last_lesson: exitTicket.lastLesson
    }])
    .select()
    .single();

  if (error) {
    console.error('Error saving exit ticket:', error);
    throw error;
  }

  return {
    id: data.id,
    studentId: data.student_id,
    score: data.score,
    totalQuestions: data.total_questions,
    struggledAreas: data.struggled_areas,
    lastLesson: data.last_lesson,
    timestamp: new Date(data.created_at)
  };
}

export async function getTeacherExitTickets(teacherUsername: string): Promise<ExitTicketResult[]> {
  const [exitTicketResponse, quizAttemptResponse] = await Promise.all([
    supabase
      .from('exit_tickets')
      .select('*')
      .eq('teacher_username', teacherUsername)
      .order('created_at', { ascending: false }),
    supabase
      .from('quiz_attempts')
      .select('id, student_id, score, total_questions, answers, completed_at, quiz_templates(topic)')
      .eq('teacher_username', teacherUsername)
      .order('completed_at', { ascending: false })
  ]);

  const exitTickets: ExitTicketResult[] = (exitTicketResponse.data || []).map(ticket => ({
    id: ticket.id,
    studentId: ticket.student_id,
    score: ticket.score,
    totalQuestions: ticket.total_questions,
    struggledAreas: ticket.struggled_areas,
    lastLesson: ticket.last_lesson,
    timestamp: new Date(ticket.created_at)
  }));

  const quizResults: ExitTicketResult[] = (quizAttemptResponse.data || []).map(attempt => {
    const answers = Array.isArray(attempt.answers) ? attempt.answers : [];

    // Build per-subtopic stats to create granular struggle descriptions
    const subtopicStats = new Map<string, { total: number; missed: number; missedTexts: string[] }>();
    for (const a of answers as any[]) {
      const sub = a.questionSubtopic as string;
      if (!sub) continue;
      const entry = subtopicStats.get(sub) || { total: 0, missed: 0, missedTexts: [] };
      entry.total++;
      if (!a.correct) {
        entry.missed++;
        if (a.questionText) entry.missedTexts.push(a.questionText);
      }
      subtopicStats.set(sub, entry);
    }

    // Mark a subtopic as a struggle if the student missed any question
    const struggleAreas: string[] = [];
    for (const [sub, stats] of subtopicStats) {
      if (stats.missed > 0) {
        struggleAreas.push(sub);
      }
    }

    const topic = (attempt.quiz_templates as any)?.topic || 'Assessment';

    return {
      id: attempt.id,
      studentId: attempt.student_id,
      score: attempt.score || 0,
      totalQuestions: attempt.total_questions || answers.length,
      struggledAreas: struggleAreas,
      lastLesson: topic,
      timestamp: new Date(attempt.completed_at)
    };
  });

  return [...exitTickets, ...quizResults].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}