import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, Clock, User, BookOpen, Users, Plus } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { CollegeMentor } from './MentorLogin';
import { Button } from '../ui/Button';
import { AdHocSessionModal } from './AdHocSessionModal';

interface Props {
  mentor: CollegeMentor;
  onBack: () => void;
}

interface AdHocSession {
  id: string;
  session_date: string;
  resource_used: string | null;
  tutoring_minutes: number;
  ad_hoc_teacher_username: string | null;
  ad_hoc_grade_level: string | null;
  ad_hoc_subject: string | null;
  ad_hoc_student_names: string | null;
  lesson_plan_comments: string | null;
  curriculum_feedback: string | null;
  attendance_notes: string | null;
  ad_hoc_em_level_code: string | null;
  ad_hoc_em_module_id: string | null;
  ad_hoc_em_subtopic_id: string | null;
  teacher_name?: string;
  em_level_title?: string;
  em_module_title?: string;
  em_subtopic_title?: string;
}

function resourceLabel(value: string | null): string {
  if (value === 'data_lesson_plan' || value === 'lesson_plan') return 'D[ai]ta Lesson Plan';
  if (value === 'elevate_curriculum' || value === 'curriculum') return 'Elevate Curriculum';
  return 'Not specified';
}

export function AdHocSessionsView({ mentor, onBack }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['adHocSessions', mentor.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mentor_sessions')
        .select('*')
        .eq('mentor_id', mentor.id)
        .eq('is_ad_hoc', true)
        .order('session_date', { ascending: false });
      if (error) throw error;

      const usernames = Array.from(
        new Set(
          (data || [])
            .map((s: any) => s.ad_hoc_teacher_username)
            .filter((u: string | null): u is string => !!u)
        )
      );

      let teacherMap: Record<string, string> = {};
      if (usernames.length > 0) {
        const { data: teachers } = await supabase
          .from('teachers')
          .select('username, name')
          .in('username', usernames);
        teacherMap = Object.fromEntries((teachers || []).map((t: any) => [t.username, t.name]));
      }

      const levelCodes = Array.from(new Set((data || []).map((s: any) => s.ad_hoc_em_level_code).filter(Boolean))) as string[];
      const moduleIds = Array.from(new Set((data || []).map((s: any) => s.ad_hoc_em_module_id).filter(Boolean))) as string[];
      const subtopicIds = Array.from(new Set((data || []).map((s: any) => s.ad_hoc_em_subtopic_id).filter(Boolean))) as string[];

      const [levels, modules, subtopics] = await Promise.all([
        levelCodes.length
          ? supabase.from('em_levels').select('level_code, title').in('level_code', levelCodes)
          : Promise.resolve({ data: [] as any[] }),
        moduleIds.length
          ? supabase.from('em_modules').select('id, title').in('id', moduleIds)
          : Promise.resolve({ data: [] as any[] }),
        subtopicIds.length
          ? supabase.from('em_subtopics').select('id, title').in('id', subtopicIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const levelMap = Object.fromEntries(((levels as any).data || []).map((x: any) => [x.level_code, x.title]));
      const moduleMap = Object.fromEntries(((modules as any).data || []).map((x: any) => [x.id, x.title]));
      const subtopicMap = Object.fromEntries(((subtopics as any).data || []).map((x: any) => [x.id, x.title]));

      return (data || []).map((s: any) => ({
        ...s,
        teacher_name: s.ad_hoc_teacher_username
          ? teacherMap[s.ad_hoc_teacher_username] || s.ad_hoc_teacher_username
          : 'Unknown teacher',
        em_level_title: s.ad_hoc_em_level_code ? levelMap[s.ad_hoc_em_level_code] : undefined,
        em_module_title: s.ad_hoc_em_module_id ? moduleMap[s.ad_hoc_em_module_id] : undefined,
        em_subtopic_title: s.ad_hoc_em_subtopic_id ? subtopicMap[s.ad_hoc_em_subtopic_id] : undefined,
      })) as AdHocSession[];
    },
  });

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.tutoring_minutes || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <CalendarClock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-oswald font-bold text-gray-900">Ad-Hoc Sessions</h1>
                <p className="text-sm text-gray-600">
                  Sessions you logged outside of D[ai]ta weekly groups.
                </p>
              </div>
            </div>
            <Button
              onClick={() => setModalOpen(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              <span>New Ad-Hoc Session</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Sessions" value={sessions.length.toString()} />
          <StatCard
            label="Total HIT Minutes"
            value={totalMinutes.toString()}
            subtitle="High-Impact Tutoring"
          />
          <StatCard
            label="Unique Teachers"
            value={new Set(sessions.map((s) => s.ad_hoc_teacher_username).filter(Boolean)).size.toString()}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <CalendarClock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Ad-Hoc Sessions Yet</h3>
            <p className="text-gray-600 mb-4">
              Log a session for students who weren't placed in a weekly group.
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Log Your First Ad-Hoc Session
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-lg shadow-sm p-5 border border-gray-100"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(session.session_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        {resourceLabel(session.resource_used)}
                      </span>
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
                        Ad-Hoc
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Teacher: <span className="font-medium">{session.teacher_name}</span></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{session.tutoring_minutes} min</span>
                      </div>
                      {session.ad_hoc_grade_level && (
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <span>Grade {session.ad_hoc_grade_level}{session.ad_hoc_subject ? ` - ${session.ad_hoc_subject}` : ''}</span>
                        </div>
                      )}
                      {session.ad_hoc_student_names && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{session.ad_hoc_student_names}</span>
                        </div>
                      )}
                    </div>
                    {(session.em_level_title || session.em_module_title || session.em_subtopic_title) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {session.em_level_title && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                            {session.em_level_title}
                          </span>
                        )}
                        {session.em_module_title && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                            {session.em_module_title}
                          </span>
                        )}
                        {session.em_subtopic_title && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                            {session.em_subtopic_title}
                          </span>
                        )}
                      </div>
                    )}
                    {(session.lesson_plan_comments ||
                      session.curriculum_feedback ||
                      session.attendance_notes) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-sm">
                        {session.lesson_plan_comments && (
                          <p className="text-gray-700">
                            <span className="font-medium">Lesson plan notes: </span>
                            {session.lesson_plan_comments}
                          </p>
                        )}
                        {session.curriculum_feedback && (
                          <p className="text-gray-700">
                            <span className="font-medium">Curriculum feedback: </span>
                            {session.curriculum_feedback}
                          </p>
                        )}
                        {session.attendance_notes && (
                          <p className="text-gray-700">
                            <span className="font-medium">Notes: </span>
                            {session.attendance_notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen && (
        <AdHocSessionModal mentor={mentor} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-oswald font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
