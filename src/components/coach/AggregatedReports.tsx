import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Clock, Users, TrendingUp, Download,
  GraduationCap, BookOpen, Calendar
} from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { CoachTeacher, CoachMentor } from '../../services/supabase/coachData';
import { TutoringVsGrowth } from './TutoringVsGrowth';

interface Props {
  teachers: CoachTeacher[];
  mentors: CoachMentor[];
}

type ReportTab = 'student-hours' | 'mentor-productivity' | 'district-totals' | 'exposure-vs-growth';

export function AggregatedReports({ teachers, mentors }: Props) {
  const [activeTab, setActiveTab] = useState<ReportTab>('student-hours');

  const teacherUsernames = teachers.map(t => t.username);
  const mentorIds = mentors.map(m => m.id);

  const { data: sessionData = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['aggregatedSessions', mentorIds],
    queryFn: async () => {
      if (mentorIds.length === 0) return [];
      const { data, error } = await supabase
        .from('mentor_sessions')
        .select('mentor_id, group_id, session_date, tutoring_minutes, timer_minutes, resource_used, used_lesson_plan')
        .in('mentor_id', mentorIds)
        .order('session_date', { ascending: false });

      if (error) return [];
      return data || [];
    },
    enabled: mentorIds.length > 0
  });

  const { data: quizData = [], isLoading: quizLoading } = useQuery({
    queryKey: ['aggregatedQuizAttempts', teacherUsernames],
    queryFn: async () => {
      if (teacherUsernames.length === 0) return [];
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('student_id, teacher_username, score, total_questions, completed_at')
        .in('teacher_username', teacherUsernames)
        .order('completed_at', { ascending: false });

      if (error) return [];
      return data || [];
    },
    enabled: teacherUsernames.length > 0
  });

  const totalTutoringMinutes = sessionData.reduce((sum, s) => sum + (s.tutoring_minutes || 0), 0);
  const totalTimerMinutes = sessionData.reduce((sum, s) => sum + (s.timer_minutes || 0), 0);
  const totalSessions = sessionData.length;
  const resourceUsedCount = sessionData.filter(s => s.resource_used === 'data_lesson_plan' || s.resource_used === 'elevate_curriculum' || s.used_lesson_plan).length;
  const fidelityRate = totalSessions > 0 ? ((resourceUsedCount / totalSessions) * 100).toFixed(1) : '0';

  const uniqueStudents = new Set(quizData.map(q => `${q.student_id}_${q.teacher_username}`)).size;
  const avgScore = quizData.length > 0
    ? (quizData.reduce((sum, q) => sum + (q.total_questions > 0 ? (q.score / q.total_questions) * 100 : 0), 0) / quizData.length).toFixed(1)
    : '0';

  const mentorProductivity = mentors.map(m => {
    const mSessions = sessionData.filter(s => s.mentor_id === m.id);
    const mMinutes = mSessions.reduce((sum, s) => sum + (s.tutoring_minutes || 0), 0);
    const mLPCount = mSessions.filter(s => s.resource_used === 'lesson_plan' || s.used_lesson_plan).length;
    return {
      ...m,
      sessionCount: mSessions.length,
      totalMinutes: mMinutes,
      lessonPlanUsage: mSessions.length > 0 ? ((mLPCount / mSessions.length) * 100).toFixed(0) : '0'
    };
  }).sort((a, b) => b.totalMinutes - a.totalMinutes);

  const teacherSummary = teachers.map(t => {
    const tQuizzes = quizData.filter(q => q.teacher_username === t.username);
    const tStudents = new Set(tQuizzes.map(q => q.student_id)).size;
    const tAvg = tQuizzes.length > 0
      ? (tQuizzes.reduce((sum, q) => sum + (q.total_questions > 0 ? (q.score / q.total_questions) * 100 : 0), 0) / tQuizzes.length).toFixed(1)
      : '0';
    const tMentors = mentors.filter(m => m.assignedTeachers.includes(t.username));
    const tMentorSessions = sessionData.filter(s => tMentors.some(m => m.id === s.mentor_id));
    const tMinutes = tMentorSessions.reduce((sum, s) => sum + (s.tutoring_minutes || 0), 0);
    return {
      ...t,
      studentCount: tStudents,
      avgScore: tAvg,
      assessmentCount: tQuizzes.length,
      tutoringMinutes: tMinutes,
      mentorCount: tMentors.length
    };
  });

  const handleExportCSV = () => {
    let csv = '';
    if (activeTab === 'mentor-productivity') {
      csv = 'Mentor,Sessions,Total Minutes,LP Usage %\n';
      mentorProductivity.forEach(m => {
        csv += `"${m.name}",${m.sessionCount},${m.totalMinutes},${m.lessonPlanUsage}%\n`;
      });
    } else if (activeTab === 'district-totals') {
      csv = 'Teacher,Students,Assessments,Avg Score,Tutoring Min,Mentors\n';
      teacherSummary.forEach(t => {
        csv += `"${t.name}",${t.studentCount},${t.assessmentCount},${t.avgScore}%,${t.tutoringMinutes},${t.mentorCount}\n`;
      });
    } else {
      csv = 'Metric,Value\n';
      csv += `Total Sessions,${totalSessions}\n`;
      csv += `Total Tutoring Minutes,${totalTutoringMinutes}\n`;
      csv += `Total Timer Minutes,${totalTimerMinutes}\n`;
      csv += `Unique Students,${uniqueStudents}\n`;
      csv += `LP Fidelity Rate,${fidelityRate}%\n`;
      csv += `Avg Assessment Score,${avgScore}%\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = sessionsLoading || quizLoading;

  const tabs: { id: ReportTab; label: string; icon: React.ElementType }[] = [
    { id: 'student-hours', label: 'Overview', icon: BarChart3 },
    { id: 'mentor-productivity', label: 'Mentor Productivity', icon: GraduationCap },
    { id: 'district-totals', label: 'Teacher Summaries', icon: Users },
    { id: 'exposure-vs-growth', label: 'Exposure vs Growth', icon: TrendingUp },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-oswald font-bold text-gray-900">Aggregated Reports</h1>
          <p className="text-sm text-gray-600 mt-1">Program-wide metrics across all your teachers and mentors</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Total Tutoring Hours" value={`${(totalTutoringMinutes / 60).toFixed(1)}h`} sub={`${totalTutoringMinutes} min`} />
        <StatCard icon={Calendar} label="Total Sessions" value={totalSessions.toString()} sub={`${mentors.length} mentors`} />
        <StatCard icon={Users} label="Students Assessed" value={uniqueStudents.toString()} sub={`${teachers.length} teachers`} />
        <StatCard icon={BookOpen} label="Lesson plan Usage" value={`${fidelityRate}%`} sub={`${lessonPlanUsageCount}/${totalSessions} sessions`} />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-4">
          <div className="flex gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              <span className="ml-3 text-gray-600">Loading report data...</span>
            </div>
          ) : activeTab === 'student-hours' ? (
            <OverviewReport
              totalMinutes={totalTutoringMinutes}
              timerMinutes={totalTimerMinutes}
              sessionCount={totalSessions}
              avgScore={avgScore}
              uniqueStudents={uniqueStudents}
              fidelityRate={fidelityRate}
            />
          ) : activeTab === 'mentor-productivity' ? (
            <MentorProductivityReport mentors={mentorProductivity} />
          ) : activeTab === 'exposure-vs-growth' ? (
            <TutoringVsGrowth teachers={teachers} mentors={mentors} />
          ) : (
            <TeacherSummaryReport teachers={teacherSummary} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-teal-600" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function OverviewReport({ totalMinutes, timerMinutes, sessionCount, avgScore, uniqueStudents, fidelityRate }: {
  totalMinutes: number; timerMinutes: number; sessionCount: number; avgScore: string; uniqueStudents: number; fidelityRate: string;
}) {
  const rows = [
    { label: 'Total Self-Reported Minutes', value: `${totalMinutes} min (${(totalMinutes / 60).toFixed(1)} hrs)` },
    { label: 'Total Timer-Tracked Minutes', value: `${timerMinutes} min (${(timerMinutes / 60).toFixed(1)} hrs)` },
    { label: 'Total Sessions Logged', value: sessionCount },
    { label: 'Unique Students Assessed', value: uniqueStudents },
    { label: 'Average Assessment Score', value: `${avgScore}%` },
    { label: 'Lesson Plan Fidelity Rate', value: `${fidelityRate}%` },
    { label: 'Avg Minutes per Session', value: sessionCount > 0 ? `${(totalMinutes / sessionCount).toFixed(1)} min` : 'N/A' },
  ];

  return (
    <div className="overflow-hidden">
      <table className="min-w-full">
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
              <td className="px-4 py-3 text-sm font-medium text-gray-700">{row.label}</td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right font-semibold">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MentorProductivityReport({ mentors }: { mentors: any[] }) {
  if (mentors.length === 0) {
    return <p className="text-gray-600 text-sm">No mentor data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mentor</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sessions</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Minutes</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Min/Session</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">LP Usage</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {mentors.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.name}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{m.sessionCount}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{m.totalMinutes}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">
                {m.sessionCount > 0 ? (m.totalMinutes / m.sessionCount).toFixed(1) : '0'}
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  parseInt(m.lessonPlanUsage) >= 80 ? 'bg-green-100 text-green-700' :
                  parseInt(m.lessonPlanUsage) >= 50 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {m.lessonPlanUsage}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeacherSummaryReport({ teachers }: { teachers: any[] }) {
  if (teachers.length === 0) {
    return <p className="text-gray-600 text-sm">No teacher data available.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Students</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Assessments</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Score</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Tutoring Min</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Mentors</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {teachers.map((t) => (
            <tr key={t.username} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900">{t.name}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{t.studentCount}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{t.assessmentCount}</td>
              <td className="px-4 py-3 text-sm text-right">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  parseFloat(t.avgScore) >= 80 ? 'bg-green-100 text-green-700' :
                  parseFloat(t.avgScore) >= 60 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {t.avgScore}%
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{t.tutoringMinutes}</td>
              <td className="px-4 py-3 text-sm text-gray-700 text-right">{t.mentorCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
