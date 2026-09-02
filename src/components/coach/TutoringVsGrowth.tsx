import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Clock, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { CoachTeacher, CoachMentor } from '../../services/supabase/coachData';

interface Props {
  teachers: CoachTeacher[];
  mentors: CoachMentor[];
}

interface StudentExposure {
  studentId: number;
  teacherUsername: string;
  teacherName: string;
  tutoringMinutes: number;
  sessionCount: number;
  firstScore: number | null;
  latestScore: number | null;
  scoreDelta: number | null;
  trend: 'up' | 'down' | 'flat';
}

export function TutoringVsGrowth({ teachers, mentors }: Props) {
  const teacherUsernames = teachers.map(t => t.username);
  const mentorIds = mentors.map(m => m.id);

  const { data: exposureData = [], isLoading } = useQuery({
    queryKey: ['tutoringVsGrowth', teacherUsernames, mentorIds],
    queryFn: async () => {
      if (teacherUsernames.length === 0) return [];

      const { data: sessions } = await supabase
        .from('mentor_sessions')
        .select('mentor_id, group_id, tutoring_minutes, is_ad_hoc')
        .in('mentor_id', mentorIds);

      const { data: groupStudents } = await supabase
        .from('mentor_group_students')
        .select('group_id, student_id');

      const { data: mentorGroupAssignments } = await supabase
        .from('mentor_group_assignments')
        .select('mentor_id, group_id')
        .in('mentor_id', mentorIds);

      const studentMinutes: Record<string, number> = {};
      const studentSessions: Record<string, number> = {};

      (sessions || []).forEach(s => {
        if (s.group_id) {
          const studentsInGroup = (groupStudents || []).filter(gs => gs.group_id === s.group_id);
          studentsInGroup.forEach(gs => {
            const key = String(gs.student_id);
            studentMinutes[key] = (studentMinutes[key] || 0) + (s.tutoring_minutes || 0);
            studentSessions[key] = (studentSessions[key] || 0) + 1;
          });
        } else if (s.is_ad_hoc) {
          const mentorGroups = (mentorGroupAssignments || []).filter(mg => mg.mentor_id === s.mentor_id);
          const mentorStudentIds = new Set<string>();
          mentorGroups.forEach(mg => {
            (groupStudents || []).filter(gs => gs.group_id === mg.group_id).forEach(gs => {
              mentorStudentIds.add(String(gs.student_id));
            });
          });
          if (mentorStudentIds.size > 0) {
            const perStudentMin = Math.round((s.tutoring_minutes || 0) / mentorStudentIds.size);
            mentorStudentIds.forEach(key => {
              studentMinutes[key] = (studentMinutes[key] || 0) + perStudentMin;
              studentSessions[key] = (studentSessions[key] || 0) + 1;
            });
          }
        }
      });

      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('student_id, teacher_username, score, total_questions, completed_at')
        .in('teacher_username', teacherUsernames)
        .order('completed_at', { ascending: true });

      const studentQuizzes: Record<string, any[]> = {};
      (quizAttempts || []).forEach(q => {
        const key = `${q.student_id}_${q.teacher_username}`;
        if (!studentQuizzes[key]) studentQuizzes[key] = [];
        studentQuizzes[key].push(q);
      });

      const results: StudentExposure[] = [];

      Object.entries(studentQuizzes).forEach(([key, quizzes]) => {
        if (quizzes.length < 1) return;
        const [sidStr, teacherUsername] = key.split('_');
        const studentId = parseInt(sidStr);
        const teacher = teachers.find(t => t.username === teacherUsername);

        const firstQuiz = quizzes[0];
        const lastQuiz = quizzes[quizzes.length - 1];

        const firstPct = firstQuiz.total_questions > 0
          ? Math.round((firstQuiz.score / firstQuiz.total_questions) * 100)
          : null;
        const latestPct = lastQuiz.total_questions > 0
          ? Math.round((lastQuiz.score / lastQuiz.total_questions) * 100)
          : null;

        const delta = firstPct !== null && latestPct !== null && quizzes.length > 1
          ? latestPct - firstPct
          : null;

        const trend: 'up' | 'down' | 'flat' =
          delta === null ? 'flat' : delta > 5 ? 'up' : delta < -5 ? 'down' : 'flat';

        results.push({
          studentId,
          teacherUsername,
          teacherName: teacher?.name || teacherUsername,
          tutoringMinutes: studentMinutes[sidStr] || 0,
          sessionCount: studentSessions[sidStr] || 0,
          firstScore: firstPct,
          latestScore: latestPct,
          scoreDelta: delta,
          trend
        });
      });

      return results.sort((a, b) => b.tutoringMinutes - a.tutoringMinutes);
    },
    enabled: teacherUsernames.length > 0
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        <span className="ml-3 text-gray-600">Loading exposure data...</span>
      </div>
    );
  }

  const withTutoring = exposureData.filter(s => s.tutoringMinutes > 0);
  const withoutTutoring = exposureData.filter(s => s.tutoringMinutes === 0);

  const avgGrowthWith = withTutoring.filter(s => s.scoreDelta !== null).length > 0
    ? (withTutoring.filter(s => s.scoreDelta !== null).reduce((sum, s) => sum + (s.scoreDelta || 0), 0) / withTutoring.filter(s => s.scoreDelta !== null).length).toFixed(1)
    : 'N/A';

  const avgGrowthWithout = withoutTutoring.filter(s => s.scoreDelta !== null).length > 0
    ? (withoutTutoring.filter(s => s.scoreDelta !== null).reduce((sum, s) => sum + (s.scoreDelta || 0), 0) / withoutTutoring.filter(s => s.scoreDelta !== null).length).toFixed(1)
    : 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5 text-teal-600" />
        <h2 className="text-lg font-semibold text-gray-900">Tutoring Exposure vs Assessment Growth</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-teal-50 rounded-lg border border-teal-200 p-4">
          <p className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-1">With Tutoring</p>
          <p className="text-2xl font-bold text-teal-800">
            {avgGrowthWith !== 'N/A' ? `${parseFloat(avgGrowthWith) > 0 ? '+' : ''}${avgGrowthWith}%` : 'N/A'}
          </p>
          <p className="text-xs text-teal-600 mt-1">avg score change ({withTutoring.length} students)</p>
        </div>
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Without Tutoring</p>
          <p className="text-2xl font-bold text-gray-700">
            {avgGrowthWithout !== 'N/A' ? `${parseFloat(avgGrowthWithout) > 0 ? '+' : ''}${avgGrowthWithout}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">avg score change ({withoutTutoring.length} students)</p>
        </div>
      </div>

      {exposureData.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-8">No student data available for comparison.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutoring Min</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">First Score</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Latest Score</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Change</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {exposureData.slice(0, 50).map((s, i) => (
                <tr key={`${s.studentId}_${s.teacherUsername}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">#{s.studentId}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.teacherName}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {s.tutoringMinutes > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-teal-500" />
                        {s.tutoringMinutes}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">{s.sessionCount}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {s.firstScore !== null ? `${s.firstScore}%` : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-700">
                    {s.latestScore !== null ? `${s.latestScore}%` : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    {s.scoreDelta !== null ? (
                      <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                        s.trend === 'up' ? 'bg-green-100 text-green-700' :
                        s.trend === 'down' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {s.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                        {s.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                        {s.trend === 'flat' && <Minus className="w-3 h-3" />}
                        {s.scoreDelta > 0 ? '+' : ''}{s.scoreDelta}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
