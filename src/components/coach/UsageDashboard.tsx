import React, { useState } from 'react';
import {
  BarChart3, Users, GraduationCap, AlertTriangle, Clock,
  ChevronRight
} from 'lucide-react';
import { CoachTeacher, CoachMentor } from '../../services/supabase/coachData';

interface Props {
  teachers: CoachTeacher[];
  mentors: CoachMentor[];
  onSelectTeacher: (username: string) => void;
  onSelectMentor: (mentorId: string) => void;
}

type Tab = 'teachers' | 'mentors' | 'program';

export function UsageDashboard({ teachers, mentors, onSelectTeacher, onSelectMentor }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('teachers');

  const totalStudents = teachers.reduce((s, t) => s + t.studentCount, 0);
  const totalAssessedThisWeek = teachers.reduce((s, t) => s + t.studentsAssessedThisWeek, 0);
  const assessedPct = totalStudents > 0 ? Math.round((totalAssessedThisWeek / totalStudents) * 100) : 0;

  const totalSessionsThisWeek = mentors.reduce((s, m) => s + m.sessionsThisWeek, 0);
  const totalMinutesThisWeek = mentors.reduce((s, m) => s + m.minutesThisWeek, 0);
  const avgPlanUsage = mentors.length > 0
    ? Math.round(mentors.reduce((s, m) => s + m.usedLessonPlanRate, 0) / mentors.length)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-oswald font-medium text-gray-800">Usage & Fidelity</h1>
        <p className="text-sm text-gray-500 mt-1">Activity and engagement metrics for your assigned staff</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Students Assessed</p>
          <p className="text-2xl font-semibold text-gray-800">{assessedPct}%</p>
          <p className="text-xs text-gray-400">{totalAssessedThisWeek} of {totalStudents} this week</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Active Teachers</p>
          <p className="text-2xl font-semibold text-gray-800">{teachers.filter(t => t.exitTicketsThisWeek > 0).length}/{teachers.length}</p>
          <p className="text-xs text-gray-400">created assessments this week</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Tutoring Minutes</p>
          <p className="text-2xl font-semibold text-gray-800">{totalMinutesThisWeek}</p>
          <p className="text-xs text-gray-400">{totalSessionsThisWeek} sessions this week</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Resource Fidelity</p>
          <p className="text-2xl font-semibold text-gray-800">{avgPlanUsage}%</p>
          <p className="text-xs text-gray-400">used a resource during sessions</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['teachers', 'mentors', 'program'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'program' ? 'Program View' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'teachers' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Teacher</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Last Login</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Logins</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Assessments (Week)</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Assessments (Total)</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">% Assessed</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Quizzes</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map(t => {
                  const pct = t.studentCount > 0 ? Math.round((t.studentsAssessedThisWeek / t.studentCount) * 100) : 0;
                  const daysSinceLogin = t.lastLogin
                    ? Math.floor((Date.now() - new Date(t.lastLogin).getTime()) / 86400000)
                    : null;

                  return (
                    <tr
                      key={t.username}
                      onClick={() => onSelectTeacher(t.username)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">{t.name}</p>
                          {daysSinceLogin !== null && daysSinceLogin > 7 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {t.lastLogin ? new Date(t.lastLogin).toLocaleDateString() : 'Never'}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">{t.loginCount}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`font-medium ${t.exitTicketsThisWeek > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {t.exitTicketsThisWeek}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">{t.exitTicketCount}</td>
                      <td className="px-5 py-3 text-center">
                        <PercentBar value={pct} />
                      </td>
                      <td className="px-5 py-3 text-center text-gray-600">{t.quizTemplateCount}</td>
                      <td className="px-5 py-3">
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'mentors' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Mentor</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">University</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Sessions (Week)</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Sessions (Total)</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Minutes (Week)</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Minutes (Total)</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Resource Fidelity</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Teachers</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mentors.map(m => (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMentor(m.id)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">{m.fullName}</p>
                        {m.sessionsThisWeek === 0 && m.sessionCount > 0 && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{m.university || '--'}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-medium ${m.sessionsThisWeek > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.sessionsThisWeek}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600">{m.sessionCount}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`font-medium ${m.minutesThisWeek >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {m.minutesThisWeek}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600">{m.totalMinutes}</td>
                    <td className="px-5 py-3 text-center">
                      <PercentBar value={m.usedLessonPlanRate} />
                    </td>
                    <td className="px-5 py-3 text-center text-gray-600">{m.assignedTeachers.length}</td>
                    <td className="px-5 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'program' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="font-medium text-gray-800 mb-4">Program Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Assessment Coverage</p>
                <div className="space-y-3">
                  {teachers.map(t => {
                    const pct = t.studentCount > 0 ? Math.round((t.studentsAssessedThisWeek / t.studentCount) * 100) : 0;
                    return (
                      <div key={t.username}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600 truncate">{t.name}</span>
                          <span className="text-gray-500">{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Impact by Mentor</p>
                <div className="space-y-3">
                  {mentors.map(m => (
                    <div key={m.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 truncate">{m.fullName}</span>
                        <span className="text-gray-500">{m.minutesThisWeek}min</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${m.minutesThisWeek >= 120 ? 'bg-emerald-500' : m.minutesThisWeek >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                          style={{ width: `${Math.min((m.minutesThisWeek / 180) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {mentors.length === 0 && <p className="text-xs text-gray-400">No mentors</p>}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Session Delivery Rate</p>
                <div className="flex items-center justify-center h-32">
                  <div className="text-center">
                    <p className="text-4xl font-semibold text-gray-800">
                      {mentors.filter(m => m.sessionsThisWeek > 0).length}
                    </p>
                    <p className="text-sm text-gray-500">of {mentors.length} mentors active</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {mentors.length > 0 ? Math.round((mentors.filter(m => m.sessionsThisWeek > 0).length / mentors.length) * 100) : 0}% delivery rate
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PercentBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs text-gray-600">{value}%</span>
    </div>
  );
}
