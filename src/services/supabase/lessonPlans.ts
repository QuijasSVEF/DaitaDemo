import { supabase } from './config';
import { LessonPlan, Student, ExitTicketResult } from '../../types';

export async function saveLessonPlan(
  lessonPlan: LessonPlan,
  studentId: number,
  teacherUsername: string
): Promise<{
  plan: LessonPlan;
  studentId: number;
  studentGrade: string;
  uniqueId: string;
}> {
  const { data, error } = await supabase
    .from('lesson_plans')
    .insert([{
      student_id: studentId,
      teacher_username: teacherUsername,
      objective: lessonPlan.objective,
      engagement: lessonPlan.engagement,
      representation: lessonPlan.representation,
      action_expression: lessonPlan.actionExpression,
      wrapup: lessonPlan.wrapup,
      duration: lessonPlan.duration
    }])
    .select('*')
    .single();

  if (error) {
    console.error('Error saving lesson plan:', error);
    throw error;
  }

  const { data: student } = await supabase
    .from('students')
    .select('grade_level')
    .eq('id', studentId)
    .eq('teacher_username', teacherUsername)
    .maybeSingle();

  return {
    plan: lessonPlan,
    studentId: data.student_id,
    studentGrade: student?.grade_level || '',
    uniqueId: data.id
  };
}

export async function getTeacherLessonPlans(teacherUsername: string) {
  const { data, error } = await supabase
    .from('lesson_plans')
    .select('*')
    .eq('teacher_username', teacherUsername)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting lesson plans:', error);
    return [];
  }

  const studentIds = [...new Set(data.map(p => p.student_id))];
  const { data: students } = await supabase
    .from('students')
    .select('id, grade_level')
    .eq('teacher_username', teacherUsername)
    .in('id', studentIds);

  const gradeMap = new Map<number, string>();
  students?.forEach(s => gradeMap.set(s.id, s.grade_level));

  return data.map(plan => ({
    plan: {
      objective: plan.objective,
      engagement: plan.engagement,
      representation: plan.representation,
      actionExpression: plan.action_expression,
      wrapup: plan.wrapup,
      duration: plan.duration,
      alignedStandards: plan.aligned_standards || [],
      dokLevels: plan.dok_levels,
      detailedActivities: plan.detailed_activities
    },
    studentId: plan.student_id,
    studentGrade: gradeMap.get(plan.student_id) || '',
    uniqueId: plan.id
  }));
}

export async function getLessonPlanByExitTicket(
  studentId: number,
  exitTicketTimestamp: Date,
  teacherUsername: string
) {
  const startOfDay = new Date(exitTicketTimestamp);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(exitTicketTimestamp);
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const { data, error } = await supabase
      .from('lesson_plans')
      .select('*')
      .eq('teacher_username', teacherUsername)
      .eq('student_id', studentId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    if (!data) return null;

    const { data: student } = await supabase
      .from('students')
      .select('grade_level')
      .eq('id', studentId)
      .eq('teacher_username', teacherUsername)
      .maybeSingle();

    return {
      plan: {
        objective: data.objective,
        engagement: data.engagement,
        representation: data.representation,
        actionExpression: data.action_expression,
        wrapup: data.wrapup,
        duration: data.duration,
        alignedStandards: data.aligned_standards || [],
        dokLevels: data.dok_levels,
        detailedActivities: data.detailed_activities
      },
      studentId: data.student_id,
      studentGrade: student?.grade_level || '',
      uniqueId: data.id
    };
  } catch (error) {
    console.error('Error getting lesson plan:', error);
    return null;
  }
}