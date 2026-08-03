import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle, Clipboard as ClipboardEdit, Play, Square, Users } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { SessionTimer } from './SessionTimer';
import { Button } from '../ui/Button';

interface SessionData {
  resourceUsed: 'data_lesson_plan' | 'elevate_curriculum' | '';
  lessonPlanComments: string;
  curriculumFeedback: string;
  tutoringMinutes: number;
  timerMinutes: number;
  attendanceNotes: string;
  presentStudentIds: number[];
}

interface GroupStudent {
  id: number;
  first_name: string | null;
  last_initial: string | null;
  emoji_password: string | null;
}

interface Props {
  mentorId: string;
  groupId: string;
  insideLessonPlan?: boolean;
}

export function FloatingRecordButton({ mentorId, groupId, insideLessonPlan = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sessionData, setSessionData] = useState<SessionData>({
    resourceUsed: '',
    lessonPlanComments: '',
    curriculumFeedback: '',
    tutoringMinutes: 0,
    timerMinutes: 0,
    attendanceNotes: '',
    presentStudentIds: [],
  });

  const queryClient = useQueryClient();

  const { data: groupStudents = [] } = useQuery<GroupStudent[]>({
    queryKey: ['mentorGroupStudents', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data: links } = await supabase
        .from('mentor_group_students')
        .select('student_id')
        .eq('group_id', groupId);
      const ids = (links || []).map((r: any) => r.student_id);
      if (ids.length === 0) return [];
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_initial, emoji_password')
        .in('id', ids);
      return (students || []) as GroupStudent[];
    },
  });

  useEffect(() => {
    if (isOpen && groupStudents.length > 0 && sessionData.presentStudentIds.length === 0) {
      setSessionData(prev => ({ ...prev, presentStudentIds: groupStudents.map(s => s.id) }));
    }
  }, [isOpen, groupStudents]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const submitSessionMutation = useMutation({
    mutationFn: async (data: SessionData) => {
      const { data: inserted, error } = await supabase
        .from('mentor_sessions')
        .insert({
          mentor_id: mentorId,
          group_id: groupId,
          session_date: new Date().toISOString().split('T')[0],
          resource_used: data.resourceUsed || null,
          used_lesson_plan: data.resourceUsed === 'data_lesson_plan',
          lesson_plan_comments: data.lessonPlanComments || null,
          curriculum_feedback: data.curriculumFeedback || null,
          tutoring_minutes: data.tutoringMinutes,
          timer_minutes: data.timerMinutes || 0,
          attendance_notes: data.attendanceNotes || null,
        })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      const sessionId = inserted?.id;
      if (sessionId && groupStudents.length > 0) {
        const rows = groupStudents.map(s => ({
          session_id: sessionId,
          student_id: s.id,
          present: data.presentStudentIds.includes(s.id),
        }));
        const { error: attendanceError } = await supabase
          .from('mentor_session_attendance')
          .insert(rows);
        if (attendanceError) throw attendanceError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['mentorSessions', groupId, mentorId],
      });
      setSubmitError(null);
      setSubmitSuccess(true);
      setSessionData({
        resourceUsed: '',
        lessonPlanComments: '',
        curriculumFeedback: '',
        tutoringMinutes: 0,
        timerMinutes: 0,
        attendanceNotes: '',
        presentStudentIds: [],
      });
      setTimerElapsed(0);
      setTimeout(() => {
        setSubmitSuccess(false);
        setIsOpen(false);
      }, 2000);
    },
    onError: (err: any) => {
      console.error('Session submit error:', err);
      setSubmitError(err?.message || 'Failed to record session. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    submitSessionMutation.mutate(sessionData);
  };

  const handleFloatingClick = () => {
    setSubmitError(null);
    if (!insideLessonPlan) {
      setIsOpen(true);
      return;
    }

    if (!isTimerRunning && timerElapsed === 0) {
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
      const minutes = Math.max(1, Math.floor(timerElapsed / 60));
      setSessionData((prev) => ({
        ...prev,
        resourceUsed: 'lesson_plan',
        tutoringMinutes: minutes,
        timerMinutes: minutes,
      }));
      setIsOpen(true);
    }
  };

  const timerMinutes = Math.floor(timerElapsed / 60);
  const timerSeconds = timerElapsed % 60;

  return (
    <>
      {insideLessonPlan && isTimerRunning ? (
        <button
          onClick={handleFloatingClick}
          className="fixed bottom-6 right-6 z-40 bg-red-500 text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:bg-red-600 transition-all hover:shadow-xl flex items-center gap-3 animate-pulse-subtle"
          title="Stop timer and record session"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
          </span>
          <span className="font-mono font-bold text-sm tabular-nums">
            {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
          </span>
          <Square className="w-4 h-4" />
        </button>
      ) : insideLessonPlan && !isTimerRunning && timerElapsed === 0 ? (
        <button
          onClick={handleFloatingClick}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 hover:shadow-xl flex items-center gap-2"
          title="Start recording session"
        >
          <Play className="w-5 h-5" />
          <span className="font-medium text-sm">Start Session</span>
        </button>
      ) : (
        <button
          onClick={handleFloatingClick}
          className="fixed bottom-6 right-6 z-40 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-105 hover:shadow-xl flex items-center gap-2"
          title="Record Session"
        >
          <ClipboardEdit className="w-5 h-5" />
          <span className="font-medium text-sm">Time Session</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-oswald font-bold text-gray-900">
                  Time Session
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitSuccess ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Session Timed!
                  </h3>
                  <p className="text-gray-600">
                    Your session data has been successfully submitted.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Did you use the provided lesson plan or the curriculum?{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="floatingResourceUsed"
                          value="data_lesson_plan"
                          checked={sessionData.resourceUsed === 'data_lesson_plan'}
                          onChange={(e) =>
                            setSessionData({
                              ...sessionData,
                              resourceUsed: e.target.value as SessionData['resourceUsed'],
                            })
                          }
                          className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500"
                          required
                        />
                        <div>
                          <span className="font-medium text-gray-900">D[ai]TA Lesson Plan</span>
                          <p className="text-sm text-gray-600">
                            I utilized the teacher's provided lesson plan during this session.
                          </p>
                        </div>
                      </label>
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="floatingResourceUsed"
                          value="elevate_curriculum"
                          checked={sessionData.resourceUsed === 'elevate_curriculum'}
                          onChange={(e) =>
                            setSessionData({
                              ...sessionData,
                              resourceUsed: e.target.value as SessionData['resourceUsed'],
                            })
                          }
                          className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500"
                          required
                        />
                        <div>
                          <span className="font-medium text-gray-900">Elevate Curriculum</span>
                          <p className="text-sm text-gray-600">
                            I followed the standard curriculum during this session.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lesson Plan Comments (Optional)
                    </label>
                    <textarea
                      value={sessionData.lessonPlanComments}
                      onChange={(e) =>
                        setSessionData({
                          ...sessionData,
                          lessonPlanComments: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="How did the lesson plan work? Any suggestions?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Curriculum Enhancement Suggestions (Optional)
                    </label>
                    <textarea
                      value={sessionData.curriculumFeedback}
                      onChange={(e) =>
                        setSessionData({
                          ...sessionData,
                          curriculumFeedback: e.target.value,
                        })
                      }
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Can we add a lesson plan OR identify specific curriculum areas where students struggle?"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Provide specific topics, concepts, or areas where students need additional support.
                    </p>
                  </div>

                  <SessionTimer
                    initialMinutes={sessionData.timerMinutes}
                    onTimeUpdate={(mins) =>
                      setSessionData((prev) => ({
                        ...prev,
                        timerMinutes: mins,
                        tutoringMinutes: mins > 0 ? mins : prev.tutoringMinutes,
                      }))
                    }
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tutoring Duration (minutes){' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={sessionData.tutoringMinutes || ''}
                      onChange={(e) =>
                        setSessionData({
                          ...sessionData,
                          tutoringMinutes: parseInt(e.target.value) || 0,
                        })
                      }
                      min="0"
                      max="480"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter duration in minutes"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      High-Impact Tutoring (HIT) minutes provided during this session.
                    </p>
                  </div>

                  {groupStudents.length > 0 && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Users className="w-4 h-4 text-blue-500" />
                        Who attended today?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                        {groupStudents.map(s => {
                          const checked = sessionData.presentStudentIds.includes(s.id);
                          const label = [
                            [s.first_name, s.last_initial ? `${s.last_initial.toUpperCase()}.` : null]
                              .filter(Boolean).join(' '),
                            s.emoji_password,
                          ].filter(Boolean).join(' ');
                          return (
                            <label key={s.id} className="flex items-center gap-2 cursor-pointer bg-white rounded px-3 py-2 border border-gray-100 hover:border-blue-300 transition-colors">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSessionData(prev => ({
                                    ...prev,
                                    presentStudentIds: e.target.checked
                                      ? [...prev.presentStudentIds, s.id]
                                      : prev.presentStudentIds.filter(id => id !== s.id),
                                  }));
                                }}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-800">{label || `Student #${s.id}`}</span>
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Check each student who was present. Unchecked students will be recorded as absent for this session.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attendance Notes (Optional)
                    </label>
                    <textarea
                      value={sessionData.attendanceNotes}
                      onChange={(e) =>
                        setSessionData({
                          ...sessionData,
                          attendanceNotes: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Which students attended? Any additional notes?"
                    />
                  </div>

                  {submitError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
                      {submitError}
                    </div>
                  )}

                  <div className="flex space-x-4 pt-4">
                    <Button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      variant="secondary"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={submitSessionMutation.isPending}
                    >
                      {submitSessionMutation.isPending ? 'Submitting...' : 'Submit Session'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
