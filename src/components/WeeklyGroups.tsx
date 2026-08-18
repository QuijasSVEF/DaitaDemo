import React, { useState, useEffect, useCallback } from 'react';
import { Users, Loader2, AlertCircle, Calendar, ChevronDown, History } from 'lucide-react';
import { Student, ExitTicketResult } from '../types';
import { supabase } from '../services/supabase/config'; 
import { Button } from './ui/Button';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentWeekGroups, saveWeeklyGroups, getAvailableWeeks, getGroupsByWeek, moveStudentBetweenGroups, WeeklyGroup } from '../services/supabase/weeklyGroups';
import { groupStudentsByStruggleAreas } from '../services/groups/service';
import { saveGroupLessonPlan, getGroupLessonPlan, regenerateGroupLessonPlan } from '../services/supabase/groupLessonPlans';
import { generateGroupLessonPlan } from '../services/groupLessonPlanService';
import { LessonPlanView } from './lesson-plan/LessonPlanView';
import { RegenerateButton } from './analytics/RegenerateButton';
import { LessonPlan } from '../types';
import { formatDate } from '../utils/dateUtils';
import { GroupCard } from './groups/GroupCard';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { useGenerationStatus } from '../hooks/useGenerationStatus';
import { GenerationStatusBadge } from './GenerationStatusBadge';

function getWeekDates() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}

interface Props {
  students: Student[];
  exitTickets: ExitTicketResult[];
  teacher: string;
}

