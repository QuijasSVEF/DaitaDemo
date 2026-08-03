import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Clock, CheckCircle, XCircle, AlertTriangle,
  MessageSquare, Filter
} from 'lucide-react';
import { CoachMentor, MentorSessionData, getMentorSessions } from '../../services/supabase/coachData';

interface Props {
  mentors: CoachMentor[];
  onSelectMentor: (mentorId: string) => void;
}

export function SessionQualityView({ mentors, onSelectMentor }: Props) {
  const [sessions, setSessions] = useState<MentorSessionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMentor, setFilterMentor] = useState<string>('all');
  const [filterFlag, setFilterFlag] = useState<string>('all');
  const [filterDistrict, setFilterDistrict] = useState<string>('all');

  const districtOptions = useMemo(() => {
    const names = new Set<string>();
    for (const m of mentors) {
      for (const d of m.assignedDistricts) names.add(d);
    }
    return [...names].sort();
  }, [mentors]);

  const mentorsInDistrict = useMemo(() => {
    if (filterDistrict === 'all') return mentors;
    return mentors.filter(m => m.assignedDistricts.includes(filterDistrict));
  }, [mentors, filterDistrict]);

  useEffect(() => {
    loadSessions();
  }, [mentors]);

  const loadSessions = async () => {
    if (mentors.length === 0) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await getMentorSessions(mentors.map(m => m.id));
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const flaggedSessions = sessions.filter(s => {
    if (s.tutoringMinutes < 15) return true;
    if (!s.usedLessonPlan && !s.resourceUsed) return true;
    return false;
  });

  const filtered = sessions.filter(s => {
    if (filterDistrict !== 'all') {
      const mentor = mentors.find(m => m.id === s.mentorId);
      if (!mentor || !mentor.assignedDistricts.includes(filterDistrict)) return false;
    }
    if (filterMentor !== 'all' && s.mentorId !== filterMentor) return false;
    if (filterFlag === 'flagged') {
      return s.tutoringMinutes < 15 || (!s.usedLessonPlan && !s.resourceUsed);
    }
    if (filterFlag === 'no-plan') return !s.usedLessonPlan && !s.resourceUsed;
    if (filterFlag === 'short') return s.tutoringMinutes < 15;
    return true;
  });

  const avgMinutes = sessions.length > 0
    ? Math.round(sessions.reduce((s, sess) => s + sess.tutoringMinutes, 0) / sessions.length)
    : 0;

  const planUsageRate = sessions.length > 0
    ? Math.round((sessions.filter(s => s.usedLessonPlan || !!s.resourceUsed).length / sessions.length) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-oswald font-medium text-gray-800">Session Quality</h1>
        <p className="text-sm text-gray-500 mt-1">Review mentor session logs, lesson plan usage, and flagged sessions</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Sessions</p>
          <p className="text-2xl font-semibold text-gray-800">{sessions.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Avg Duration</p>
          <p className="text-2xl font-semibold text-gray-800">{avgMinutes}min</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Plan Usage</p>
          <p className="text-2xl font-semibold text-gray-800">{planUsageRate}%</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Flagged Sessions</p>
          <p className={`text-2xl font-semibold ${flaggedSessions.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {flaggedSessions.length}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterDistrict}
            onChange={e => { setFilterDistrict(e.target.value); setFilterMentor('all'); }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="all">All Districts</option>
            {districtOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <select
          value={filterMentor}
          onChange={e => setFilterMentor(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        >
          <option value="all">All Mentors</option>
          {mentorsInDistrict.map(m => (
            <option key={m.id} value={m.id}>{m.fullName}</option>
          ))}
        </select>
        <select
          value={filterFlag}
          onChange={e => setFilterFlag(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
        >
          <option value="all">All Sessions</option>
          <option value="flagged">Flagged Only</option>
          <option value="no-plan">No Resource Used</option>
          <option value="short">Too Short (&lt;15min)</option>
        </select>
        <span className="text-xs text-gray-400">{filtered.length} sessions</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              {sessions.length === 0 ? 'No sessions logged yet' : 'No sessions match your filters'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filtered.map(s => {
                const flags: string[] = [];
                if (s.tutoringMinutes < 15) flags.push('Too short');
                if (!s.usedLessonPlan && !s.resourceUsed) flags.push('No resource');

                return (
                  <div key={s.id} className="px-5 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-800">{s.mentorName}</p>
                          <span className="text-xs text-gray-400">
                            {new Date(s.sessionDate).toLocaleDateString()}
                          </span>
                          {flags.length > 0 && (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {s.tutoringMinutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            {s.usedLessonPlan || s.resourceUsed === 'data_lesson_plan' ? (
                              <><CheckCircle className="w-3 h-3 text-emerald-500" /> D[ai]TA Lesson Plan</>
                            ) : s.resourceUsed === 'elevate_curriculum' ? (
                              <><CheckCircle className="w-3 h-3 text-blue-500" /> Elevate Curriculum</>
                            ) : (
                              <><XCircle className="w-3 h-3 text-red-400" /> No resource used</>
                            )}
                          </span>
                          {s.isAdHoc && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Ad-hoc</span>
                          )}
                        </div>
                        {(s.lessonPlanComments || s.curriculumFeedback || s.attendanceNotes) && (
                          <div className="mt-2 space-y-1">
                            {s.lessonPlanComments && (
                              <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                                <span className="font-medium">Comments:</span> {s.lessonPlanComments}
                              </p>
                            )}
                            {s.curriculumFeedback && (
                              <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                                <span className="font-medium">Feedback:</span> {s.curriculumFeedback}
                              </p>
                            )}
                            {s.attendanceNotes && (
                              <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">
                                <span className="font-medium">Attendance:</span> {s.attendanceNotes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {flags.map(f => (
                          <span key={f} className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
