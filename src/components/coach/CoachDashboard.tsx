import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Users, BarChart3, BookOpen, MessageSquare,
  Bell, LogOut, ChevronLeft, Shield, RefreshCw, FileText, TrendingUp
} from 'lucide-react';
import { Coach } from '../../types';
import {
  CoachTeacher, CoachMentor, CoachAlert,
  getCoachTeachers, getCoachMentors, getCoachAlerts
} from '../../services/supabase/coachData';
import { CoachOverview } from './CoachOverview';
import { CoachRoster } from './CoachRoster';
import { TeacherDetailView } from './TeacherDetailView';
import { UsageDashboard } from './UsageDashboard';
import { StudentDataView } from './StudentDataView';
import { SessionQualityView } from './SessionQualityView';
import { CoachingTools } from './CoachingTools';
import { AlertsView } from './AlertsView';
import { AggregatedReports } from './AggregatedReports';

type View = 'overview' | 'roster' | 'usage' | 'students' | 'sessions' | 'tools' | 'alerts' | 'reports';

interface Props {
  coach: Coach;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'usage', label: 'Usage & Fidelity', icon: BarChart3 },
  { id: 'students', label: 'Student Data', icon: BookOpen },
  { id: 'sessions', label: 'Sessions', icon: FileText },
  { id: 'tools', label: 'Coaching Tools', icon: MessageSquare },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
  { id: 'alerts', label: 'Alerts', icon: Bell },
];

export function CoachDashboard({ coach, onSignOut }: Props) {
  const [currentView, setCurrentView] = useState<View>('overview');
  const [teachers, setTeachers] = useState<CoachTeacher[]>([]);
  const [mentors, setMentors] = useState<CoachMentor[]>([]);
  const [alerts, setAlerts] = useState<CoachAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [t, m] = await Promise.all([
        getCoachTeachers(coach.id),
        getCoachMentors(coach.id)
      ]);
      setTeachers(t);
      setMentors(m);
      const a = await getCoachAlerts(coach.id, t, m);
      setAlerts(a);
    } catch (err) {
      console.error('Failed to load coach data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [coach.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectTeacher = (username: string) => {
    setSelectedTeacher(username);
    setCurrentView('roster');
  };

  const handleSelectMentor = (_mentorId: string) => {
    setCurrentView('sessions');
  };

  const handleBackToRoster = () => {
    setSelectedTeacher(null);
  };

  const totalAlertCount = alerts.filter(a => a.type === 'danger' || a.type === 'warning').length;

  const renderContent = () => {
    if (selectedTeacher) {
      const teacher = teachers.find(t => t.username === selectedTeacher);
      if (teacher) {
        return (
          <TeacherDetailView
            coach={coach}
            teacher={teacher}
            mentors={mentors.filter(m => m.assignedTeachers.includes(teacher.username))}
            onBack={handleBackToRoster}
          />
        );
      }
    }

    switch (currentView) {
      case 'overview':
        return (
          <CoachOverview
            teachers={teachers}
            mentors={mentors}
            alerts={alerts}
            isLoading={isLoading}
            onSelectTeacher={handleSelectTeacher}
            onSelectMentor={handleSelectMentor}
            onViewAlerts={() => setCurrentView('alerts')}
          />
        );
      case 'roster':
        return (
          <CoachRoster
            coach={coach}
            teachers={teachers}
            mentors={mentors}
            onSelectTeacher={handleSelectTeacher}
            onSelectMentor={handleSelectMentor}
            onRefresh={loadData}
          />
        );
      case 'usage':
        return (
          <UsageDashboard
            teachers={teachers}
            mentors={mentors}
            onSelectTeacher={handleSelectTeacher}
            onSelectMentor={handleSelectMentor}
          />
        );
      case 'students':
        return (
          <StudentDataView
            teachers={teachers}
            onSelectTeacher={handleSelectTeacher}
          />
        );
      case 'sessions':
        return (
          <SessionQualityView
            mentors={mentors}
            onSelectMentor={handleSelectMentor}
          />
        );
      case 'tools':
        return (
          <CoachingTools
            coach={coach}
            teachers={teachers}
            mentors={mentors}
          />
        );
      case 'reports':
        return (
          <AggregatedReports
            teachers={teachers}
            mentors={mentors}
          />
        );
      case 'alerts':
        return (
          <AlertsView
            alerts={alerts}
            onSelectTeacher={handleSelectTeacher}
            onSelectMentor={handleSelectMentor}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-200 flex-shrink-0 ${sidebarCollapsed ? 'w-16' : 'w-60'}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <span className="font-oswald font-medium text-gray-800 text-sm truncate">Coach Portal</span>
              </div>
            )}
            {sidebarCollapsed && <Shield className="w-5 h-5 text-teal-600 mx-auto" />}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0"
            >
              <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {!sidebarCollapsed && (
            <p className="text-xs text-gray-500 mt-1 truncate">{coach.fullName}</p>
          )}
        </div>

        <nav className="flex-1 py-2">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id && !selectedTeacher;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setSelectedTeacher(null);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-medium border-r-2 border-teal-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
                {item.id === 'alerts' && totalAlertCount > 0 && (
                  <span className={`${sidebarCollapsed ? 'absolute top-1 right-1' : 'ml-auto'} bg-red-500 text-white text-xs font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1`}>
                    {totalAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 space-y-1">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {!sidebarCollapsed && <span>Refresh</span>}
          </button>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md"
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