export function WeeklyGroups({ students, exitTickets, teacher }: Props) {
  const [groups, setGroups] = useState<WeeklyGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupPlan, setSelectedGroupPlan] = useState<{
    plan: LessonPlan;
    groupId: string;
    lessonPlanId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generatingGroupId, setGeneratingGroupId] = useState<string | null>(null);
  const [availableWeeks, setAvailableWeeks] = useState<Date[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null);
  const [showWeekDropdown, setShowWeekDropdown] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const loadingRef = React.useRef(false);

  const queryClient = useQueryClient();
  const { weekStart, weekEnd } = getWeekDates();
  const { phase, canRegenerate, resetStatus } = useGenerationStatus(teacher);

  // Set up real-time updates for weekly groups
  useRealTimeUpdates({
    teacherUsername: teacher,
    onAssessmentCompleted: () => {
      if (!generatingGroupId) {
        loadGroups();
      }
    },
    onLessonPlanGenerated: () => {
      if (!generatingGroupId) {
        loadGroups();
      }
    }
  });

  useEffect(() => {
    if (teacher && teacher.trim()) {
      loadGroups();
      loadAvailableWeeks();
    }
  }, [teacher]);

  const loadAvailableWeeks = async () => {
    const weeks = await getAvailableWeeks(teacher);
    setAvailableWeeks(weeks);
  };

  const handleSelectWeek = async (week: Date) => {
    setShowWeekDropdown(false);
    const currentWeekStart = new Date(weekStart);
    currentWeekStart.setHours(0, 0, 0, 0);

    const selectedStart = new Date(week);
    selectedStart.setHours(0, 0, 0, 0);

    if (selectedStart.getTime() === currentWeekStart.getTime()) {
      setSelectedWeek(null);
      setIsViewingHistory(false);
      loadGroups();
      return;
    }

    setSelectedWeek(week);
    setIsViewingHistory(true);
    setIsLoading(true);
    const historicalGroups = await getGroupsByWeek(teacher, week);
    setGroups(historicalGroups);
    setIsLoading(false);
  };

  const handleBackToCurrent = () => {
    setSelectedWeek(null);
    setIsViewingHistory(false);
    loadGroups();
  };
  
  // Reload groups when students or exit tickets change (debounced to avoid race conditions)
  const prevCountRef = React.useRef({ students: 0, tickets: 0 });
  useEffect(() => {
    if (!teacher || !teacher.trim()) return;
    const prev = prevCountRef.current;
    if (prev.students === students.length && prev.tickets === exitTickets.length) return;
    prevCountRef.current = { students: students.length, tickets: exitTickets.length };
    if (prev.students === 0 && prev.tickets === 0) return;
    if (!generatingGroupId) {
      loadGroups();
    }
  }, [students.length, exitTickets.length]);

  const loadGroups = async () => {
    if (loadingRef.current) return;
    try {
      if (!teacher) {
        setError('No teacher username specified');
        setIsLoading(false);
        return;
      }

      loadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const existingGroups = await getCurrentWeekGroups(teacher);

      if (existingGroups && existingGroups.length === 0) {
        const newGroups = await generateNewGroups();
        if (!newGroups || newGroups.length === 0) {
          // No error - this just means no assessment data exists yet
          setGroups([]);
        }
      } else {
        // Check each group for an existing lesson plan
        const groupsWithPlans = await Promise.all(existingGroups.map(async (group) => {
          const { data: existingPlan } = await supabase
            .from('group_lesson_plans')
            .select('id')
            .eq('group_id', group.id)
            .maybeSingle();

          return {
            ...group,
            lessonPlanId: existingPlan?.id || null
          };
        }));
        setGroups(groupsWithPlans);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      setError('Failed to load groups. Please try again.');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const generateNewGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Generating new groups for teacher:', teacher);
      
      // First verify the teacher exists and is active
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('username, account_status, account_locked')
        .eq('username', teacher)
        .single();

      if (teacherError) {
        console.error('Error verifying teacher:', teacherError);
        throw new Error('Teacher not found or not properly configured');
      }

      if (!teacherData) {
        throw new Error('Teacher not found');
      }

      if (teacherData.account_locked) {
        throw new Error('Teacher account is locked');
      }

      if (teacherData.account_status !== 'active') {
        throw new Error('Teacher account is not active');
      }

      // Fetch fresh exit ticket data directly to avoid stale props
      const [exitTicketResponse, quizAttemptResponse] = await Promise.all([
        supabase
          .from('exit_tickets')
          .select('*')
          .eq('teacher_username', teacher)
          .gte('created_at', weekStart.toISOString())
          .lte('created_at', weekEnd.toISOString()),
        supabase
          .from('quiz_attempts')
          .select('id, student_id, score, total_questions, answers, completed_at, quiz_templates(topic, questions, processed_questions)')
          .eq('teacher_username', teacher)
          .gte('completed_at', weekStart.toISOString())
          .lte('completed_at', weekEnd.toISOString())
      ]);

      const freshTickets: ExitTicketResult[] = [
        ...(exitTicketResponse.data || []).map((ticket: any) => ({
          id: ticket.id,
          studentId: ticket.student_id,
          score: ticket.score,
          totalQuestions: ticket.total_questions,
          struggledAreas: ticket.struggled_areas,
          lastLesson: ticket.last_lesson,
          timestamp: new Date(ticket.created_at)
        })),
        ...(quizAttemptResponse.data || []).map((attempt: any) => {
          const answers = Array.isArray(attempt.answers) ? attempt.answers : [];
          const topic = (attempt.quiz_templates as any)?.topic || 'Assessment';
          const templateQuestions = (attempt.quiz_templates as any)?.processed_questions || (attempt.quiz_templates as any)?.questions || [];
          const subtopicStats = new Map<string, { total: number; missed: number }>();
          for (const a of answers as any[]) {
            let sub = (a.questionSubtopic as string) || '';
            if (!sub && a.questionId && templateQuestions.length > 0) {
              const matchedQ = templateQuestions.find((q: any) => q.id === a.questionId);
              sub = matchedQ?.subtopic || '';
            }
            if (!sub) continue;
            const entry = subtopicStats.get(sub) || { total: 0, missed: 0 };
            entry.total++;
            if (!a.correct) entry.missed++;
            subtopicStats.set(sub, entry);
          }
          const struggleAreas: string[] = [];
          for (const [sub, stats] of subtopicStats) {
            if (stats.missed > 0) struggleAreas.push(sub);
          }
          return {
            id: attempt.id,
            studentId: attempt.student_id,
            score: attempt.score || 0,
            totalQuestions: attempt.total_questions || answers.length,
            struggledAreas: struggleAreas,
            lastLesson: topic,
            timestamp: new Date(attempt.completed_at)
          };
        })
      ];

      if (freshTickets.length === 0) {
        return [];
      }

      // Fetch fresh students who have assessments this week (don't rely on stale prop)
      const studentIdsFromTickets = [...new Set(freshTickets.map(t => t.studentId))];
      const { data: studentRows } = await supabase
        .from('students')
        .select('id, grade_level, subject, first_name, last_initial, emoji_password')
        .eq('teacher_username', teacher)
        .in('id', studentIdsFromTickets);

      const freshStudents: Student[] = (studentRows || []).map((s: any) => ({
        id: s.id,
        firstName: s.first_name || '',
        lastInitial: s.last_initial || '',
        emoji: s.emoji_password || '',
        gradeLevel: s.grade_level || '6',
        subject: s.subject || 'Mathematics',
        teacherUsername: teacher
      }));

      // If no student records exist yet, create minimal Student objects from ticket data
      if (freshStudents.length === 0) {
        studentIdsFromTickets.forEach(id => {
          freshStudents.push({
            id,
            firstName: '',
            lastInitial: '',
            emoji: '',
            gradeLevel: '6',
            subject: 'Mathematics',
            teacherUsername: teacher
          });
        });
      }

      const generatedGroups = await groupStudentsByStruggleAreas(freshStudents, freshTickets);

      if (!generatedGroups || generatedGroups.length === 0) {
        console.log('No groups generated - all students may have scored 100% or no struggle data found');
        setGroups([]);
        return [];
      }

      const savedGroups = await saveWeeklyGroups(generatedGroups, teacher);
      if (savedGroups && savedGroups.length > 0) {
        console.log(`Generated ${savedGroups.length} new groups`);
        setGroups(savedGroups);

        // Invalidate related queries
        queryClient.invalidateQueries(['weeklyGroups']);
      } else {
        setGroups([]);
      }
      return savedGroups || [];
    } catch (error) {
      console.error('Error generating groups:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate groups.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLessonPlan = async (group: WeeklyGroup) => {
    try {
      setGeneratingGroupId(group.id);
      setError(null);

      // If there's already a lesson plan, just show it
      if (group.lessonPlanId) {
        const existingPlan = await getGroupLessonPlan(group.id);
        if (existingPlan) {
          setSelectedGroupPlan({
            plan: existingPlan.lessonPlan,
            groupId: group.id,
            lessonPlanId: existingPlan.id
          });
          setGeneratingGroupId(null);
          return;
        }
      }

      // Validate student IDs before proceeding
      const validStudentIds = group.students.filter(id =>
        typeof id === 'number' && !isNaN(id) && Number.isInteger(id)
      );

      if (validStudentIds.length === 0) {
        throw new Error('No valid student IDs found in this group. Please ensure the group contains valid students.');
      }

      // Generate new lesson plan
      const lessonPlan = await generateGroupLessonPlan(
        validStudentIds,
        group.focusAreas,
        teacher
      );

      if (!lessonPlan) {
        throw new Error('Failed to generate lesson plan. Please try again.');
      }

      const defaultDetailedActivities = {
        engagement: [],
        representation: [],
        actionExpression: [],
        wrapup: []
      };

      // Save the generated plan
      const savedPlan = await saveGroupLessonPlan(
        group.id,
        {
          ...lessonPlan,
          detailedActivities: lessonPlan.detailedActivities || defaultDetailedActivities
        },
        validStudentIds,
        group.focusAreas,
        teacher
      );

      // Update the weekly_groups row with the lesson_plan_id
      await supabase
        .from('weekly_groups')
        .update({ lesson_plan_id: savedPlan.id })
        .eq('id', group.id);

      // Update local state directly instead of full reload
      setGroups(prev => prev.map(g =>
        g.id === group.id ? { ...g, lessonPlanId: savedPlan.id } : g
      ));

      setSelectedGroupPlan({
        plan: {
          objective: savedPlan.lessonPlan.objective || '',
          engagement: savedPlan.lessonPlan.engagement || [],
          representation: savedPlan.lessonPlan.representation || [],
          actionExpression: savedPlan.lessonPlan.actionExpression || [],
          wrapup: savedPlan.lessonPlan.wrapup || [],
          duration: savedPlan.lessonPlan.duration || 25,
          alignedStandards: savedPlan.lessonPlan.alignedStandards || [],
          dokLevels: savedPlan.lessonPlan.dokLevels || {
            engagement: 1,
            representation: 2,
            action_expression: 3,
            wrapup: 2
          },
          detailedActivities: savedPlan.lessonPlan.detailedActivities || defaultDetailedActivities
        },
        groupId: group.id,
        lessonPlanId: savedPlan.id
      });

      queryClient.invalidateQueries(['groupLessonPlans']);
    } catch (error) {
      console.error('Error with lesson plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to handle lesson plan. Please try again.');
    } finally {
      setGeneratingGroupId(null);
    }
  };

  const handleRegeneratePlan = async () => {
    if (!selectedGroupPlan?.lessonPlanId || !selectedGroupPlan?.groupId) return;

    try {
      setIsRegenerating(true);
      setError(null);

      const group = groups.find(g => g.id === selectedGroupPlan.groupId);
      if (!group) {
        throw new Error('Group not found');
      }

      const validStudentIds = group.students.filter(id =>
        typeof id === 'number' && !isNaN(id) && Number.isInteger(id)
      );

      if (validStudentIds.length === 0) {
        throw new Error('No valid students in this group');
      }

      const newLessonPlan = await generateGroupLessonPlan(
        validStudentIds,
        group.focusAreas,
        teacher
      );

      if (!newLessonPlan) {
        throw new Error('Failed to generate new lesson plan');
      }

      const regeneratedPlan = await regenerateGroupLessonPlan(
        selectedGroupPlan.lessonPlanId,
        newLessonPlan
      );

      if (!regeneratedPlan) {
        throw new Error('Failed to save regenerated lesson plan');
      }

      setSelectedGroupPlan({
        plan: regeneratedPlan.lessonPlan,
        groupId: regeneratedPlan.groupId,
        lessonPlanId: regeneratedPlan.id
      });

      queryClient.invalidateQueries(['groupLessonPlans']);

    } catch (error) {
      console.error('Error regenerating lesson plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to regenerate lesson plan');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleMoveStudent = async (studentId: number, fromGroupId: string, toGroupId: string) => {
    try {
      await moveStudentBetweenGroups(studentId, fromGroupId, toGroupId);
      await loadGroups();
    } catch (error) {
      console.error('Error moving student:', error);
      setError('Failed to move student. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-svef-purple animate-spin" />
      </div>
    );
  }

  if (selectedGroupPlan && selectedGroupPlan.plan) {
    // Create a safe version of the lesson plan with default values for any missing properties
    const safeLessonPlan: LessonPlan = {
      objective: selectedGroupPlan.plan.objective || '',
      engagement: selectedGroupPlan.plan.engagement || [],
      representation: selectedGroupPlan.plan.representation || [],
      actionExpression: selectedGroupPlan.plan.actionExpression || [],
      wrapup: selectedGroupPlan.plan.wrapup || [],
      duration: selectedGroupPlan.plan.duration || 25,
      alignedStandards: selectedGroupPlan.plan.alignedStandards || [],
      dokLevels: selectedGroupPlan.plan.dokLevels || {
        engagement: 1,
        representation: 2,
        action_expression: 3,
        wrapup: 2
      },
      detailedActivities: selectedGroupPlan.plan.detailedActivities || {
        engagement: [],
        representation: [],
        actionExpression: [],
        wrapup: []
      }
    };

    return (
      <LessonPlanView
        lessonPlan={safeLessonPlan}
        struggledAreas={(() => {
          const group = groups.find(g => g.id === selectedGroupPlan?.groupId);
          if (group?.focusAreas && group.focusAreas.length > 0) {
            return group.focusAreas;
          }
          if (!group) return [];
          const groupStudentIds = new Set(group.students);
          const aggregated = exitTickets
            .filter(t => groupStudentIds.has(t.studentId))
            .flatMap(t => t.struggledAreas || []);
          return Array.from(new Set(aggregated));
        })()}
        lessonPlanId={selectedGroupPlan.lessonPlanId}
        onBack={() => setSelectedGroupPlan(null)}
        onRegenerate={handleRegeneratePlan}
        isRegeneratingExternal={isRegenerating}
      />
    );
  }

  const displayWeekStart = selectedWeek || weekStart;
  const displayWeekEnd = selectedWeek
    ? (() => { const d = new Date(selectedWeek); d.setDate(d.getDate() + 6); d.setHours(23, 59, 59, 999); return d; })()
    : weekEnd;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-svef-purple" />
            <h2 className="font-oswald text-2xl font-medium text-svef-gray">Weekly Groups</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-svef-gray">
            <Calendar className="w-4 h-4" />
            <span>Week of {formatDate(displayWeekStart)} - {formatDate(displayWeekEnd)}</span>
            <div className="relative">
              <button
                onClick={() => setShowWeekDropdown(v => !v)}
                className="inline-flex items-center gap-1 ml-1 px-2 py-1 rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors text-xs font-medium"
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showWeekDropdown && (
                <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={handleBackToCurrent}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${!isViewingHistory ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${!isViewingHistory ? 'bg-blue-600' : 'bg-transparent'}`} />
                    Current Week
                  </button>
                  {availableWeeks.length > 0 && (
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <p className="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Previous Weeks</p>
                      {availableWeeks
                        .filter(w => {
                          const wStart = new Date(w); wStart.setHours(0,0,0,0);
                          const cStart = new Date(weekStart); cStart.setHours(0,0,0,0);
                          return wStart.getTime() !== cStart.getTime();
                        })
                        .map((w, i) => {
                          const wEnd = new Date(w); wEnd.setDate(wEnd.getDate() + 6);
                          const isSelected = selectedWeek && new Date(selectedWeek).getTime() === new Date(w).getTime();
                          return (
                            <button
                              key={i}
                              onClick={() => handleSelectWeek(w)}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                            >
                              <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-transparent'}`} />
                              {formatDate(w)} - {formatDate(wEnd)}
                            </button>
                          );
                        })}
                    </div>
                  )}
                  {availableWeeks.filter(w => {
                    const wStart = new Date(w); wStart.setHours(0,0,0,0);
                    const cStart = new Date(weekStart); cStart.setHours(0,0,0,0);
                    return wStart.getTime() !== cStart.getTime();
                  }).length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-400 italic">No previous weeks available</p>
                  )}
                </div>
              )}
            </div>
            {isViewingHistory && (
              <button
                onClick={handleBackToCurrent}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                Back to current week
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isViewingHistory && (
            <GenerationStatusBadge
              phase={phase}
              onReset={resetStatus}
            />
          )}
          <Button
            onClick={generateNewGroups}
            disabled={isLoading || !canRegenerate || isViewingHistory}
            title={isViewingHistory ? 'Switch back to current week to regenerate' : (!canRegenerate ? 'Waiting for lesson plans and group finalization to complete' : undefined)}
          >
            Regenerate Groups
          </Button>
        </div>
      </div>

      {isViewingHistory && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-sm text-blue-800">
          <History className="w-4 h-4 flex-shrink-0" />
          <span>Viewing groups from a previous week. These are read-only.</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Users className="w-12 h-12 text-svef-purple/30 mx-auto mb-4" />
          <h3 className="font-medium text-svef-gray mb-2">No Groups Available</h3>
          <p className="text-svef-gray text-sm">
            There are no student assessments for this week. Groups will be generated automatically when new assessments are added.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group, index) => (
            <GroupCard
              key={`weekly-group-${group.id}`}
              group={group}
              students={students}
              allGroups={groups}
              onGeneratePlan={handleGenerateLessonPlan}
              onMoveStudent={!isViewingHistory ? handleMoveStudent : undefined}
              groupIndex={index}
              teacherUsername={teacher}
              isGenerating={generatingGroupId === group.id}
              isReadOnly={isViewingHistory}
            />
          ))}
        </div>
      )}
    </div>
  );
}