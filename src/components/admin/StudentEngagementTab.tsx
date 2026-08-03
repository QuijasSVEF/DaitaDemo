import React from 'react';
import { FileText, Star, BookOpen, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabase/config';
import { cn } from '../../utils/cn';
import { TEST_TEACHER_USERNAMES, TEST_STUDENT_IDS, isTestStudent } from '../../constants/testUsers';

interface SessionLog {
  id: string;
  student_id: number;
  teacher_username: string;
  session_date: string;
  topics_practiced: string[];
  self_reflection: string | null;
  confidence_rating: number | null;
  created_at: string;
}

interface EngagementStats {
  totalLogs: number;
  uniqueStudents: number;
  avgConfidence: number;
  logsThisWeek: number;
  logsByDay: Record<string, number>;
  topTopics: { topic: string; count: number }[];
  confidenceDistribution: number[];
  activeLoggers: { studentId: number; studentName: string; teacher: string; logCount: number; avgConfidence: number }[];
  inactiveStudents: { studentId: number; studentName: string; teacher: string; lastAssessment: string | null }[];
}

export function StudentEngagementTab({ excludeTestData = false }: { excludeTestData?: boolean }) {
  const { data: stats, isLoading } = useQuery<EngagementStats>({
    queryKey: ['adminStudentEngagement', excludeTestData],
    queryFn: async () => {
      const { data: logs, error } = await supabase
        .from('student_session_logs')
        .select('*')
        .order('session_date', { ascending: false });

      if (error) throw error;
      const rawLogs = (logs || []) as SessionLog[];
      const allLogs = excludeTestData
        ? rawLogs.filter(l => !TEST_TEACHER_USERNAMES.includes(l.teacher_username) && !TEST_STUDENT_IDS.includes(l.student_id))
        : rawLogs;

      const { data: allStudentsRaw } = await supabase
        .from('students')
        .select('id, teacher_username, last_seen, first_name, last_initial')
        .limit(5000);

      const allStudents = excludeTestData
        ? (allStudentsRaw || []).filter((s: any) => !TEST_TEACHER_USERNAMES.includes(s.teacher_username) && !isTestStudent(s.id, s.first_name))
        : (allStudentsRaw || []);

      const { data: recentAttemptsRaw } = await supabase
        .from('quiz_attempts')
        .select('student_id, teacher_username, completed_at')
        .order('completed_at', { ascending: false });

      const recentAttempts = excludeTestData
        ? (recentAttemptsRaw || []).filter((a: any) => !TEST_TEACHER_USERNAMES.includes(a.teacher_username) && !TEST_STUDENT_IDS.includes(a.student_id))
        : (recentAttemptsRaw || []);

      const studentNameMap = new Map<number, string>();
      allStudents.forEach((s: any) => {
        const name = [s.first_name, s.last_initial ? s.last_initial + '.' : ''].filter(Boolean).join(' ');
        studentNameMap.set(s.id, name || `#${s.id}`);
      });

      const uniqueStudentSet = new Set(allLogs.map(l => `${l.student_id}-${l.teacher_username}`));

      const confidenceRatings = allLogs.filter(l => l.confidence_rating).map(l => l.confidence_rating!);
      const avgConfidence = confidenceRatings.length > 0
        ? confidenceRatings.reduce((a, b) => a + b, 0) / confidenceRatings.length
        : 0;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const logsThisWeek = allLogs.filter(l => new Date(l.session_date) >= oneWeekAgo).length;

      const logsByDay: Record<string, number> = {};
      allLogs.forEach(l => {
        const day = new Date(l.session_date).toLocaleDateString('en-US', { weekday: 'short' });
        logsByDay[day] = (logsByDay[day] || 0) + 1;
      });

      const topicCounts: Record<string, number> = {};
      allLogs.forEach(l => {
        (l.topics_practiced || []).forEach(t => {
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        });
      });
      const topTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

      const confidenceDistribution = [0, 0, 0, 0, 0];
      confidenceRatings.forEach(r => {
        if (r >= 1 && r <= 5) confidenceDistribution[r - 1]++;
      });

      const studentLogMap = new Map<string, { count: number; totalConfidence: number; confCount: number }>();
      allLogs.forEach(l => {
        const key = `${l.student_id}-${l.teacher_username}`;
        const existing = studentLogMap.get(key) || { count: 0, totalConfidence: 0, confCount: 0 };
        existing.count++;
        if (l.confidence_rating) {
          existing.totalConfidence += l.confidence_rating;
          existing.confCount++;
        }
        studentLogMap.set(key, existing);
      });

      const activeLoggers = Array.from(studentLogMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 15)
        .map(([key, val]) => {
          const [studentId, ...teacherParts] = key.split('-');
          const teacher = teacherParts.join('-');
          const id = parseInt(studentId);
          return {
            studentId: id,
            studentName: studentNameMap.get(id) || `#${id}`,
            teacher,
            logCount: val.count,
            avgConfidence: val.confCount > 0 ? val.totalConfidence / val.confCount : 0,
          };
        });

      const studentsWithLogs = new Set(allLogs.map(l => `${l.student_id}-${l.teacher_username}`));
      const attemptMap = new Map<string, string>();
      recentAttempts.forEach((a: any) => {
        const key = `${a.student_id}-${a.teacher_username}`;
        if (!attemptMap.has(key)) attemptMap.set(key, a.completed_at);
      });

      const inactiveStudents = allStudents
        .filter((s: any) => !studentsWithLogs.has(`${s.id}-${s.teacher_username}`))
        .slice(0, 15)
        .map((s: any) => ({
          studentId: s.id,
          studentName: studentNameMap.get(s.id) || `#${s.id}`,
          teacher: s.teacher_username,
          lastAssessment: attemptMap.get(`${s.id}-${s.teacher_username}`) || null,
        }));

      return {
        totalLogs: allLogs.length,
        uniqueStudents: uniqueStudentSet.size,
        avgConfidence,
        logsThisWeek,
        logsByDay,
        topTopics,
        confidenceDistribution,
        activeLoggers,
        inactiveStudents,
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

  const maxTopicCount = stats.topTopics.length > 0 ? stats.topTopics[0].count : 1;
  const maxConfDist = Math.max(...stats.confidenceDistribution, 1);
  const confLabels = ['Not confident', 'A little', 'Somewhat', 'Confident', 'Very confident'];
  const confColors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-emerald-400'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} title="Log Entries" value={stats.totalLogs} color="bg-teal-50 text-teal-600" />
        <StatCard icon={Users} title="Unique Students" value={stats.uniqueStudents} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Star} title="Avg Confidence" value={stats.avgConfidence.toFixed(1) + '/5'} color="bg-amber-50 text-amber-600" />
        <StatCard icon={TrendingUp} title="Logs This Week" value={stats.logsThisWeek} color="bg-green-50 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="font-oswald text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Most Practiced Topics
          </h3>
          {stats.topTopics.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No topics recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.topTopics.map((t) => (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-40 truncate shrink-0" title={t.topic}>{t.topic}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className="bg-blue-500 h-5 rounded-full transition-all"
                      style={{ width: `${(t.count / maxTopicCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-500 w-8 text-right">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="font-oswald text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Confidence Distribution
          </h3>
          <div className="space-y-3">
            {stats.confidenceDistribution.map((count, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-28 shrink-0">{confLabels[idx]}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className={cn('h-6 rounded-full transition-all', confColors[idx])}
                    style={{ width: `${(count / maxConfDist) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="font-oswald text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Most Active Loggers
          </h3>
          {stats.activeLoggers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No session logs yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Teacher</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Logs</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">Avg Conf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.activeLoggers.map((s) => (
                    <tr key={`${s.studentId}-${s.teacher}`} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-800">{s.studentName}</td>
                      <td className="py-2 px-3 text-gray-600">@{s.teacher}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                          {s.logCount}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {s.avgConfidence > 0 ? (
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            s.avgConfidence >= 4 ? 'bg-green-50 text-green-700' :
                            s.avgConfidence >= 3 ? 'bg-yellow-50 text-yellow-700' :
                            'bg-red-50 text-red-700'
                          )}>
                            {s.avgConfidence.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="font-oswald text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-red-500" />
            Students With No Session Logs
          </h3>
          {stats.inactiveStudents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">All students have session logs!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Teacher</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Last Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.inactiveStudents.map((s) => (
                    <tr key={`${s.studentId}-${s.teacher}`} className="hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium text-gray-800">{s.studentName}</td>
                      <td className="py-2 px-3 text-gray-600">@{s.teacher}</td>
                      <td className="py-2 px-3 text-xs text-gray-400">
                        {s.lastAssessment ? new Date(s.lastAssessment).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, color }: { icon: React.ElementType; title: string; value: string | number; color: string }) {
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
