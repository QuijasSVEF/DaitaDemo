import React from 'react';
import { GraduationCap, Clock, BookOpen, Users, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';
import { cn } from '../../utils/cn';
import { TEST_MENTOR_IDS } from '../../constants/testUsers';

interface MentorStats {
  totalMentors: number;
  totalSessions: number;
  totalMinutes: number;
  avgSessionMinutes: number;
  sessionsWithPlan: number;
  mentorBreakdown: {
    id: string;
    name: string;
    email: string;
    sessionCount: number;
    totalMinutes: number;
    usedLessonPlanCount: number;
    groupCount: number;
    lastSession: string | null;
  }[];
  recentSessions: {
    mentorName: string;
    groupName: string;
    date: string;
    duration: number;
    usedLessonPlan: boolean;
    notes: string | null;
  }[];
}

export function MentorMetricsTab({ excludeTestData = false }: { excludeTestData?: boolean }) {
  const { data: stats, isLoading } = useQuery<MentorStats>({
    queryKey: ['adminMentorMetrics', excludeTestData],
    queryFn: async () => {
      const { data: mentors } = await supabase
        .from('college_mentors')
        .select('id, full_name, email');

      const { data: sessions } = await supabase
        .from('mentor_sessions')
        .select('id, mentor_id, group_id, session_date, tutoring_minutes, used_lesson_plan, is_ad_hoc, ad_hoc_teacher_username, curriculum_feedback, college_mentors(full_name), mentor_groups(name)')
        .order('session_date', { ascending: false });

      const { data: assignments } = await supabase
        .from('mentor_group_assignments')
        .select('mentor_id, group_id');

      const { data: groups } = await supabase
        .from('mentor_groups')
        .select('id, name');

      const allMentors = excludeTestData
        ? (mentors || []).filter((m: any) => !TEST_MENTOR_IDS.includes(m.id))
        : (mentors || []);
      const allSessions = excludeTestData
        ? (sessions || []).filter((s: any) => !TEST_MENTOR_IDS.includes(s.mentor_id))
        : (sessions || []);
      const allAssignments = excludeTestData
        ? (assignments || []).filter((a: any) => !TEST_MENTOR_IDS.includes(a.mentor_id))
        : (assignments || []);
      const groupMap = new Map((groups || []).map((g: any) => [g.id, g.name]));

      const mentorNameMap = new Map(allMentors.map((m: any) => [m.id, m.full_name]));

      const totalMinutes = allSessions.reduce((sum: number, s: any) => sum + (s.tutoring_minutes || 0), 0);
      const sessionsWithPlan = allSessions.filter((s: any) => s.used_lesson_plan).length;

      const mentorSessionMap = new Map<string, any[]>();
      allSessions.forEach((s: any) => {
        const existing = mentorSessionMap.get(s.mentor_id) || [];
        existing.push(s);
        mentorSessionMap.set(s.mentor_id, existing);
      });

      const mentorGroupMap = new Map<string, Set<string>>();
      allAssignments.forEach((a: any) => {
        const existing = mentorGroupMap.get(a.mentor_id) || new Set();
        existing.add(a.group_id);
        mentorGroupMap.set(a.mentor_id, existing);
      });

      const mentorBreakdown = allMentors.map((m: any) => {
        const mSessions = mentorSessionMap.get(m.id) || [];
        const mGroups = mentorGroupMap.get(m.id) || new Set();
        const mMinutes = mSessions.reduce((sum: number, s: any) => sum + (s.tutoring_minutes || 0), 0);
        const mPlanCount = mSessions.filter((s: any) => s.used_lesson_plan).length;
        const lastSession = mSessions.length > 0 ? mSessions[0].session_date : null;

        return {
          id: m.id,
          name: m.full_name,
          email: m.email,
          sessionCount: mSessions.length,
          totalMinutes: mMinutes,
          usedLessonPlanCount: mPlanCount,
          groupCount: mGroups.size,
          lastSession,
        };
      }).sort((a, b) => b.sessionCount - a.sessionCount);

      const recentSessions = allSessions.slice(0, 20).map((s: any) => ({
        mentorName: s.college_mentors?.full_name || mentorNameMap.get(s.mentor_id) || 'Unknown',
        groupName: s.is_ad_hoc
          ? 'Ad-hoc Session'
          : (s.mentor_groups?.name || groupMap.get(s.group_id) || 'Unknown Group'),
        date: s.session_date,
        duration: s.tutoring_minutes || 0,
        usedLessonPlan: s.used_lesson_plan || false,
        notes: s.curriculum_feedback || '',
      }));

      return {
        totalMentors: allMentors.length,
        totalSessions: allSessions.length,
        totalMinutes,
        avgSessionMinutes: allSessions.length > 0 ? Math.round(totalMinutes / allSessions.length) : 0,
        sessionsWithPlan,
        mentorBreakdown,
        recentSessions,
      };
    },
    refetchInterval: 30000,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-svef-purple" />
      </div>
    );
  }

  const planUsageRate = stats.totalSessions > 0
    ? Math.round((stats.sessionsWithPlan / stats.totalSessions) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard icon={GraduationCap} title="Total Mentors" value={stats.totalMentors} color="bg-blue-50 text-blue-600" />
        <MetricCard icon={Users} title="Total Sessions" value={stats.totalSessions} color="bg-teal-50 text-teal-600" />
        <MetricCard icon={Clock} title="Total Hours" value={`${(stats.totalMinutes / 60).toFixed(1)}h`} color="bg-amber-50 text-amber-600" />
        <MetricCard icon={Clock} title="Avg Session" value={`${stats.avgSessionMinutes}min`} color="bg-green-50 text-green-600" />
        <MetricCard icon={BookOpen} title="Plan Usage" value={`${planUsageRate}%`} color="bg-rose-50 text-rose-600" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="font-oswald text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          Mentor Performance Breakdown
        </h3>
        {stats.mentorBreakdown.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No mentors registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Mentor</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Groups</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Sessions</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Hours</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Plan Usage</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Last Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.mentorBreakdown.map((m) => {
                  const planRate = m.sessionCount > 0
                    ? Math.round((m.usedLessonPlanCount / m.sessionCount) * 100)
                    : 0;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800">{m.name}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{m.email}</td>
                      <td className="py-3 px-4 text-center text-gray-700">{m.groupCount}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          m.sessionCount >= 10 ? 'bg-green-50 text-green-700' :
                          m.sessionCount >= 5 ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        )}>
                          {m.sessionCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700">
                        {(m.totalMinutes / 60).toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          planRate >= 75 ? 'bg-green-50 text-green-700' :
                          planRate >= 50 ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        )}>
                          {planRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">
                        {m.lastSession ? new Date(m.lastSession).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="font-oswald text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600" />
          Recent Mentor Sessions
        </h3>
        {stats.recentSessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No sessions logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Mentor</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Group</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Used Plan</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentSessions.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{s.mentorName}</td>
                    <td className="py-3 px-4 text-gray-600">{s.groupName}</td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {new Date(s.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">{s.duration}min</td>
                    <td className="py-3 px-4 text-center">
                      {s.usedLessonPlan ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs max-w-xs truncate">
                      {s.notes || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, color }: { icon: React.ElementType; title: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2.5 rounded-lg', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <p className="text-2xl font-oswald font-medium text-gray-900">{value}</p>
    </div>
  );
}
