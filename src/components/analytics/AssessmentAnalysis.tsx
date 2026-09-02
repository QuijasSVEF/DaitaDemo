import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';
import { Loader2, BarChart2, ChevronDown, Users, Target, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  teacherUsername: string;
}

interface StudentAnswer {
  studentId: number;
  studentName: string;
  correct: boolean;
  answer: string;
}

interface QuestionStat {
  questionId: string;
  questionText: string;
  subtopic: string;
  incorrectCount: number;
  totalAttempts: number;
  incorrectPct: number;
  correctAnswer: string;
  students: StudentAnswer[];
}

interface AssessmentGroup {
  templateId: string;
  title: string;
  createdAt: string;
  questions: QuestionStat[];
  totalStudents: number;
  averageScore: number;
}

export function AssessmentAnalysis({ teacherUsername }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['assessmentAnalysis', teacherUsername],
    queryFn: async () => {
      const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select(`
          student_id,
          template_id,
          score,
          total_questions,
          answers,
          quiz_templates!inner(title, created_at)
        `)
        .eq('teacher_username', teacherUsername)
        .not('answers', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!attempts || attempts.length === 0) return [];

      // Fetch student names separately
      const studentIds = [...new Set(attempts.map(a => a.student_id).filter(Boolean))];
      const studentMap = new Map<number, string>();
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, first_name, last_initial')
          .in('id', studentIds);
        if (students) {
          for (const s of students) {
            studentMap.set(s.id, `${s.first_name} ${s.last_initial}.`);
          }
        }
      }

      const grouped = new Map<string, {
        title: string;
        createdAt: string;
        totalScore: number;
        totalPossible: number;
        studentCount: number;
        questionMap: Map<string, {
          text: string;
          subtopic: string;
          correctAnswer: string;
          students: StudentAnswer[];
        }>;
      }>();

      for (const attempt of attempts) {
        const tid = attempt.template_id;
        const tmpl = attempt.quiz_templates as any;
        if (!tid || !tmpl) continue;

        if (!grouped.has(tid)) {
          grouped.set(tid, {
            title: tmpl.title,
            createdAt: tmpl.created_at,
            totalScore: 0,
            totalPossible: 0,
            studentCount: 0,
            questionMap: new Map()
          });
        }

        const group = grouped.get(tid)!;
        group.studentCount++;
        group.totalScore += attempt.score || 0;
        group.totalPossible += attempt.total_questions || 0;

        const answers = attempt.answers as any[];
        if (!Array.isArray(answers)) continue;

        const studentName = studentMap.get(attempt.student_id) || `Student #${attempt.student_id}`;

        for (const ans of answers) {
          if (!ans.questionId) continue;
          const existing = group.questionMap.get(ans.questionId);
          if (existing) {
            existing.students.push({
              studentId: attempt.student_id,
              studentName,
              correct: !!ans.correct,
              answer: ans.answer || ''
            });
          } else {
            group.questionMap.set(ans.questionId, {
              text: ans.questionText || 'Question',
              subtopic: ans.questionSubtopic || ans.subtopic || '',
              correctAnswer: ans.correctAnswer || '',
              students: [{
                studentId: attempt.student_id,
                studentName,
                correct: !!ans.correct,
                answer: ans.answer || ''
              }]
            });
          }
        }
      }

      const result: AssessmentGroup[] = [];
      for (const [tid, group] of grouped) {
        const questions: QuestionStat[] = [];
        for (const [qid, stats] of group.questionMap) {
          const incorrect = stats.students.filter(s => !s.correct).length;
          const total = stats.students.length;
          questions.push({
            questionId: qid,
            questionText: stats.text,
            subtopic: stats.subtopic,
            incorrectCount: incorrect,
            totalAttempts: total,
            incorrectPct: total > 0 ? Math.round((incorrect / total) * 100) : 0,
            correctAnswer: stats.correctAnswer,
            students: stats.students
          });
        }
        questions.sort((a, b) => b.incorrectPct - a.incorrectPct);

        const avgScore = group.totalPossible > 0
          ? Math.round((group.totalScore / group.totalPossible) * 100)
          : 0;

        result.push({
          templateId: tid,
          title: group.title,
          createdAt: group.createdAt,
          questions,
          totalStudents: group.studentCount,
          averageScore: avgScore
        });
      }

      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return result;
    },
    enabled: !!teacherUsername
  });

  const selectedAssessment = useMemo(() => {
    if (!assessments.length) return null;
    if (selectedTemplateId) return assessments.find(a => a.templateId === selectedTemplateId) || assessments[0];
    return assessments[0];
  }, [assessments, selectedTemplateId]);

  const summaryStats = useMemo(() => {
    if (!selectedAssessment) return null;
    const highStruggle = selectedAssessment.questions.filter(q => q.incorrectPct >= 50);
    const topSubtopics = [...new Set(highStruggle.map(q => q.subtopic).filter(Boolean))].slice(0, 3);
    return {
      totalQuestions: selectedAssessment.questions.length,
      highStruggleCount: highStruggle.length,
      topSubtopics,
      averageScore: selectedAssessment.averageScore,
      totalStudents: selectedAssessment.totalStudents
    };
  }, [selectedAssessment]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-svef-purple animate-spin" />
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <BarChart2 className="w-14 h-14 text-gray-200 mx-auto mb-4" />
        <p className="text-svef-gray font-medium text-lg">No assessment data yet</p>
        <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
          Once students complete assessments, detailed question-level analysis will appear here to help you target instruction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assessment Selector */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-oswald text-lg font-medium text-svef-gray">Question-Level Analysis</h3>
            <p className="text-sm text-gray-400 mt-0.5">Identify concepts that need full-class re-engagement</p>
          </div>
          <div className="relative">
            <select
              value={selectedTemplateId || assessments[0]?.templateId || ''}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value);
                setExpandedQuestion(null);
              }}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm font-medium text-svef-gray focus:outline-none focus:ring-2 focus:ring-svef-purple/30 focus:border-svef-purple cursor-pointer min-w-[240px]"
            >
              {assessments.map((a) => (
                <option key={a.templateId} value={a.templateId}>
                  {a.title} ({new Date(a.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-svef-purple" />
              <span className="text-sm font-medium text-gray-500">Students Assessed</span>
            </div>
            <p className="text-3xl font-oswald text-svef-gray">{summaryStats.totalStudents}</p>
            <p className="text-xs text-gray-400 mt-1">completed this assessment</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-svef-purple" />
              <span className="text-sm font-medium text-gray-500">Class Average</span>
            </div>
            <p className={cn(
              'text-3xl font-oswald',
              summaryStats.averageScore >= 70 ? 'text-green-600' :
              summaryStats.averageScore >= 50 ? 'text-amber-600' : 'text-red-600'
            )}>
              {summaryStats.averageScore}%
            </p>
            <p className="text-xs text-gray-400 mt-1">overall correct rate</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-gray-500">Needs Reteaching</span>
            </div>
            <p className="text-3xl font-oswald text-amber-600">
              {summaryStats.highStruggleCount}
              <span className="text-base text-gray-400 ml-1">/ {summaryStats.totalQuestions}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">questions missed by 50%+ of class</p>
          </div>
        </div>
      )}

      {/* Focus Subtopics Banner */}
      {summaryStats && summaryStats.topSubtopics.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Priority Re-engagement Topics</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {summaryStats.topSubtopics.map((topic) => (
                <span key={topic} className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-100 text-xs font-medium text-amber-800 border border-amber-200">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Question Breakdown */}
      {selectedAssessment && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h4 className="font-medium text-svef-gray">Per-Question Breakdown</h4>
            <p className="text-xs text-gray-400 mt-0.5">Sorted by highest incorrect rate. Click a row to see which students struggled.</p>
          </div>

          <div className="divide-y divide-gray-50">
            {selectedAssessment.questions.map((q, idx) => {
              const isExpanded = expandedQuestion === q.questionId;
              const incorrectStudents = q.students.filter(s => !s.correct);

              return (
                <div key={q.questionId}>
                  <button
                    onClick={() => setExpandedQuestion(isExpanded ? null : q.questionId)}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors text-left"
                  >
                    <span className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      q.incorrectPct >= 70 ? 'bg-red-100 text-red-700' :
                      q.incorrectPct >= 50 ? 'bg-amber-100 text-amber-700' :
                      q.incorrectPct >= 30 ? 'bg-yellow-50 text-yellow-700' :
                      'bg-green-50 text-green-700'
                    )}>
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-svef-gray leading-snug line-clamp-1">
                        {q.questionText}
                      </p>
                      {q.subtopic && (
                        <p className="text-xs text-gray-400 mt-0.5">{q.subtopic}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-green-600">
                            {100 - q.incorrectPct}%
                          </span>
                          <span className="text-sm font-semibold text-red-500">
                            {q.incorrectPct}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {q.totalAttempts - q.incorrectCount} correct, {q.incorrectCount} incorrect
                        </p>
                      </div>

                      <div className="w-24 h-3 bg-red-200 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-green-500 transition-all rounded-l-full"
                          style={{ width: `${100 - q.incorrectPct}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-5 bg-gray-50/50">
                      <div className="ml-11 space-y-3">
                        <div className="flex items-center gap-6 text-xs text-gray-500 pt-2 pb-1">
                          <span>Correct answer: <strong className="text-svef-gray">{q.correctAnswer}</strong></span>
                        </div>

                        {incorrectStudents.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              Students who missed this ({incorrectStudents.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {incorrectStudents.map((s) => (
                                <span
                                  key={s.studentId}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-gray-200 text-xs text-gray-700"
                                >
                                  {s.studentName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
