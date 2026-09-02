import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase/config';

interface UseRealTimeUpdatesProps {
  teacherUsername: string;
  onAssessmentCompleted?: (data: any) => void;
  onLessonPlanGenerated?: (data: any) => void;
  onDataUpdated?: () => void;
}

export function useRealTimeUpdates({
  teacherUsername,
  onAssessmentCompleted,
  onLessonPlanGenerated,
  onDataUpdated
}: UseRealTimeUpdatesProps) {
  const queryClient = useQueryClient();

  const invalidateAllQueries = useCallback(async () => {
    console.log('🔄 Invalidating all teacher queries for real-time update');
    
    await Promise.all([
      queryClient.invalidateQueries(['teacherStudents', teacherUsername]),
      queryClient.invalidateQueries(['teacherExitTickets', teacherUsername]),
      queryClient.invalidateQueries(['teacherLessonPlans', teacherUsername]),
      queryClient.invalidateQueries(['weeklyGroups', teacherUsername]),
      queryClient.invalidateQueries(['classroomAnalytics', teacherUsername]),
      queryClient.invalidateQueries(['studentsWithAssessments', teacherUsername]),
      queryClient.invalidateQueries(['studentsWithAssessmentsDropdown', teacherUsername])
    ]);

    // Force refetch critical queries
    await Promise.all([
      queryClient.refetchQueries(['teacherStudents', teacherUsername]),
      queryClient.refetchQueries(['studentsWithAssessments', teacherUsername])
    ]);

    onDataUpdated?.();
  }, [queryClient, teacherUsername, onDataUpdated]);

  useEffect(() => {
    if (!teacherUsername) return;

    console.log('🔌 Setting up real-time subscriptions for teacher:', teacherUsername);

    // Subscribe to quiz attempts (assessments completed)
    const quizAttemptsSubscription = supabase
      .channel(`quiz_attempts_${teacherUsername}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_attempts',
          filter: `teacher_username=eq.${teacherUsername}`
        },
        async (payload) => {
          console.log('📝 New quiz attempt detected:', payload.new);
          
          onAssessmentCompleted?.(payload.new);
          
          // Wait a moment for database triggers to complete
          setTimeout(async () => {
            await invalidateAllQueries();
          }, 1000);
        }
      )
      .subscribe();

    // Subscribe to lesson plans (generated after assessments)
    const lessonPlansSubscription = supabase
      .channel(`lesson_plans_${teacherUsername}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lesson_plans',
          filter: `teacher_username=eq.${teacherUsername}`
        },
        async (payload) => {
          console.log('📚 New lesson plan generated:', payload.new);
          
          onLessonPlanGenerated?.(payload.new);
          
          // Invalidate queries to refresh UI
          await invalidateAllQueries();
        }
      )
      .subscribe();

    // Subscribe to exit tickets
    const exitTicketsSubscription = supabase
      .channel(`exit_tickets_${teacherUsername}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exit_tickets',
          filter: `teacher_username=eq.${teacherUsername}`
        },
        async (payload) => {
          console.log('🎫 New exit ticket created:', payload.new);
          
          // Invalidate queries to refresh UI
          await invalidateAllQueries();
        }
      )
      .subscribe();

    // Subscribe to students table for new student registrations
    const studentsSubscription = supabase
      .channel(`students_${teacherUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
          filter: `teacher_username=eq.${teacherUsername}`
        },
        async (payload) => {
          console.log('👥 Student data updated:', payload);
          
          // Invalidate queries to refresh UI
          await invalidateAllQueries();
        }
      )
      .subscribe();

    // Subscribe to weekly groups updates
    const weeklyGroupsSubscription = supabase
      .channel(`weekly_groups_${teacherUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_groups',
          filter: `teacher_username=eq.${teacherUsername}`
        },
        async (payload) => {
          console.log('👥 Weekly groups updated:', payload);
          
          await queryClient.invalidateQueries(['weeklyGroups', teacherUsername]);
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up real-time subscriptions for teacher:', teacherUsername);
      
      quizAttemptsSubscription.unsubscribe();
      lessonPlansSubscription.unsubscribe();
      exitTicketsSubscription.unsubscribe();
      studentsSubscription.unsubscribe();
      weeklyGroupsSubscription.unsubscribe();
    };
  }, [teacherUsername, invalidateAllQueries, onAssessmentCompleted, onLessonPlanGenerated]);

  return {
    invalidateAllQueries
  };
}