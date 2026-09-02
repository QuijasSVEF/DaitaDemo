import { supabase } from './config';
import { LessonPlan } from '../../types';

export interface GroupLessonPlan {
  id: string;
  groupId: string;
  teacherUsername: string;
  lessonPlan: LessonPlan & {
    detailedActivities: {
      engagement: DetailedActivity[];
      representation: DetailedActivity[];
      actionExpression: DetailedActivity[];
      wrapup: DetailedActivity[];
    };
  };
  studentIds: number[];
  focusAreas: string[];
  createdAt: Date;
}

export async function saveGroupLessonPlan(
  groupId: string,
  lessonPlan: LessonPlan,
  studentIds: number[],
  focusAreas: string[],
  teacherUsername: string
): Promise<GroupLessonPlan> {
  try {
    const { data, error } = await supabase
      .from('group_lesson_plans')
      .insert([{
        group_id: groupId,
        teacher_username: teacherUsername,
        lesson_plan: {
          objective: lessonPlan.objective,
          engagement: lessonPlan.engagement,
          representation: lessonPlan.representation,
          action_expression: lessonPlan.actionExpression,
          wrapup: lessonPlan.wrapup,
          duration: lessonPlan.duration,
          detailedActivities: lessonPlan.detailedActivities || {
            engagement: [],
            representation: [],
            actionExpression: [],
            wrapup: []
          }
        },
        student_ids: studentIds,
        focus_areas: focusAreas
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }
    
    return {
      id: data.id,
      groupId: data.group_id,
      teacherUsername: data.teacher_username,
      lessonPlan: {
        objective: data.lesson_plan.objective,
        engagement: data.lesson_plan.engagement,
        representation: data.lesson_plan.representation,
        actionExpression: data.lesson_plan.action_expression,
        wrapup: data.lesson_plan.wrapup,
        duration: data.lesson_plan.duration,
        detailedActivities: data.lesson_plan.detailedActivities || {
          engagement: [],
          representation: [],
          actionExpression: [],
          wrapup: []
        }
      },
      studentIds: data.student_ids,
      focusAreas: data.focus_areas,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error('Error saving group lesson plan:', error);
    throw error;
  }
}

export async function getGroupLessonPlan(groupId: string): Promise<GroupLessonPlan | null> {
  try {
    const { data, error } = await supabase
      .from('group_lesson_plans')
      .select(`
        id,
        group_id,
        teacher_username,
        lesson_plan,
        student_ids,
        focus_areas,
        created_at
      `)
      .eq('group_id', groupId)
      .maybeSingle();
    
    if (error) {
      console.error('Error getting group lesson plan:', error);
      return null;
    }

    if (!data || !data.lesson_plan) {
      console.error('No lesson plan data found');
      return null;
    }

    return {
      id: data.id,
      groupId: data.group_id,
      teacherUsername: data.teacher_username,
      lessonPlan: {
        objective: data.lesson_plan.objective,
        engagement: data.lesson_plan.engagement,
        representation: data.lesson_plan.representation,
        actionExpression: data.lesson_plan.action_expression,
        wrapup: data.lesson_plan.wrapup,
        duration: data.lesson_plan.duration,
        detailedActivities: data.lesson_plan.detailedActivities || {
          engagement: [],
          representation: [],
          actionExpression: [],
          wrapup: []
        }
      },
      studentIds: data.student_ids,
      focusAreas: data.focus_areas,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error('Error getting group lesson plan:', error);
    return null;
  }
}

export async function regenerateGroupLessonPlan(
  groupLessonPlanId: string,
  newLessonPlan: LessonPlan
): Promise<GroupLessonPlan | null> {
  try {
    const { data: updatedPlan, error } = await supabase
      .from('group_lesson_plans')
      .update({
        lesson_plan: {
          objective: newLessonPlan.objective,
          engagement: newLessonPlan.engagement,
          representation: newLessonPlan.representation,
          action_expression: newLessonPlan.actionExpression,
          wrapup: newLessonPlan.wrapup,
          duration: newLessonPlan.duration,
          aligned_standards: newLessonPlan.alignedStandards || [],
          dok_levels: newLessonPlan.dokLevels || {
            engagement: 1,
            representation: 2,
            action_expression: 3,
            wrapup: 2
          },
          detailedActivities: newLessonPlan.detailedActivities || {
            engagement: [],
            representation: [],
            actionExpression: [],
            wrapup: []
          }
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', groupLessonPlanId)
      .select()
      .single();

    if (error) {
      console.error('Error updating group lesson plan:', error);
      return null;
    }

    return {
      id: updatedPlan.id,
      groupId: updatedPlan.group_id,
      teacherUsername: updatedPlan.teacher_username,
      lessonPlan: {
        objective: updatedPlan.lesson_plan.objective,
        engagement: updatedPlan.lesson_plan.engagement,
        representation: updatedPlan.lesson_plan.representation,
        actionExpression: updatedPlan.lesson_plan.action_expression,
        wrapup: updatedPlan.lesson_plan.wrapup,
        duration: updatedPlan.lesson_plan.duration,
        alignedStandards: updatedPlan.lesson_plan.aligned_standards || [],
        dokLevels: updatedPlan.lesson_plan.dok_levels || {
          engagement: 1,
          representation: 2,
          action_expression: 3,
          wrapup: 2
        },
        detailedActivities: updatedPlan.lesson_plan.detailedActivities || {
          engagement: [],
          representation: [],
          actionExpression: [],
          wrapup: []
        }
      },
      studentIds: updatedPlan.student_ids,
      focusAreas: updatedPlan.focus_areas,
      createdAt: new Date(updatedPlan.created_at)
    };
  } catch (error) {
    console.error('Error regenerating group lesson plan:', error);
    return null;
  }
}