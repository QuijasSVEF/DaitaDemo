import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, Clock, ChevronRight, LogOut, Clipboard as ClipboardEdit, CalendarClock, Filter } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { CollegeMentor } from './MentorLogin';
import { GroupDetailView } from './GroupDetailView';
import { Button } from '../ui/Button';
import { AdHocSessionModal } from './AdHocSessionModal';
import { AdHocSessionsView } from './AdHocSessionsView';

interface Props {
  mentor: CollegeMentor;
  onSignOut: () => void;
}

interface MentorGroup {
  id: string;
  name: string;
  description: string | null;
  grade_level: string | null;
  subject: string;
  status: string;
  teacher_username: string;
  teacher_name: string;
  teacher_email: string;
  student_count: number;
  recent_session_date: string | null;
}

export function MentorDashboard({ mentor, onSignOut }: Props) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [adHocModalOpen, setAdHocModalOpen] = useState(false);
  const [viewingAdHoc, setViewingAdHoc] = useState(false);
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [weekFilter, setWeekFilter] = useState<string>('all');

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['mentorGroups', mentor.id],
    queryFn: async () => {
      const { data: assignments, error: assignError } = await supabase
        .from('mentor_group_assignments')
        .select(`
          group_id,
          mentor_groups (
            id,
            name,
            description,
            grade_level,
            subject,
            status,
            teacher_username,
            teachers (
              name,
              email
            )
          )
        `)
        .eq('mentor_id', mentor.id);

      if (assignError) throw assignError;

      const groupsWithDetails = await Promise.all(
        (assignments || []).map(async (assignment: any) => {
          const group = assignment.mentor_groups;

          const { count: studentCount } = await supabase
            .from('mentor_group_students')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          const { data: recentSession } = await supabase
            .from('mentor_sessions')
            .select('session_date')
            .eq('group_id', group.id)
            .eq('mentor_id', mentor.id)
            .order('session_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: group.id,
            name: group.name,
            description: group.description,
            grade_level: group.grade_level,
            subject: group.subject,
            status: group.status,
            teacher_username: group.teacher_username,
            teacher_name: group.teachers?.name || 'Unknown',
            teacher_email: group.teachers?.email || '',
            student_count: studentCount || 0,
            recent_session_date: recentSession?.session_date || null
          };
        })
      );

      // Sort by week date descending (most recent first)
      groupsWithDetails.sort((a, b) => {
        const dateA = a.name.match(/Week (\d{4}-\d{2}-\d{2})/)?.[1] || '';
        const dateB = b.name.match(/Week (\d{4}-\d{2}-\d{2})/)?.[1] || '';
        return dateB.localeCompare(dateA);
      });

      return groupsWithDetails as MentorGroup[];
    },
    refetchInterval: 30000
  });

  const activeGroups = groups.filter(g => g.status === 'active');
  const inactiveGroups = groups.filter(g => g.status !== 'active');

  const teacherOptions = useMemo(() => {
    const names = [...new Set(activeGroups.map(g => g.teacher_name))].sort();
    return names;
  }, [activeGroups]);

  const weekOptions = useMemo(() => {
    const weeks = [...new Set(
      activeGroups
        .map(g => g.name.match(/Week (\d{4}-\d{2}-\d{2})/)?.[1])
        .filter(Boolean)
    )].sort((a, b) => b!.localeCompare(a!)) as string[];
    return weeks;
  }, [activeGroups]);

  const filteredActiveGroups = useMemo(() => {
    let filtered = activeGroups;
    if (teacherFilter !== 'all') {
      filtered = filtered.filter(g => g.teacher_name === teacherFilter);
    }
    if (weekFilter !== 'all') {
      filtered = filtered.filter(g => g.name.includes(`Week ${weekFilter}`));
    }
    return filtered;
  }, [activeGroups, teacherFilter, weekFilter]);

  if (selectedGroupId) {
    const selectedGroup = groups.find(g => g.id === selectedGroupId);
    if (selectedGroup) {
      return (
        <GroupDetailView
          mentor={mentor}
          group={selectedGroup}
          onBack={() => setSelectedGroupId(null)}
        />
      );
    }
  }

  if (viewingAdHoc) {
    return (
      <AdHocSessionsView
        mentor={mentor}
        onBack={() => setViewingAdHoc(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-oswald font-bold text-gray-900">
                  College Mentor Dashboard
                </h1>
                <p className="text-sm text-gray-600">Welcome, {mentor.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button
                onClick={() => setAdHocModalOpen(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <ClipboardEdit className="w-4 h-4" />
                <span>Log Ad-Hoc Session</span>
              </Button>
              <Button
                onClick={() => setViewingAdHoc(true)}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <CalendarClock className="w-4 h-4" />
                <span>Ad-Hoc Sessions</span>
              </Button>
              <Button
                onClick={onSignOut}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading your groups...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Assigned</h3>
            <p className="text-gray-600">
              You don't have any student groups assigned yet.
              <br />
              Please contact your program coordinator.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeGroups.length > 0 && (
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className="text-xl font-oswald font-semibold text-gray-900">
                    Active Groups ({filteredActiveGroups.length})
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-4 h-4 text-gray-400" />
                    </div>
                    <select
                      value={teacherFilter}
                      onChange={e => setTeacherFilter(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Teachers</option>
                      {teacherOptions.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={weekFilter}
                      onChange={e => setWeekFilter(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Weeks</option>
                      {weekOptions.map(week => {
                        const d = new Date(week + 'T00:00:00');
                        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        return <option key={week} value={week}>Week of {label}</option>;
                      })}
                    </select>
                  </div>
                </div>
                {filteredActiveGroups.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredActiveGroups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        onClick={() => setSelectedGroupId(group.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-white rounded-lg shadow-sm">
                    <p className="text-gray-500 text-sm">No groups match the selected filters.</p>
                  </div>
                )}
              </section>
            )}

            {inactiveGroups.length > 0 && (
              <section>
                <h2 className="text-xl font-oswald font-semibold text-gray-500 mb-4">
                  Inactive Groups ({inactiveGroups.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inactiveGroups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onClick={() => setSelectedGroupId(group.id)}
                      inactive
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {adHocModalOpen && (
        <AdHocSessionModal
          mentor={mentor}
          onClose={() => setAdHocModalOpen(false)}
        />
      )}
    </div>
  );
}

interface GroupCardProps {
  group: MentorGroup;
  onClick: () => void;
  inactive?: boolean;
}

function GroupCard({ group, onClick, inactive }: GroupCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        bg-white rounded-lg shadow-sm p-6 text-left transition-all hover:shadow-md
        ${inactive ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{group.name}</h3>
          {group.grade_level && (
            <p className="text-sm text-gray-600">Grade {group.grade_level}</p>
          )}
        </div>
        <div className={`
          px-3 py-1 rounded-full text-xs font-medium
          ${group.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
        `}>
          {group.status}
        </div>
      </div>

      {group.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{group.description}</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Users className="w-4 h-4 mr-2" />
          <span>{group.student_count} student{group.student_count !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <BookOpen className="w-4 h-4 mr-2" />
          <span>{group.subject}</span>
        </div>
        {group.recent_session_date && (
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>Last session: {new Date(group.recent_session_date).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-1">Teacher</p>
        <p className="text-sm font-medium text-gray-900">{group.teacher_name}</p>
      </div>

      <div className="mt-4 flex items-center justify-end text-blue-600 text-sm font-medium">
        <span>View Details</span>
        <ChevronRight className="w-4 h-4 ml-1" />
      </div>
    </button>
  );
}
