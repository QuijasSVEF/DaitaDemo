import { supabase } from '../supabase/config';
import { LessonPlan, ExitTicketResult, Student } from '../../types';
import { LessonPlanData } from './types';
import { LessonPlanNotFoundError, LessonPlanSaveError } from './errors';
import { v4 as uuidv4 } from 'uuid';

export async function saveLessonPlan(
  lessonPlan: LessonPlan,
  studentId: number,
  teacherUsername: string,
  student: Student,
  exitTicket: ExitTicketResult
): Promise<LessonPlanData> {
  try {
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
        duration: lessonPlan.duration,
        unique_id: uuidv4()
      }])
      .select(`
        *,
        students!inner(grade_level)
      `)
      .single();

    if (error) {
      throw new LessonPlanSaveError(error);
    }

    return {
      plan: lessonPlan,
      studentId,
      studentGrade: student.gradeLevel,
      exitTicket,
      uniqueId: data.unique_id
    };
  } catch (error) {
    console.error('Error saving lesson plan:', error);
    throw new LessonPlanSaveError(error);
  }
}

export async function getTeacherLessonPlans(teacherUsername: string): Promise<LessonPlanData[]> {
  try {
    const { data, error } = await supabase
      .from('lesson_plans')
      .select(`
        *,
        students!inner(grade_level),
        exit_tickets!inner(
          student_id,
          score,
          total_questions,
          struggled_areas,
          last_lesson,
          created_at
        )
      `)
      .eq('teacher_username', teacherUsername)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting lesson plans:', error);
      return [];
    }

    return data.map(doc => ({
      plan: {
        objective: doc.objective,
        engagement: doc.engagement,
        representation: doc.representation,
        actionExpression: doc.action_expression,
        wrapup: doc.wrapup,
        duration: doc.duration
      },
      studentId: doc.student_id,
      studentGrade: doc.students.grade_level,
      exitTicket: {
        studentId: doc.exit_tickets.student_id,
        score: doc.exit_tickets.score,
        totalQuestions: doc.exit_tickets.total_questions,
        struggledAreas: doc.exit_tickets.struggled_areas,
        lastLesson: doc.exit_tickets.last_lesson,
        timestamp: new Date(doc.exit_tickets.created_at)
      },
      uniqueId: doc.unique_id
    }));
  } catch (error) {
    console.error('Error getting lesson plans:', error);
    return [];
  }
}

export async function getLessonPlanByExitTicket(
  studentId: number,
  exitTicketTimestamp: Date,
  teacherUsername: string
): Promise<LessonPlanData | null> {
  try {
    const startOfDay = new Date(exitTicketTimestamp);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(exitTicketTimestamp);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('lesson_plans')
      .select(`
        *,
        students!inner(grade_level),
        exit_tickets!inner(
          student_id,
          score,
          total_questions,
          struggled_areas,
          last_lesson,
          created_at
        )
      `)
      .eq('teacher_username', teacherUsername)
      .eq('student_id', studentId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .single();

    if (error) {
      throw new LessonPlanNotFoundError(error);
    }

    return {
      plan: {
        objective: data.objective,
        engagement: data.engagement,
        representation: data.representation,
        actionExpression: data.action_expression,
        wrapup: data.wrapup,
        duration: data.duration
      },
      studentId: data.student_id,
      studentGrade: data.students.grade_level,
      exitTicket: {
        studentId: data.exit_tickets.student_id,
        score: data.exit_tickets.score,
        totalQuestions: data.exit_tickets.total_questions,
        struggledAreas: data.exit_tickets.struggled_areas,
        lastLesson: data.exit_tickets.last_lesson,
        timestamp: new Date(data.exit_tickets.created_at)
      },
      uniqueId: data.unique_id
    };
  } catch (error) {
    console.error('Error getting lesson plan:', error);
    throw new LessonPlanNotFoundError(error);
  }
}