import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabase/config';
import { Button } from '../ui/Button';
import { CollegeMentor } from './MentorLogin';

interface Props {
  mentor: CollegeMentor;
  onClose: () => void;
}

interface FormData {
  teacherUsername: string;
  gradeLevel: string;
  subject: string;
  studentNames: string;
  resourceUsed: 'data_lesson_plan' | 'elevate_curriculum' | '';
  lessonPlanComments: string;
  curriculumFeedback: string;
  tutoringMinutes: number;
  attendanceNotes: string;
  sessionDate: string;
  emLevelCode: string;
  emModuleId: string;
  emSubtopicId: string;
}

const GRADE_OPTIONS = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SUBJECT_OPTIONS = ['Math', 'English Language Arts', 'Science', 'Social Studies', 'Other'];

export function AdHocSessionModal({ mentor, onClose }: Props) {
  const queryClient = useQueryClient();
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [form, setForm] = useState<FormData>({
    teacherUsername: '',
    gradeLevel: '',
    subject: 'Math',
    studentNames: '',
    resourceUsed: '',
    lessonPlanComments: '',
    curriculumFeedback: '',
    tutoringMinutes: 0,
    attendanceNotes: '',
    sessionDate: new Date().toISOString().split('T')[0],
    emLevelCode: '',
    emModuleId: '',
    emSubtopicId: '',
  });

  const { data: emLevels = [] } = useQuery({
    queryKey: ['emLevels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('em_levels')
        .select('level_code, title, grade_level')
        .order('sort_order')
        .order('level_code');
      if (error) throw error;
      return (data || []) as { level_code: string; title: string; grade_level: string | null }[];
    },
  });

  const { data: emModules = [] } = useQuery({
    queryKey: ['emModules', form.emLevelCode],
    enabled: !!form.emLevelCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('em_modules')
        .select('id, title, order_index')
        .eq('level_code', form.emLevelCode)
        .order('order_index');
      if (error) throw error;
      return (data || []) as { id: string; title: string; order_index: number }[];
    },
  });

  const { data: emSubtopics = [] } = useQuery({
    queryKey: ['emSubtopics', form.emModuleId],
    enabled: !!form.emModuleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('em_subtopics')
        .select('id, title, order_index')
        .eq('module_id', form.emModuleId)
        .order('order_index');
      if (error) throw error;
      return (data || []) as { id: string; title: string; order_index: number }[];
    },
  });

  const { data: teachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['mentorAssignedTeachers', mentor.id],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('mentor_teacher_assignments')
        .select('teacher_username')
        .eq('mentor_id', mentor.id)
        .eq('status', 'active');
      if (error) throw error;

      const usernames = (assignments || []).map((a: any) => a.teacher_username);
      if (usernames.length === 0) return [] as { username: string; name: string; school: string | null }[];

      const { data: teacherRows, error: tErr } = await supabase
        .from('teachers')
        .select('username, name, school')
        .in('username', usernames);
      if (tErr) throw tErr;

      return (teacherRows || []).map((t: any) => ({
        username: t.username,
        name: t.name,
        school: t.school,
      }));
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('mentor_sessions').insert({
        mentor_id: mentor.id,
        group_id: null,
        is_ad_hoc: true,
        session_date: form.sessionDate,
        resource_used: form.resourceUsed || null,
        used_lesson_plan: form.resourceUsed === 'data_lesson_plan',
        lesson_plan_comments: form.lessonPlanComments || null,
        curriculum_feedback: form.curriculumFeedback || null,
        tutoring_minutes: form.tutoringMinutes,
        timer_minutes: 0,
        attendance_notes: form.attendanceNotes || null,
        ad_hoc_teacher_username: form.teacherUsername,
        ad_hoc_grade_level: form.gradeLevel || null,
        ad_hoc_subject: form.subject || null,
        ad_hoc_student_names: form.studentNames || null,
        ad_hoc_em_level_code: form.resourceUsed === 'elevate_curriculum' ? form.emLevelCode || null : null,
        ad_hoc_em_module_id: form.resourceUsed === 'elevate_curriculum' ? form.emModuleId || null : null,
        ad_hoc_em_subtopic_id: form.resourceUsed === 'elevate_curriculum' ? form.emSubtopicId || null : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adHocSessions', mentor.id] });
      setSubmitSuccess(true);
      setTimeout(onClose, 1500);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.teacherUsername || !form.resourceUsed || form.tutoringMinutes <= 0) return;
    submitMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-oswald font-bold text-gray-900">Log Ad-Hoc Session</h2>
              <p className="text-sm text-gray-600 mt-1">
                For tutoring sessions not tied to a D[ai]ta weekly group.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitSuccess ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Session Recorded</h3>
              <p className="text-gray-600">Your ad-hoc session has been saved.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teacher <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.teacherUsername}
                    onChange={(e) => setForm({ ...form, teacherUsername: e.target.value })}
                    required
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">
                      {loadingTeachers ? 'Loading...' : 'Select a teacher'}
                    </option>
                    {teachers.map((t) => (
                      <option key={t.username} value={t.username}>
                        {t.name}{t.school ? ` - ${t.school}` : ''}
                      </option>
                    ))}
                  </select>
                  {!loadingTeachers && teachers.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No teachers assigned to you yet. Contact your program coordinator.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.sessionDate}
                    onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade Level</label>
                  <select
                    value={form.gradeLevel}
                    onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select grade</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SUBJECT_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Names (who attended)
                </label>
                <input
                  type="text"
                  value={form.studentNames}
                  onChange={(e) => setForm({ ...form, studentNames: e.target.value })}
                  placeholder="e.g. Alex P., Jordan S., Sam K."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Which resource did you use? <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="adhocResource"
                      value="data_lesson_plan"
                      checked={form.resourceUsed === 'data_lesson_plan'}
                      onChange={(e) =>
                        setForm({ ...form, resourceUsed: e.target.value as FormData['resourceUsed'] })
                      }
                      className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500"
                      required
                    />
                    <div>
                      <span className="font-medium text-gray-900">D[ai]ta Lesson Plan</span>
                      <p className="text-sm text-gray-600">
                        I used the D[ai]ta-generated lesson plan during this session.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="adhocResource"
                      value="elevate_curriculum"
                      checked={form.resourceUsed === 'elevate_curriculum'}
                      onChange={(e) =>
                        setForm({ ...form, resourceUsed: e.target.value as FormData['resourceUsed'] })
                      }
                      className="mt-1 w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Elevate Curriculum</span>
                      <p className="text-sm text-gray-600">
                        I followed the Elevate curriculum during this session.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {form.resourceUsed === 'elevate_curriculum' && (
                <div className="space-y-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-900">
                    Tag this session with the Elevate Math content you covered.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">EM Level</label>
                      <select
                        value={form.emLevelCode}
                        onChange={(e) => setForm({ ...form, emLevelCode: e.target.value, emModuleId: '', emSubtopicId: '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select level</option>
                        {emLevels.map((l) => (
                          <option key={l.level_code} value={l.level_code}>{l.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Module</label>
                      <select
                        value={form.emModuleId}
                        onChange={(e) => setForm({ ...form, emModuleId: e.target.value, emSubtopicId: '' })}
                        disabled={!form.emLevelCode}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Select module</option>
                        {emModules.map((m) => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Subtopic</label>
                      <select
                        value={form.emSubtopicId}
                        onChange={(e) => setForm({ ...form, emSubtopicId: e.target.value })}
                        disabled={!form.emModuleId}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        <option value="">Select subtopic</option>
                        {emSubtopics.map((s) => (
                          <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tutoring Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.tutoringMinutes || ''}
                  onChange={(e) =>
                    setForm({ ...form, tutoringMinutes: parseInt(e.target.value) || 0 })
                  }
                  min="1"
                  max="480"
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter duration in minutes"
                />
                <p className="text-sm text-gray-600 mt-1">
                  High-Impact Tutoring (HIT) minutes provided during this session.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lesson Plan Comments (Optional)
                </label>
                <textarea
                  value={form.lessonPlanComments}
                  onChange={(e) => setForm({ ...form, lessonPlanComments: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="How did the lesson plan work? Any suggestions?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Curriculum Feedback (Optional)
                </label>
                <textarea
                  value={form.curriculumFeedback}
                  onChange={(e) => setForm({ ...form, curriculumFeedback: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Specific topics or concepts where students needed support."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance & Notes (Optional)
                </label>
                <textarea
                  value={form.attendanceNotes}
                  onChange={(e) => setForm({ ...form, attendanceNotes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional notes about attendance or the session."
                />
              </div>

              {submitMutation.isError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  Something went wrong saving this session. Please try again.
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  onClick={onClose}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={
                    submitMutation.isPending ||
                    !form.teacherUsername ||
                    !form.resourceUsed ||
                    form.tutoringMinutes <= 0
                  }
                >
                  {submitMutation.isPending ? 'Submitting...' : 'Submit Session'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
