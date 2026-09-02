import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';
import { Loader2, Clock, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Props {
  teacherUsername: string;
}

interface AttemptRow {
  student_id: number;
  score: number;
  total_questions: number;
  duration: number;
  start_time: string;
  completion_time: string;
  completed_at: string;
  template_id: string;
}

interface TemplateInfo {
  id: string;
  title: string;
  created_at: string;
  num_questions: number;
}

interface StudentInfo {
  id: number;
  first_name: string;
  last_initial: string;
}

type SortField = 'name' | 'average';
type SortDir = 'asc' | 'desc';

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '--';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function getDurationFromAttempt(attempt: AttemptRow): number {
  if (attempt.duration > 0) return attempt.duration;
  if (attempt.start_time && attempt.completion_time) {
    const diff = Math.round(
      (new Date(attempt.completion_time).getTime() - new Date(attempt.start_time).getTime()) / 1000
    );
    return diff > 0 ? diff : 0;
  }
  return 0;
}

export function GradebookView({ teacherUsername }: Props) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data, isLoading } = useQuery({
    queryKey: ['gradebook', teacherUsername],
    queryFn: async () => {
      const { data: attempts, error: attError } = await supabase
        .from('quiz_attempts')
        .select('student_id, score, total_questions, duration, start_time, completion_time, completed_at, template_id')
        .eq('teacher_username', teacherUsername)
        .order('completed_at', { ascending: false });

      if (attError) throw attError;

      const { data: templates, error: tplError } = await supabase
        .from('quiz_templates')
        .select('id, title, created_at, num_questions')
        .eq('teacher_username', teacherUsername)
        .order('created_at', { ascending: false });

      if (tplError) throw tplError;

      const studentIds = [...new Set((attempts || []).map(a => a.student_id))];
      let students: StudentInfo[] = [];
      if (studentIds.length > 0) {
        const { data: studentData } = await supabase
          .from('students')
          .select('id, first_name, last_initial')
          .in('id', studentIds);
        students = (studentData || []) as StudentInfo[];
      }

      return {
        attempts: (attempts || []) as AttemptRow[],
        templates: (templates || []) as TemplateInfo[],
        students
      };
    },
    enabled: !!teacherUsername
  });

  const gradebook = useMemo(() => {
    if (!data) return null;

    const { attempts, templates, students } = data;

    const studentMap = new Map<number, string>();
    students.forEach(s => {
      studentMap.set(s.id, `${s.first_name} ${s.last_initial}.`);
    });

    // Only show templates that have at least one attempt
    const templatesWithAttempts = templates.filter(t =>
      attempts.some(a => a.template_id === t.id)
    );

    // Build grid: student -> template -> attempt data
    const studentIds = [...new Set(attempts.map(a => a.student_id))];

    const rows = studentIds.map(sid => {
      const name = studentMap.get(sid) || `Student #${sid}`;
      const studentAttempts = attempts.filter(a => a.student_id === sid);

      const cells = templatesWithAttempts.map(t => {
        const attempt = studentAttempts.find(a => a.template_id === t.id);
        if (!attempt) return null;
        const pct = attempt.total_questions > 0
          ? Math.round((attempt.score / attempt.total_questions) * 100)
          : 0;
        const duration = getDurationFromAttempt(attempt);
        const secondsPerQuestion = attempt.total_questions > 0 && duration > 0
          ? duration / attempt.total_questions
          : 0;
        const isSuspiciouslyFast = duration > 0 && secondsPerQuestion < 15 && attempt.total_questions >= 3;
        return { pct, duration, isSuspiciouslyFast, score: attempt.score, total: attempt.total_questions };
      });

      const scored = cells.filter(c => c !== null);
      const average = scored.length > 0
        ? Math.round(scored.reduce((sum, c) => sum + c!.pct, 0) / scored.length)
        : null;

      return { studentId: sid, name, cells, average };
    });

    // Sort
    rows.sort((a, b) => {
      if (sortField === 'name') {
        return sortDir === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      const aAvg = a.average ?? -1;
      const bAvg = b.average ?? -1;
      return sortDir === 'asc' ? aAvg - bAvg : bAvg - aAvg;
    });

    // Class averages per assessment
    const classAverages = templatesWithAttempts.map(t => {
      const tAttempts = attempts.filter(a => a.template_id === t.id);
      if (tAttempts.length === 0) return null;
      const total = tAttempts.reduce((sum, a) => {
        return sum + (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0);
      }, 0);
      return Math.round(total / tAttempts.length);
    });

    return { rows, templates: templatesWithAttempts, classAverages };
  }, [data, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-svef-purple animate-spin" />
      </div>
    );
  }

  if (!gradebook || gradebook.rows.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <Clock className="w-14 h-14 text-gray-200 mx-auto mb-4" />
        <p className="text-svef-gray font-medium text-lg">No assessment data yet</p>
        <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
          Once students complete assessments, their scores will appear here in a gradebook format.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-oswald text-lg font-medium text-svef-gray">Assessment Scores</h3>
            <p className="text-sm text-gray-400">Scores shown as correct/total. Time to complete shown below each score.</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Speed concern (&lt;15s/question)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-3 sticky left-0 bg-white z-10 min-w-[160px]">
                  <button
                    onClick={() => toggleSort('name')}
                    className="flex items-center gap-1 font-medium text-gray-700 hover:text-svef-purple"
                  >
                    Student
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                {gradebook.templates.map(t => (
                  <th key={t.id} className="text-center py-3 px-2 min-w-[90px]">
                    <div className="text-xs font-medium text-gray-600 leading-tight truncate max-w-[100px] mx-auto" title={t.title}>
                      {t.title.length > 14 ? t.title.slice(0, 14) + '...' : t.title}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </th>
                ))}
                <th className="text-center py-3 px-3 min-w-[70px]">
                  <button
                    onClick={() => toggleSort('average')}
                    className="flex items-center gap-1 font-medium text-gray-700 hover:text-svef-purple mx-auto"
                  >
                    Avg
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gradebook.rows.map(row => (
                <tr key={row.studentId} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-3 font-medium text-gray-800 sticky left-0 bg-white z-10">
                    {row.name}
                  </td>
                  {row.cells.map((cell, idx) => (
                    <td key={idx} className="py-2.5 px-2 text-center">
                      {cell ? (
                        <div className="flex flex-col items-center">
                          <span className={cn(
                            'inline-block px-2 py-0.5 rounded text-xs font-semibold',
                            cell.pct >= 70 ? 'bg-green-50 text-green-700' :
                            cell.pct >= 50 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          )}>
                            {cell.score}/{cell.total}
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                            {cell.isSuspiciouslyFast && (
                              <AlertTriangle className="w-3 h-3 text-amber-500 inline" title="Completed very quickly -- may need follow-up" />
                            )}
                            <Clock className="w-3 h-3 text-gray-300" />
                            {cell.duration > 0 ? formatDuration(cell.duration) : '--'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-center">
                    {row.average !== null ? (
                      <span className={cn(
                        'inline-block px-2.5 py-1 rounded-full text-xs font-bold',
                        row.average >= 70 ? 'bg-green-100 text-green-800' :
                        row.average >= 50 ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {row.average}%
                      </span>
                    ) : (
                      <span className="text-gray-300">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                <td className="py-2.5 px-3 font-medium text-gray-600 text-sm sticky left-0 bg-gray-50 z-10">
                  Class Average
                </td>
                {gradebook.classAverages.map((avg, idx) => (
                  <td key={idx} className="py-2.5 px-2 text-center">
                    {avg !== null ? (
                      <span className={cn(
                        'text-xs font-bold',
                        avg >= 70 ? 'text-green-700' :
                        avg >= 50 ? 'text-amber-700' :
                        'text-red-700'
                      )}>
                        {avg}%
                      </span>
                    ) : '--'}
                  </td>
                ))}
                <td className="py-2.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
