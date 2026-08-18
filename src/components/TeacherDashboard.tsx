import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { ClassroomAnalytics } from './ClassroomAnalytics';
import { StudentView } from './StudentView';
import { WeeklyGroups } from './WeeklyGroups';
import { QuizSettings } from './quiz/QuizSettings';
import { AssessmentsView } from './assessments/AssessmentsView';
import { Student, Teacher, ExitTicketResult } from '../types';
import { CoachFeedbackSection } from './CoachFeedbackSection';
import { QuizSettings as QuizSettingsType } from '../types/quiz';
import { supabase } from '../services/supabase/config';
import { saveQuizTemplate } from '../services/quizService';
import {
  getTeacherStudents,
  getTeacherExitTickets,
} from '../services/firebase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { useGenerationStatus } from '../hooks/useGenerationStatus';
import { GenerationStatusBadge } from './GenerationStatusBadge';
import { StudentQRCode } from './shared/StudentQRCode';

interface Props {
  teacher: Teacher | null;
  onSignOut: () => void;
  isCoachView?: boolean;
  coachName?: string;
}

export function TeacherDashboard({ teacher, onSignOut, isCoachView, coachName }: Props) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [shouldUpdateAnalytics, setShouldUpdateAnalytics] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizSuccess, setQuizSuccess] = useState<{show: boolean; title?: string}>({ show: false });
  const [error, setError] = useState<string | null>(null);
  const [realtimeNotification, setRealtimeNotification] = useState<{
    show: boolean;
    message: string;
    type: 'assessment' | 'lesson' | 'update';
  }>({ show: false, message: '', type: 'update' });
  const queryClient = useQueryClient();
  const generation = useGenerationStatus(teacher?.username || '');

  // Set up real-time updates
  const { invalidateAllQueries } = useRealTimeUpdates({
    teacherUsername: teacher?.username || '',
    onAssessmentCompleted: (data) => {
      console.log('🔔 Real-time: Assessment completed by student', data.student_id);
      setRealtimeNotification({
        show: true,
        message: `Student #${data.student_id} completed an assessment`,
        type: 'assessment'
      });
      setTimeout(() => setRealtimeNotification(prev => ({ ...prev, show: false })), 5000);
    },
    onLessonPlanGenerated: (data) => {
      console.log('🔔 Real-time: Lesson plan generated for student', data.student_id);
      setRealtimeNotification({
        show: true,
        message: `Lesson plan generated for Student #${data.student_id}`,
        type: 'lesson'
      });
      setTimeout(() => setRealtimeNotification(prev => ({ ...prev, show: false })), 5000);
    },
    onDataUpdated: () => {
      console.log('🔔 Real-time: Data updated, refreshing analytics');
      setShouldUpdateAnalytics(true);
    }
  });

  // Use React Query to fetch and cache teacher data
  const { data: exitTickets = [] } = useQuery({
    queryKey: ['teacherExitTickets', teacher?.username],
    queryFn: () => teacher?.username ? getTeacherExitTickets(teacher.username) : Promise.resolve([]),
    enabled: !!teacher?.username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Error fetching exit tickets:', error);
    }
  });

  const { data: students = [] } = useQuery({
    queryKey: ['teacherStudents', teacher?.username],
    queryFn: () => teacher?.username ? getTeacherStudents(teacher.username) : Promise.resolve([]),
    enabled: !!teacher?.username,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Error fetching students:', error);
    }
  });

  // Add debug logging
  useEffect(() => {
    console.log('TeacherDashboard state:', {
      teacher,
      exitTicketsCount: exitTickets.length,
      studentsCount: students.length,
    });
  }, [teacher, exitTickets, students]);

  // If teacher is null, show loading state
  if (!teacher) {
    console.log('Teacher is null, showing loading state');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  const handleQuizSubmit = async (settings: QuizSettingsType) => {
    if (!teacher?.username) {
      setError('Teacher information is not available. Please try logging in again.');
      return;
    }

    setIsGeneratingQuiz(true);
    setError(null);

    try {
      // First verify the teacher exists and is active
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('username, account_status, account_locked')
        .eq('username', teacher.username)
        .single();

      if (teacherError) {
        throw new Error(`Error verifying teacher account: ${teacherError.message}`);
      }

      if (!teacherData) {
        throw new Error('Teacher account not found. Please ensure your account is properly set up.');
      }

      if (teacherData.account_locked) {
        throw new Error('Your account is locked. Please contact an administrator.');
      }

      if (teacherData.account_status !== 'active') {
        throw new Error('Your account is not active. Please contact an administrator.');
      }

      await saveQuizTemplate(settings, teacher.username);
      setQuizSuccess({ show: true, title: settings.title });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['teacherExitTickets']);
      queryClient.invalidateQueries(['teacherStudents']);
      queryClient.invalidateQueries(['teacherLessonPlans']);
    } catch (error) {
      console.error('Error generating quiz:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate quiz');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <ClassroomAnalytics
            exitTickets={exitTickets}
            students={students}
            teacherUsername={teacher.username}
            shouldUpdate={shouldUpdateAnalytics}
            onUpdateComplete={() => setShouldUpdateAnalytics(false)}
          />
        );
      case 'classroom':
        return (
          <ClassroomAnalytics
            exitTickets={exitTickets}
            students={students}
            teacherUsername={teacher.username}
            shouldUpdate={shouldUpdateAnalytics}
            onUpdateComplete={() => setShouldUpdateAnalytics(false)}
          />
        );
      case 'students':
        return (
          <StudentView
            students={students}
            exitTickets={exitTickets}
            teacherUsername={teacher.username}
          />
        );
      case 'groups':
        return (
          <WeeklyGroups
            students={students}
            exitTickets={exitTickets}
            teacher={teacher.username}
          />
        );
      case 'assessments':
        return (
          <AssessmentsView
            teacherUsername={teacher.username}
          />
        );
      case 'quiz':
        return (
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="bg-svef-beige/30 shadow-lg rounded-lg p-8">
              <QuizSettings
                onSubmit={handleQuizSubmit}
                isLoading={isGeneratingQuiz}
              />
              {quizSuccess.show && (
                <div className="fixed top-4 right-4 max-w-md w-full animate-slide-in">
                  <div className="bg-svef-green text-white px-6 py-4 rounded-lg shadow-xl">
                    <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <svg className="w-6 h-6\" fill="none\" stroke="currentColor\" viewBox="0 0 24 24">
                            <path strokeLinecap="round\" strokeLinejoin="round\" strokeWidth="2\" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium">Assessment Created Successfully!</p>
                          {quizSuccess.title && (
                            <p className="text-sm opacity-90 mt-1">"{quizSuccess.title}" is now ready for students</p>
                          )}
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {isCoachView && (
        <div className="bg-svef-purple text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm">
            Viewing as coach: <strong>{coachName}</strong> — Teacher: <strong>{teacher.name}</strong>
          </span>
          <button
            onClick={onSignOut}
            className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition-colors"
          >
            Back to Coach Dashboard
          </button>
        </div>
      )}
      <Header
        step={1}
        studentData={null}
        teacher={teacher}
        onSignOut={isCoachView ? undefined : onSignOut}
      />
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 flex items-center justify-between">
        <StudentQRCode />
        <GenerationStatusBadge
          phase={generation.phase}
          onReset={generation.resetStatus}
        />
      </div>

      {generation.readyToast && (
        <div className="fixed top-4 right-4 max-w-md w-full animate-slide-in z-50">
          <div className="px-6 py-4 rounded-lg shadow-xl bg-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Groups updated</p>
                <p className="text-sm opacity-90 mt-1">New assessment processed — weekly groups have been refreshed.</p>
              </div>
              <button
                onClick={generation.dismissReadyToast}
                className="ml-4 text-white/80 hover:text-white"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Notifications */}
      {realtimeNotification.show && (
        <div className="fixed top-4 right-4 max-w-md w-full animate-slide-in z-50">
          <div className={`px-6 py-4 rounded-lg shadow-xl ${
            realtimeNotification.type === 'assessment' ? 'bg-blue-500 text-white' :
            realtimeNotification.type === 'lesson' ? 'bg-green-500 text-white' :
            'bg-svef-purple text-white'
          }`}>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Real-time Update</p>
                <p className="text-sm opacity-90 mt-1">{realtimeNotification.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400\" viewBox="0 0 20 20\" fill="currentColor">
                  <path fillRule="evenodd\" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z\" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    type="button"
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={() => setError(null)}
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <CoachFeedbackSection teacherUsername={teacher.username} />
      {renderView()}
    </div>
  );
}

export default TeacherDashboard;