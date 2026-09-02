import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Target, Tag, Plus, X, ChevronDown, Check, Eye, EyeOff
} from 'lucide-react';
import { Coach } from '../../types';
import {
  CoachTeacher, CoachMentor, CoachNote, CoachGoal,
  getCoachNotes, addCoachNote, deleteCoachNote,
  getCoachGoals, addCoachGoal, updateCoachGoalStatus,
  addCoachTag, removeCoachTag
} from '../../services/supabase/coachData';
import { supabase } from '../../services/supabase/config';

interface Props {
  coach: Coach;
  teachers: CoachTeacher[];
  mentors: CoachMentor[];
}

type ToolTab = 'notes' | 'goals' | 'tags';

export function CoachingTools({ coach, teachers, mentors }: Props) {
  const [activeTab, setActiveTab] = useState<ToolTab>('notes');
  const [notes, setNotes] = useState<CoachNote[]>([]);
  const [goals, setGoals] = useState<CoachGoal[]>([]);
  const [allTags, setAllTags] = useState<{ id: string; targetType: string; targetId: string; tag: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [newNoteTarget, setNewNoteTarget] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTarget, setGoalTarget] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalDue, setGoalDue] = useState('');
  const [goalFilter, setGoalFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [newTagTarget, setNewTagTarget] = useState('');
  const [newTagText, setNewTagText] = useState('');

  useEffect(() => {
    loadData();
  }, [coach.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [n, g, { data: tags }] = await Promise.all([
        getCoachNotes(coach.id),
        getCoachGoals(coach.id),
        supabase.from('coach_tags').select('*').eq('coach_id', coach.id)
      ]);
      setNotes(n);
      setGoals(g);
      setAllTags((tags || []).map((t: any) => ({ id: t.id, targetType: t.target_type, targetId: t.target_id, tag: t.tag })));
    } catch (err) {
      console.error('Failed to load coaching tools data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const allTargets = [
    ...teachers.map(t => ({ id: t.username, name: t.name, type: 'teacher' as const })),
    ...mentors.map(m => ({ id: m.id, name: m.fullName, type: 'mentor' as const }))
  ];

  const getTargetName = (targetType: string, targetId: string) => {
    if (targetType === 'teacher') return teachers.find(t => t.username === targetId)?.name || targetId;
    return mentors.find(m => m.id === targetId)?.fullName || targetId;
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !newNoteTarget) return;
    const target = allTargets.find(t => `${t.type}:${t.id}` === newNoteTarget);
    if (!target) return;
    try {
      const note = await addCoachNote(coach.id, target.type, target.id, newNoteContent.trim());
      setNotes(prev => [note, ...prev]);
      setNewNoteContent('');
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
    if (!goalTitle.trim() || !goalTarget) return;
    const target = allTargets.find(t => `${t.type}:${t.id}` === goalTarget);
    if (!target) return;
    try {
      const goal = await addCoachGoal(coach.id, target.type, target.id, goalTitle.trim(), goalDesc.trim(), goalDue || undefined);
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
    if (!newTagText.trim() || !newTagTarget) return;
    const target = allTargets.find(t => `${t.type}:${t.id}` === newTagTarget);
    if (!target) return;
    try {
      await addCoachTag(coach.id, target.type, target.id, newTagText.trim());
      const { data: tags } = await supabase.from('coach_tags').select('*').eq('coach_id', coach.id);
      setAllTags((tags || []).map((t: any) => ({ id: t.id, targetType: t.target_type, targetId: t.target_id, tag: t.tag })));
      setNewTagText('');
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleToggleNoteVisibility = async (noteId: string, currentVisible: boolean) => {
    try {
      await supabase
        .from('coach_notes')
        .update({ visible_to_teacher: !currentVisible })
        .eq('id', noteId);
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, visibleToTeacher: !currentVisible } : n));
    } catch (err) {
      console.error('Failed to toggle note visibility:', err);
    }
  };

  const handleToggleGoalVisibility = async (goalId: string, field: 'visible_to_teacher' | 'visible_to_mentor', currentValue: boolean) => {
    try {
      await supabase
        .from('coaching_goals')
        .update({ [field]: !currentValue })
        .eq('id', goalId);
      const key = field === 'visible_to_teacher' ? 'visibleToTeacher' : 'visibleToMentor';
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, [key]: !currentValue } : g));
    } catch (err) {
      console.error('Failed to toggle goal visibility:', err);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      await removeCoachTag(tagId);
      setAllTags(prev => prev.filter(t => t.id !== tagId));
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  const filteredGoals = goals.filter(g => {
    if (goalFilter === 'all') return true;
    return g.status === goalFilter;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-oswald font-medium text-gray-800">Coaching Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Notes, goals, and tags for your teachers and mentors</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['notes', 'goals', 'tags'] as ToolTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize flex items-center gap-2 ${
              activeTab === tab ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'notes' && <MessageSquare className="w-4 h-4" />}
            {tab === 'goals' && <Target className="w-4 h-4" />}
            {tab === 'tags' && <Tag className="w-4 h-4" />}
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      ) : activeTab === 'notes' ? (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex gap-3">
              <select
                value={newNoteTarget}
                onChange={e => setNewNoteTarget(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="">Select person...</option>
                <optgroup label="Teachers">
                  {teachers.map(t => (
                    <option key={t.username} value={`teacher:${t.username}`}>{t.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Mentors">
                  {mentors.map(m => (
                    <option key={m.id} value={`mentor:${m.id}`}>{m.fullName}</option>
                  ))}
                </optgroup>
              </select>
              <input
                type="text"
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                placeholder="Write a note..."
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNoteContent.trim() || !newNoteTarget}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {notes.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
                No notes yet. Add your first note above.
              </div>
            ) : (
              notes.map(n => (
                <div key={n.id} className="bg-white rounded-lg border border-gray-200 p-4 group">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${n.targetType === 'teacher' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>
                          {n.targetType}
                        </span>
                        <span className="text-xs font-medium text-gray-700">{getTargetName(n.targetType, n.targetId)}</span>
                        <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-700">{n.content}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={() => handleToggleNoteVisibility(n.id, !!(n as any).visibleToTeacher)}
                        className={`p-1.5 rounded transition-colors ${(n as any).visibleToTeacher ? 'text-teal-600 bg-teal-50 hover:bg-teal-100' : 'text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100'}`}
                        title={(n as any).visibleToTeacher ? 'Visible to teacher - click to hide' : 'Hidden from teacher - click to share'}
                      >
                        {(n as any).visibleToTeacher ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1.5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'goals' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['active', 'completed', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setGoalFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize ${goalFilter === f ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGoalForm(!showGoalForm)}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> {showGoalForm ? 'Cancel' : 'New Goal'}
            </button>
          </div>

          {showGoalForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <select
                value={goalTarget}
                onChange={e => setGoalTarget(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="">Select person...</option>
                <optgroup label="Teachers">
                  {teachers.map(t => (
                    <option key={t.username} value={`teacher:${t.username}`}>{t.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Mentors">
                  {mentors.map(m => (
                    <option key={m.id} value={`mentor:${m.id}`}>{m.fullName}</option>
                  ))}
                </optgroup>
              </select>
              <input
                type="text"
                value={goalTitle}
                onChange={e => setGoalTitle(e.target.value)}
                placeholder="Goal title (e.g., Increase weekly assessment count to 5)"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <textarea
                value={goalDesc}
                onChange={e => setGoalDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={goalDue}
                  onChange={e => setGoalDue(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <button
                  onClick={handleAddGoal}
                  disabled={!goalTitle.trim() || !goalTarget}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
                >
                  Save Goal
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredGoals.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
                No {goalFilter !== 'all' ? goalFilter : ''} goals found
              </div>
            ) : (
              filteredGoals.map(g => (
                <div key={g.id} className={`bg-white rounded-lg border p-4 ${g.status === 'completed' ? 'border-emerald-200 bg-emerald-50/20' : g.status === 'cancelled' ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${g.targetType === 'teacher' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>
                          {g.targetType}
                        </span>
                        <span className="text-xs font-medium text-gray-700">{getTargetName(g.targetType, g.targetId)}</span>
                      </div>
                      <p className={`text-sm font-medium ${g.status === 'completed' ? 'text-emerald-700 line-through' : g.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {g.title}
                      </p>
                      {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                      {g.dueDate && <p className="text-xs text-gray-400 mt-1">Due: {new Date(g.dueDate).toLocaleDateString()}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleToggleGoalVisibility(g.id, 'visible_to_teacher', !!(g as any).visibleToTeacher)}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${(g as any).visibleToTeacher ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                          title={(g as any).visibleToTeacher ? 'Visible to teacher' : 'Hidden from teacher'}
                        >
                          {(g as any).visibleToTeacher ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          Teacher
                        </button>
                        {g.targetType === 'mentor' && (
                          <button
                            onClick={() => handleToggleGoalVisibility(g.id, 'visible_to_mentor', !!(g as any).visibleToMentor)}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${(g as any).visibleToMentor ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                            title={(g as any).visibleToMentor ? 'Visible to mentor' : 'Hidden from mentor'}
                          >
                            {(g as any).visibleToMentor ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            Mentor
                          </button>
                        )}
                      </div>
                    </div>
                    {g.status === 'active' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleGoalStatus(g.id, 'completed')}
                          className="p-1.5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors"
                          title="Mark complete"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleGoalStatus(g.id, 'cancelled')}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex gap-3">
              <select
                value={newTagTarget}
                onChange={e => setNewTagTarget(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="">Select person...</option>
                <optgroup label="Teachers">
                  {teachers.map(t => (
                    <option key={t.username} value={`teacher:${t.username}`}>{t.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Mentors">
                  {mentors.map(m => (
                    <option key={m.id} value={`mentor:${m.id}`}>{m.fullName}</option>
                  ))}
                </optgroup>
              </select>
              <input
                type="text"
                value={newTagText}
                onChange={e => setNewTagText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                placeholder="e.g., needs support, low dosage, strong performer"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTagText.trim() || !newTagTarget}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {allTargets.filter(t => allTags.some(tag => tag.targetType === t.type && tag.targetId === t.id)).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No tags assigned yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allTargets
                  .filter(t => allTags.some(tag => tag.targetType === t.type && tag.targetId === t.id))
                  .map(target => {
                    const targetTags = allTags.filter(t => t.targetType === target.type && t.targetId === target.id);
                    return (
                      <div key={`${target.type}:${target.id}`} className="px-5 py-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${target.type === 'teacher' ? 'bg-teal-50 text-teal-700' : 'bg-blue-50 text-blue-700'}`}>
                            {target.type}
                          </span>
                          <span className="text-sm font-medium text-gray-800">{target.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {targetTags.map(t => (
                            <span key={t.id} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">
                              <Tag className="w-3 h-3" />
                              {t.tag}
                              <button onClick={() => handleRemoveTag(t.id)} className="hover:text-red-600">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
