import React from 'react';
import {
  Users, GraduationCap, ClipboardCheck, Clock, AlertTriangle,
  TrendingUp, ArrowRight, Bell
} from 'lucide-react';
import { CoachTeacher, CoachMentor, CoachAlert } from '../../services/supabase/coachData';

interface Props {
  teachers: CoachTeacher[];
  mentors: CoachMentor[];
  alerts: CoachAlert[];
  isLoading: boolean;
  onSelectTeacher: (username: string) => void;
  onSelectMentor: (mentorId: string) => void;
  onViewAlerts: () => void;
}

export function CoachOverview({ teachers, mentors, alerts, isLoading, onSelectTeacher, onSelectMentor, onViewAlerts }: Props) {
  const totalStudents = teachers.reduce((s, t) => s + t.studentCount, 0);
  const totalAssessmentsThisWeek = teachers.reduce((s, t) => s + t.exitTicketsThisWeek, 0);
  const totalSessionsThisWeek = mentors.reduce((s, m) => s + m.sessionsThisWeek, 0);
  const totalMinutesThisWeek = mentors.reduce((s, m) => s + m.minutesThisWeek, 0);
  const dangerAlerts = alerts.filter(a => a.type === 'danger');
  const warningAlerts = alerts.filter(a => a.type === 'warning');

  const activeTeachersThisWeek = teachers.filter(t => t.exitTicketsThisWeek > 0).length;
  const activeMentorsThisWeek = mentors.filter(m => m.sessionsThisWeek > 0).length;

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-oswald font-medium text-gray-800">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">This week's snapshot across your assigned teachers and mentors</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Teachers"
          value={teachers.length}
          subtitle={`${activeTeachersThisWeek} active this week`}
          color="teal"
        />
        <StatCard
          icon={GraduationCap}
          label="Mentors"
          value={mentors.length}
          subtitle={`${activeMentorsThisWeek} active this week`}
          color="blue"
        />
        <StatCard
          icon={ClipboardCheck}
          label="Assessments This Week"
          value={totalAssessmentsThisWeek}
          subtitle={`${totalStudents} total students`}
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="Tutoring This Week"
          value={`${totalMinutesThisWeek}m`}
          subtitle={`${totalSessionsThisWeek} sessions logged`}
          color="amber"
        />
      </div>

      {(dangerAlerts.length > 0 || warningAlerts.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-red-500" />
              <h2 className="font-medium text-gray-800">Needs Attention</h2>
              <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                {dangerAlerts.length + warningAlerts.length}
              </span>
            </div>
            <button
              onClick={onViewAlerts}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {[...dangerAlerts, ...warningAlerts].slice(0, 6).map(alert => (
              <button
                key={alert.id}
                onClick={() => alert.category === 'teacher' ? onSelectTeacher(alert.targetId) : onSelectMentor(alert.targetId)}
                className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
              >
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${alert.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{alert.targetName}</p>
                  <p className="text-xs text-gray-500 truncate">{alert.message}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  alert.category === 'teacher' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {alert.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-800">Teacher Activity</h2>
            <span className="text-xs text-gray-400">This week</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {teachers.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No teachers assigned</div>
            ) : (
              teachers
                .sort((a, b) => b.exitTicketsThisWeek - a.exitTicketsThisWeek)
                .map(t => (
                  <button
                    key={t.username}
                    onClick={() => onSelectTeacher(t.username)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.studentCount} students</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-gray-700">{t.exitTicketsThisWeek} assessments</p>
                      <p className="text-xs text-gray-400">
                        {t.studentCount > 0 ? Math.round((t.studentsAssessedThisWeek / t.studentCount) * 100) : 0}% assessed
                      </p>
                    </div>
                  </button>
                ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-medium text-gray-800">Mentor Activity</h2>
            <span className="text-xs text-gray-400">This week</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {mentors.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No mentors linked to your teachers</div>
            ) : (
              mentors
                .sort((a, b) => b.minutesThisWeek - a.minutesThisWeek)
                .map(m => (
                  <button
                    key={m.id}
                    onClick={() => onSelectMentor(m.id)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{m.fullName}</p>
                      <p className="text-xs text-gray-400">{m.university || 'No university'}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-gray-700">{m.minutesThisWeek}min</p>
                      <p className="text-xs text-gray-400">{m.sessionsThisWeek} sessions</p>
                    </div>
                  </button>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtitle, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
