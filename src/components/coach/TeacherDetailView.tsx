import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Users, ClipboardCheck, BookOpen, Clock,
  TrendingUp, TrendingDown, Minus, Plus, X, Tag,
  MessageSquare, Target, GraduationCap, FileText
} from 'lucide-react';
import { Coach } from '../../types';
import {
  CoachTeacher, CoachMentor, TeacherStudentData, CoachNote, CoachGoal,
  getTeacherStudentData, getCoachNotes, addCoachNote, deleteCoachNote,
  getCoachGoals, addCoachGoal, updateCoachGoalStatus,
  addCoachTag, removeCoachTag, getTeacherWeeklyGroups
} from '../../services/supabase/coachData';
import { supabase } from '../../services/supabase/config';
import { SessionLogsList } from '../shared/SessionLogsList';
import { useStudentIdentifiers } from '../../hooks/useStudentIdentifiers';

interface Props {
  coach: Coach;
  teacher: CoachTeacher;
  mentors: CoachMentor[];
  onBack: () => void;
}

type DetailTab = 'students' | 'groups' | 'coaching';

export function TeacherDetailView({ coach, teacher, mentors, onBack }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>('students');
  const [students, setStudents] = useState<TeacherStudentData[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [goals, setGoals] = useState<CoachGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalDue, setGoalDue] = useState('');
  const [tags, setTags] = useState<{ id: string; tag: string }[]>([]);
  const [sessionLogCounts, setSessionLogCounts] = useState<Record<number, number>>({});
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const { getIdentifier } = useStudentIdentifiers(students.map((s) => s.studentId), teacher.username);

  useEffect(() => {
    loadDetails();
  }, [teacher.username]);

  const loadDetails = async () => {
    setIsLoading(true);
    try {
      const [s, g, n, gl, tagData] = await Promise.all([
        getTeacherStudentData(teacher.username),
        getTeacherWeeklyGroups(teacher.username),
        getCoachNotes(coach.id, 'teacher', teacher.username),
        getCoachGoals(coach.id, 'teacher', teacher.username),
        supabase.from('coach_tags').select('id, tag').eq('coach_id', coach.id).eq('target_type', 'teacher').eq('target_id', teacher.username)
      ]);
      setStudents(s);
      setGroups(g);
      setNotes(n);
      setGoals(gl);
      setTags((tagData.data || []).map((t: any) => ({ id: t.id, tag: t.tag })));

      const { data: logData } = await supabase
        .from('student_session_logs')
        .select('student_id')
        .eq('teacher_username', teacher.username);
      const counts: Record<number, number> = {};
      (logData || []).forEach((row: any) => {
        counts[row.student_id] = (counts[row.student_id] || 0) + 1;
      });
      setSessionLogCounts(counts);
    } catch (err) {
      console.error('Failed to load teacher details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      const note = await addCoachNote(coach.id, 'teacher', teacher.username, newNote.trim());
      setNotes(prev => [note, ...prev]);
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteCoachNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleAddGoal = async () => {
    if (!goalTitle.trim()) return;
    try {
      const goal = await addCoachGoal(coach.id, 'teacher', teacher.username, goalTitle.trim(), goalDesc.trim(), goalDue || undefined);
      setGoals(prev => [goal, ...prev]);
      setGoalTitle('');
      setGoalDesc('');
      setGoalDue('');
      setShowGoalForm(false);
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  const handleGoalStatus = async (goalId: string, status: 'active' | 'completed' | 'cancelled') => {
    try {
      await updateCoachGoalStatus(goalId, status);
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status } : g));
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      await addCoachTag(coach.id, 'teacher', teacher.username, newTag.trim());
      const { data } = await supabase.from('coach_tags').select('id, tag').eq('coach_id', coach.id).eq('target_type', 'teacher').eq('target_id', teacher.username);
      setTags((data || []).map((t: any) => ({ id: t.id, tag: t.tag })));
      setNewTag('');
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleExpandStudent = async (studentId: number) => {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      setExpandedLogs([]);
      return;
    }
    setExpandedStudent(studentId);
    setIsLoadingLogs(true);
    try {
      const { data } = await supabase
        .from('student_session_logs')
        .select('*')
        .eq('student_id', studentId)
        .eq('teacher_username', teacher.username)
        .order('session_date', { ascending: false })
        .limit(10);
      setExpandedLogs(data || []);
    } catch {
      setExpandedLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeCoachTag(tagId);
      setTags(prev => prev.filter(t => t.id !== tagId));
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  const assessedPct = teacher.studentCount > 0
    ? Math.round((teacher.studentsAssessedThisWeek / teacher.studentCount) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Roster
      </button>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center">
              <span className="text-teal-700 font-semibold text-lg">
                {teacher.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-xl font-oswald font-medium text-gray-800">{teacher.name}</h1>
              <p className="text-sm text-gray-400">@{teacher.username}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {tags.map(t => (
                  <span key={t.id} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                    <Tag className="w-3 h-3" />
                    {t.tag}
                    <button onClick={() => handleRemoveTag(t.id)} className="hover:text-amber-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    placeholder="Add tag..."
                    className="text-xs border border-gray-200 rounded px-2 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MiniStat icon={Users} label="Students" value={teacher.studentCount} />
            <MiniStat icon={ClipboardCheck} label="This Week" value={teacher.exitTicketsThisWeek} />
            <MiniStat icon={BookOpen} label="Assessed %" value={`${assessedPct}%`} />
            <MiniStat icon={Clock} label="Last Login" value={teacher.lastLogin ? new Date(teacher.lastLogin).toLocaleDateString() : 'Never'} />
          </div>
        </div>

        {mentors.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Assigned Mentors</p>
            <div className="flex items-center gap-3 flex-wrap">
              {mentors.map(m => (
                <div key={m.id} className="flex items-center gap-2 bg-blue-50 rounded-full px-3 py-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">{m.fullName}</span>
                  <span className="text-xs text-blue-500">{m.minutesThisWeek}min/wk</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['students', 'groups', 'coaching'] as DetailTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
              activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'coaching' ? 'Notes & Goals' : tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : activeTab === 'students' ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {students.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No students found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-5 py-3 font-medium text-gray-600">ID</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Grade</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Subject</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Assessments</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Avg Score</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Recent</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Trend</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Struggle Areas</th>
                    <th className="text-center px-5 py-3 font-medium text-gray-600">Session Logs</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">Last Assessed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map(s => (
                    <React.Fragment key={s.studentId}>
                      <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => handleExpandStudent(s.studentId)}>
                        <td className="px-5 py-3 font-medium text-gray-800">{getIdentifier(s.studentId)}</td>
                        <td className="px-5 py-3 text-gray-600">{s.gradeLevel}</td>
                        <td className="px-5 py-3 text-gray-600">{s.subject}</td>
                        <td className="px-5 py-3 text-center text-gray-700">{s.totalExitTickets}</td>
                        <td className="px-5 py-3 text-center">
                          <ScoreBadge score={s.avgScore} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          {s.recentScore !== null ? <ScoreBadge score={s.recentScore} /> : <span className="text-gray-300">--</span>}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <TrendIcon trend={s.trend} />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {s.struggledAreas.slice(0, 3).map(area => (
                              <span key={area} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                                {area}
                              </span>
                            ))}
                            {s.struggledAreas.length > 3 && (
                              <span className="text-xs text-gray-400">+{s.struggledAreas.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {sessionLogCounts[s.studentId] ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                              <FileText className="w-3 h-3" />
                              {sessionLogCounts[s.studentId]}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">0</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-400">
                          {s.lastAssessed ? new Date(s.lastAssessed).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                      {expandedStudent === s.studentId && (
                        <tr>
                          <td colSpan={10} className="px-5 py-4 bg-gray-50 border-t border-b border-gray-100">
                            <div className="max-w-2xl">
                              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-teal-600" />
                                Session Logs for {getIdentifier(s.studentId)}
                              </h4>
                              <SessionLogsList logs={expandedLogs} isLoading={isLoadingLogs} compact emptyMessage="No session logs from this student." />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'groups' ? (
        <div className="space-y-4">
          {groups.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400 text-sm">
              No weekly groups found
            </div>
          ) : (
            groups.map(g => (
              <div key={g.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      Week of {new Date(g.week_start_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400">{(g.students || []).length} students</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(g.focus_areas || []).map((area: string) => (
                    <span key={area} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                      {area}
                    </span>
                  ))}
                </div>
                {g.recommended_approach && (
                  <p className="text-xs text-gray-500 bg-gray-50 rounded p-3">{g.recommended_approach}</p>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium text-gray-800">Coach Notes</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Add a note..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {notes.map(n => (
                <div key={n.id} className="bg-white border border-gray-200 rounded-lg p-3 group">
                  <div className="flex justify-between items-start">
                    <p className="text-sm text-gray-700">{n.content}</p>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))}
              {notes.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No notes yet</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-800">Coaching Goals</h3>
              </div>
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="text-sm text-teal-600 hover:text-teal-700 font-medium"
              >
                {showGoalForm ? 'Cancel' : '+ Add Goal'}
              </button>
            </div>
            {showGoalForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <input
                  type="text"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  placeholder="Goal title"
                  className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <textarea
                  value={goalDesc}
                  onChange={e => setGoalDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={goalDue}
                    onChange={e => setGoalDue(e.target.value)}
                    className="text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <button
                    onClick={handleAddGoal}
                    disabled={!goalTitle.trim()}
                    className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700 disabled:opacity-50"
                  >
                    Save Goal
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {goals.map(g => (
                <div key={g.id} className={`bg-white border rounded-lg p-3 ${g.status === 'completed' ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-medium ${g.status === 'completed' ? 'text-emerald-700 line-through' : 'text-gray-800'}`}>
                        {g.title}
                      </p>
                      {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                      {g.dueDate && <p className="text-xs text-gray-400 mt-1">Due: {new Date(g.dueDate).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {g.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleGoalStatus(g.id, 'completed')}
                            className="text-xs text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => handleGoalStatus(g.id, 'cancelled')}
                            className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {goals.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No goals set</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="text-center">
      <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
      <p className="text-lg font-semibold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>{score}%</span>;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500 mx-auto" />;
  return <Minus className="w-4 h-4 text-gray-400 mx-auto" />;
}
