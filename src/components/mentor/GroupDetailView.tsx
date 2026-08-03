import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, BookOpen, Calendar, Clock, FileText, ChevronRight, ChevronDown, TrendingDown, TrendingUp, Target, X, Check } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { CollegeMentor } from './MentorLogin';
import { LessonPlanView } from '../lesson-plan/LessonPlanView';
import { SessionList } from './SessionDetail';
import { FloatingRecordButton } from './FloatingRecordButton';
import { SessionLogsList } from '../shared/SessionLogsList';

interface Props {
  mentor: CollegeMentor;
  group: {
    id: string;
    name: string;
    description: string | null;
    grade_level: string | null;
    subject: string;
    teacher_username: string;
    teacher_name: string;
    teacher_email: string;
  };
  onBack: () => void;
}

interface Student {
  id: number;
  name: string;
  grade: string;
  emoji_code: string;
}

interface StudentWithAnalytics extends Student {
  recentAssessments?: any[];
  struggleAreas?: string[];
  strengths?: string[];
  weeklyProgress?: number;
}

export function GroupDetailView({ mentor, group, onBack }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<StudentWithAnalytics | null>(null);
  const [selectedLessonPlan, setSelectedLessonPlan] = useState<any>(null);
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedStudent, selectedLessonPlan]);

  const { data: students = [] } = useQuery({
    queryKey: ['groupStudents', group.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_group_students')
        .select('student_id')
        .eq('group_id', group.id);

      if (error) {
        console.error('Error fetching students:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      const studentsWithData = await Promise.all(
        data.map(async (item: any) => {
          const studentId = item.student_id;
          if (!studentId) return null;

          const { data: studentInfo } = await supabase
            .from('students')
            .select('id, grade_level, emoji_password, first_name, last_initial')
            .eq('id', studentId)
            .maybeSingle();

          const { data: quizAssessments } = await supabase
            .from('quiz_attempts')
            .select(`
              *,
              quiz_templates (
                title,
                topic,
                grade_level,
                questions,
                processed_questions
              )
            `)
            .eq('student_id', studentId)
            .eq('teacher_username', group.teacher_username)
            .order('completed_at', { ascending: false })
            .limit(5);

          const assessments = (quizAssessments || []).map((a: any) => ({
            ...a,
            created_at: a.completed_at,
            last_lesson: a.quiz_templates?.topic || a.quiz_templates?.title || 'Assessment'
          }));

          const { data: analytics } = await supabase
            .from('classroom_analytics')
            .select('*')
            .eq('teacher_username', group.teacher_username)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const classroomStruggles = Array.isArray(analytics?.struggle_areas)
            ? analytics.struggle_areas
            : [];

          const quizStruggles: string[] = [];
          assessments.forEach((a: any) => {
            (a.answers || []).forEach((ans: any) => {
              if (!ans.correct && ans.questionSubtopic) {
                if (!quizStruggles.includes(ans.questionSubtopic)) {
                  quizStruggles.push(ans.questionSubtopic);
                }
              }
            });
          });

          const struggleAreas = quizStruggles.length > 0 ? quizStruggles : classroomStruggles;

          const strengths: string[] = [];
          assessments.forEach((a: any) => {
            (a.answers || []).forEach((ans: any) => {
              if (ans.correct && ans.questionSubtopic) {
                if (!strengths.includes(ans.questionSubtopic) && !quizStruggles.includes(ans.questionSubtopic)) {
                  strengths.push(ans.questionSubtopic);
                }
              }
            });
          });

          const lastScore = assessments.length > 0 ? assessments[assessments.length - 1]?.score : 0;
          const firstScore = assessments.length > 0 ? assessments[0]?.score : 0;

          const displayName = studentInfo?.first_name
            ? `${studentInfo.first_name} ${studentInfo.last_initial ? String(studentInfo.last_initial).toUpperCase() + '.' : ''}`.trim()
            : `Student #${studentId}`;
          return {
            id: studentId,
            name: displayName,
            grade: studentInfo?.grade_level || 'N/A',
            emoji_code: studentInfo?.emoji_password || '',
            recentAssessments: assessments,
            struggleAreas,
            strengths,
            weeklyProgress: assessments && assessments.length > 1 && lastScore > 0
              ? ((firstScore - lastScore) / lastScore) * 100
              : 0
          };
        })
      );

      return studentsWithData.filter(Boolean) as StudentWithAnalytics[];
    }
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['mentorSessions', group.id, mentor.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_sessions')
        .select('*')
        .eq('group_id', group.id)
        .eq('mentor_id', mentor.id)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: lessonPlans = [] } = useQuery({
    queryKey: ['groupLessonPlans', group.id, group.teacher_username, students.map(s => s.id).join(',')],
    queryFn: async () => {
      const studentIds = students.map(s => s.id);
      if (studentIds.length === 0) return [];

      // Find group lesson plans that contain ANY of this group's students
      const { data: allPlans, error } = await supabase
        .from('group_lesson_plans')
        .select('id, lesson_plan, created_at, group_id, student_ids, focus_areas')
        .eq('teacher_username', group.teacher_username)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !allPlans) return [];

      // Filter to plans whose student_ids overlap with this mentor group's students
      const matchingPlans = allPlans.filter(plan => {
        const planStudents = Array.isArray(plan.student_ids) ? plan.student_ids : [];
        return planStudents.some((id: number) => studentIds.includes(id));
      });

      return matchingPlans.map(plan => ({
        id: plan.id,
        objective: plan.lesson_plan?.objective || 'Group Lesson Plan',
        title: plan.lesson_plan?.objective || 'Group Lesson Plan',
        focusAreas: plan.focus_areas || [],
        created_at: plan.created_at
      }));
    },
    enabled: students.length >= 0
  });

  const { data: mentorGoals = [] } = useQuery({
    queryKey: ['mentorGoals', mentor.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coaching_goals')
        .select('*')
        .eq('target_type', 'mentor')
        .eq('target_id', mentor.id)
        .eq('visible_to_mentor', true)
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false });

      if (error) return [];
      return data || [];
    }
  });

  const { data: studentSessionLogs = [], isLoading: isLoadingStudentLogs } = useQuery({
    queryKey: ['studentSessionLogs', selectedStudent?.id, group.teacher_username],
    queryFn: async () => {
      if (!selectedStudent) return [];
      const { data, error } = await supabase
        .from('student_session_logs')
        .select('*')
        .eq('student_id', selectedStudent.id)
        .eq('teacher_username', group.teacher_username)
        .order('session_date', { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!selectedStudent
  });

  const handleViewLessonPlan = async (planId: string) => {
    try {
      const { data: groupPlan, error: groupError } = await supabase
        .from('group_lesson_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

      const aggregatedGroupStruggles = Array.from(
        new Set(students.flatMap(s => s.struggleAreas || []))
      );

      if (!groupError && groupPlan) {
        const focusAreas = Array.isArray(groupPlan.focus_areas) ? groupPlan.focus_areas : [];
        setSelectedLessonPlan({
          id: groupPlan.id,
          plan: groupPlan.lesson_plan,
          struggledAreas: focusAreas.length > 0 ? focusAreas : aggregatedGroupStruggles
        });
      }
    } catch (error) {
      console.error('Error fetching lesson plan:', error);
    }
  };

  const handleSelectStudent = (student: StudentWithAnalytics) => {
    setSelectedStudent(student);
  };

  if (selectedLessonPlan) {
    return (
      <>
        <LessonPlanView
          lessonPlan={selectedLessonPlan.plan}
          struggledAreas={selectedLessonPlan.struggledAreas}
          lessonPlanId={selectedLessonPlan.id}
          onBack={() => setSelectedLessonPlan(null)}
        />
        <FloatingRecordButton mentorId={mentor.id} groupId={group.id} insideLessonPlan />
      </>
    );
  }

  if (selectedStudent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => setSelectedStudent(null)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Group</span>
            </button>
            <div className="flex items-center space-x-4">
              {selectedStudent.emoji_code && (
                <div className="text-4xl">{selectedStudent.emoji_code}</div>
              )}
              <div>
                <h1 className="text-2xl font-oswald font-bold text-gray-900">{selectedStudent.name}</h1>
                <p className="text-sm text-gray-600">Grade {selectedStudent.grade}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-900">Areas Needing Support</h2>
              </div>
              {Array.isArray(selectedStudent.struggleAreas) && selectedStudent.struggleAreas.length > 0 ? (
                <div className="space-y-3">
                  {selectedStudent.struggleAreas.map((area: any, idx: number) => {
                    if (typeof area === 'string') {
                      return (
                        <div key={idx} className="p-3 bg-red-50 rounded-lg text-sm text-red-800">
                          {area}
                        </div>
                      );
                    }
                    const areaName = area?.area || 'Unknown Area';
                    const recommendations = Array.isArray(area?.recommendations) ? area.recommendations : [];
                    const relatedConcepts = Array.isArray(area?.related_concepts) ? area.related_concepts : [];
                    return (
                      <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <p className="font-semibold text-red-900 text-sm">{areaName}</p>
                        {relatedConcepts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {relatedConcepts.map((concept: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                {concept}
                              </span>
                            ))}
                          </div>
                        )}
                        {recommendations.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                                <span className="mt-1 w-1 h-1 rounded-full bg-red-400 shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No struggle areas identified yet.</p>
              )}
            </section>

            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Strengths</h2>
              </div>
              {Array.isArray(selectedStudent.strengths) && selectedStudent.strengths.length > 0 ? (
                <div className="space-y-2">
                  {selectedStudent.strengths.map((strength, idx) => (
                    <div key={idx} className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                      {strength}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No strengths identified yet.</p>
              )}
            </section>

            <section className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Recent Assessments</h2>
              </div>
              {Array.isArray(selectedStudent.recentAssessments) && selectedStudent.recentAssessments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Topic</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedStudent.recentAssessments.map((assessment, idx) => {
                        const assessmentId = assessment.id || `${idx}`;
                        const isExpanded = expandedAssessmentId === assessmentId;
                        const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
                        const wrongAnswers = answers.filter((a: any) => !a.correct);
                        const templateQuestions =
                          assessment.quiz_templates?.processed_questions ||
                          assessment.quiz_templates?.questions ||
                          [];
                        const getQuestionDetails = (ans: any) => {
                          const match = templateQuestions.find(
                            (q: any) => q.id === ans.questionId
                          );
                          return {
                            questionText: ans.questionText || match?.questionText || 'Question',
                            correctAnswer: match?.correctAnswer || ans.correctAnswer || '',
                            explanation: match?.explanation || '',
                            options: match?.options || []
                          };
                        };
                        return (
                          <React.Fragment key={assessmentId}>
                            <tr
                              className="cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() =>
                                setExpandedAssessmentId(isExpanded ? null : assessmentId)
                              }
                            >
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                  )}
                                  {assessment.created_at
                                    ? new Date(assessment.created_at).toLocaleDateString()
                                    : 'N/A'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {assessment.last_lesson || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {assessment.score ?? 'N/A'}/{assessment.total_questions ?? '?'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {assessment.total_questions > 0 ? (() => {
                                  const pct = (assessment.score / assessment.total_questions) * 100;
                                  return (
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      pct >= 80 ? 'bg-green-100 text-green-800' :
                                      pct >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {pct >= 80 ? 'Proficient' :
                                       pct >= 60 ? 'Developing' : 'Needs Support'}
                                    </span>
                                  );
                                })() : (
                                  <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                    N/A
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={4} className="px-4 py-4 bg-gray-50">
                                  {answers.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                      No question-level detail available for this assessment.
                                    </p>
                                  ) : wrongAnswers.length === 0 ? (
                                    <div className="flex items-center gap-2 text-sm text-green-700">
                                      <Check className="w-4 h-4" />
                                      <span>All questions answered correctly.</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <p className="text-sm font-medium text-gray-700">
                                        Questions answered incorrectly ({wrongAnswers.length})
                                      </p>
                                      {wrongAnswers.map((ans: any, i: number) => {
                                        const details = getQuestionDetails(ans);
                                        return (
                                          <div
                                            key={i}
                                            className="bg-white rounded-lg border border-red-100 p-4"
                                          >
                                            <p className="text-sm font-medium text-gray-900 mb-2">
                                              {details.questionText}
                                            </p>
                                            {ans.questionSubtopic && (
                                              <span className="inline-block px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs mb-3">
                                                {ans.questionSubtopic}
                                              </span>
                                            )}
                                            <div className="space-y-2 text-sm">
                                              <div className="flex items-start gap-2">
                                                <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                                <div>
                                                  <span className="text-gray-500">Student answer: </span>
                                                  <span className="text-red-700 font-medium">
                                                    {ans.answer || '(blank)'}
                                                  </span>
                                                </div>
                                              </div>
                                              {details.correctAnswer && (
                                                <div className="flex items-start gap-2">
                                                  <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                                  <div>
                                                    <span className="text-gray-500">Correct answer: </span>
                                                    <span className="text-green-700 font-medium">
                                                      {details.correctAnswer}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                              {details.explanation && (
                                                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                                                  <span className="font-medium">Explanation: </span>
                                                  {details.explanation}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No recent assessments available.</p>
              )}
            </section>

            <section className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-gray-900">Student Session Logs</h2>
                <span className="text-xs text-gray-400 ml-auto">{studentSessionLogs.length} logs</span>
              </div>
              <SessionLogsList
                logs={studentSessionLogs}
                isLoading={isLoadingStudentLogs}
                emptyMessage="This student hasn't submitted any session logs yet."
              />
            </section>
          </div>
        </main>
        <FloatingRecordButton mentorId={mentor.id} groupId={group.id} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div>
            <h1 className="text-2xl font-oswald font-bold text-gray-900">{group.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {group.grade_level && `Grade ${group.grade_level} • `}
              {group.subject}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Students ({students.length})</h2>
              </div>
              {students.length === 0 ? (
                <p className="text-gray-600 text-sm">No students in this group yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left w-full"
                    >
                      <div className="flex items-center space-x-3">
                        {student.emoji_code && (
                          <div className="text-3xl">{student.emoji_code}</div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">Grade {student.grade}</p>
                          {typeof student.weeklyProgress === 'number' && student.weeklyProgress !== 0 && isFinite(student.weeklyProgress) && (
                            <p className={`text-xs mt-1 ${
                              student.weeklyProgress > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {student.weeklyProgress > 0 ? '\u2191' : '\u2193'} {Math.abs(student.weeklyProgress).toFixed(0)}% this week
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
                <span className="text-xs text-gray-400 ml-auto">{sessions.length} total</span>
              </div>
              <SessionList sessions={sessions} students={students} groupName={group.name} />
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Teacher Contact</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{group.teacher_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <a href={`mailto:${group.teacher_email}`} className="text-blue-600 hover:underline">
                    {group.teacher_email}
                  </a>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Available Lesson Plans</h2>
              </div>
              {lessonPlans.length === 0 ? (
                <p className="text-gray-600 text-sm">No lesson plans available yet.</p>
              ) : (
                <div className="space-y-3">
                  {lessonPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handleViewLessonPlan(plan.id)}
                      className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm line-clamp-2">{plan.objective || plan.title}</p>
                        {plan.focusAreas && plan.focusAreas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {plan.focusAreas.map((area: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">{area}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(plan.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {mentorGoals.length > 0 && (
              <section className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="w-5 h-5 text-teal-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Coach Goals</h2>
                </div>
                <div className="space-y-3">
                  {mentorGoals.map((goal: any) => (
                    <div
                      key={goal.id}
                      className={`p-3 rounded-lg border text-sm ${
                        goal.status === 'completed'
                          ? 'bg-green-50 border-green-200'
                          : 'bg-teal-50 border-teal-200'
                      }`}
                    >
                      <p className={`font-medium ${goal.status === 'completed' ? 'text-green-800 line-through' : 'text-teal-900'}`}>
                        {goal.title}
                      </p>
                      {goal.description && (
                        <p className="text-xs text-gray-600 mt-1">{goal.description}</p>
                      )}
                      {goal.due_date && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {new Date(goal.due_date).toLocaleDateString()}
                        </p>
                      )}
                      <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                        goal.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'
                      }`}>
                        {goal.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <FloatingRecordButton mentorId={mentor.id} groupId={group.id} />
    </div>
  );
}
