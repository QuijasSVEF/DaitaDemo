import { supabase } from './config';

export interface CoachTeacher {
  username: string;
  name: string;
  email: string | null;
  lastLogin: string | null;
  loginCount: number;
  gradeLevel?: string;
  subject?: string;
  districtId?: string;
  districtName?: string;
  studentCount: number;
  exitTicketCount: number;
  exitTicketsThisWeek: number;
  studentsAssessedThisWeek: number;
  quizTemplateCount: number;
  tags: string[];
  noteCount: number;
  activeGoalCount: number;
}

export interface CoachMentor {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  university: string | null;
  major: string | null;
  lastLogin: string | null;
  accountStatus: string;
  sessionCount: number;
  totalMinutes: number;
  sessionsThisWeek: number;
  minutesThisWeek: number;
  usedLessonPlanRate: number;
  assignedTeachers: string[];
  assignedDistricts: string[];
  tags: string[];
  noteCount: number;
  activeGoalCount: number;
}

export interface CoachAlert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  category: 'teacher' | 'mentor' | 'student';
  targetId: string;
  targetName: string;
  message: string;
  detail: string;
  timestamp: string;
}

export interface TeacherStudentData {
  studentId: number;
  studentName: string;
  gradeLevel: string;
  subject: string;
  totalExitTickets: number;
  avgScore: number;
  recentScore: number | null;
  struggledAreas: string[];
  lastAssessed: string | null;
  trend: 'up' | 'down' | 'flat';
}

export interface MentorSessionData {
  id: string;
  mentorId: string;
  mentorName: string;
  groupId: string | null;
  sessionDate: string;
  usedLessonPlan: boolean;
  resourceUsed: string | null;
  isAdHoc: boolean;
  lessonPlanComments: string | null;
  curriculumFeedback: string | null;
  tutoringMinutes: number;
  attendanceNotes: string | null;
}

export interface CoachNote {
  id: string;
  coachId: string;
  targetType: 'teacher' | 'mentor';
  targetId: string;
  content: string;
  visibleToTeacher: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoachGoal {
  id: string;
  coachId: string;
  targetType: 'teacher' | 'mentor';
  targetId: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'cancelled';
  dueDate: string | null;
  visibleToTeacher: boolean;
  visibleToMentor: boolean;
  createdAt: string;
  updatedAt: string;
}

function getWeekStartDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getCoachTeachers(coachId: string): Promise<CoachTeacher[]> {
  const weekStart = getWeekStartDate();

  const { data: assignments, error: assignError } = await supabase
    .from('coach_teacher_assignments')
    .select('teacher_username')
    .eq('coach_id', coachId);

  if (assignError) throw assignError;
  if (!assignments?.length) return [];

  const usernames = assignments.map(a => a.teacher_username);

  const { data: teachers, error: teacherError } = await supabase
    .from('teachers')
    .select('username, name, email, last_login, login_count, district_id, school_districts(name)')
    .in('username', usernames);

  if (teacherError) throw teacherError;

  const [
    { data: students },
    { data: quizAttempts },
    { data: weekAttempts },
    { data: quizTemplates },
    { data: tags },
    { data: notes },
    { data: goals }
  ] = await Promise.all([
    supabase.from('students').select('id, teacher_username').in('teacher_username', usernames),
    supabase.from('quiz_attempts').select('id, teacher_username, student_id, created_at').in('teacher_username', usernames),
    supabase.from('quiz_attempts').select('id, teacher_username, student_id').in('teacher_username', usernames).gte('created_at', weekStart),
    supabase.from('quiz_templates').select('id, teacher_username').in('teacher_username', usernames),
    supabase.from('coach_tags').select('*').eq('coach_id', coachId).eq('target_type', 'teacher'),
    supabase.from('coach_notes').select('id, target_id').eq('coach_id', coachId).eq('target_type', 'teacher'),
    supabase.from('coaching_goals').select('id, target_id').eq('coach_id', coachId).eq('target_type', 'teacher').eq('status', 'active')
  ]);

  return (teachers || []).map(t => {
    const teacherStudents = (students || []).filter(s => s.teacher_username === t.username);
    const teacherAttempts = (quizAttempts || []).filter(e => e.teacher_username === t.username);
    const teacherWeekAttempts = (weekAttempts || []).filter(e => e.teacher_username === t.username);
    const uniqueStudentsThisWeek = new Set(teacherWeekAttempts.map(e => e.student_id)).size;
    const teacherQuizzes = (quizTemplates || []).filter(q => q.teacher_username === t.username);
    const teacherTags = (tags || []).filter(tag => tag.target_id === t.username).map(tag => tag.tag);
    const teacherNotes = (notes || []).filter(n => n.target_id === t.username);
    const teacherGoals = (goals || []).filter(g => g.target_id === t.username);

    return {
      username: t.username,
      name: t.name,
      email: t.email,
      lastLogin: t.last_login,
      loginCount: t.login_count || 0,
      districtId: t.district_id,
      districtName: (t as any).school_districts?.name || undefined,
      studentCount: teacherStudents.length,
      exitTicketCount: teacherAttempts.length,
      exitTicketsThisWeek: teacherWeekAttempts.length,
      studentsAssessedThisWeek: uniqueStudentsThisWeek,
      quizTemplateCount: teacherQuizzes.length,
      tags: teacherTags,
      noteCount: teacherNotes.length,
      activeGoalCount: teacherGoals.length
    };
  });
}

export async function getCoachMentors(coachId: string): Promise<CoachMentor[]> {
  const weekStart = getWeekStartDate();

  const { data: assignments } = await supabase
    .from('coach_teacher_assignments')
    .select('teacher_username')
    .eq('coach_id', coachId);

  if (!assignments?.length) return [];
  const teacherUsernames = assignments.map(a => a.teacher_username);

  const { data: mentorAssigns } = await supabase
    .from('mentor_teacher_assignments')
    .select('mentor_id, teacher_username')
    .in('teacher_username', teacherUsernames)
    .eq('status', 'active');

  if (!mentorAssigns?.length) return [];

  const mentorIds = [...new Set(mentorAssigns.map(a => a.mentor_id))];

  const [
    { data: mentors },
    { data: sessions },
    { data: weekSessions },
    { data: tags },
    { data: notes },
    { data: goals },
    { data: teacherDistricts }
  ] = await Promise.all([
    supabase.from('college_mentors').select('*').in('id', mentorIds),
    supabase.from('mentor_sessions').select('*').in('mentor_id', mentorIds),
    supabase.from('mentor_sessions').select('*').in('mentor_id', mentorIds).gte('session_date', weekStart),
    supabase.from('coach_tags').select('*').eq('coach_id', coachId).eq('target_type', 'mentor'),
    supabase.from('coach_notes').select('id, target_id').eq('coach_id', coachId).eq('target_type', 'mentor'),
    supabase.from('coaching_goals').select('id, target_id').eq('coach_id', coachId).eq('target_type', 'mentor').eq('status', 'active'),
    supabase.from('teachers').select('username, school_districts(name)').in('username', teacherUsernames)
  ]);

  const teacherDistrictMap = new Map<string, string>();
  for (const t of (teacherDistricts || [])) {
    const dName = (t as any).school_districts?.name;
    if (dName) teacherDistrictMap.set(t.username, dName);
  }

  return (mentors || []).map(m => {
    const mSessions = (sessions || []).filter(s => s.mentor_id === m.id);
    const mWeekSessions = (weekSessions || []).filter(s => s.mentor_id === m.id);
    const usedResource = mSessions.filter(s => s.used_lesson_plan || s.resource_used === 'data_lesson_plan' || s.resource_used === 'elevate_curriculum').length;
    const rate = mSessions.length > 0 ? Math.round((usedResource / mSessions.length) * 100) : 0;
    const teachersForMentor = mentorAssigns!.filter(a => a.mentor_id === m.id).map(a => a.teacher_username);
    const districtsForMentor = [...new Set(
      teachersForMentor.map(tu => teacherDistrictMap.get(tu)).filter(Boolean) as string[]
    )];
    const mTags = (tags || []).filter(t => t.target_id === m.id).map(t => t.tag);
    const mNotes = (notes || []).filter(n => n.target_id === m.id);
    const mGoals = (goals || []).filter(g => g.target_id === m.id);

    return {
      id: m.id,
      fullName: m.full_name,
      email: m.email,
      phone: m.phone,
      university: m.university,
      major: m.major,
      lastLogin: m.last_login,
      accountStatus: m.account_status,
      sessionCount: mSessions.length,
      totalMinutes: mSessions.reduce((sum: number, s: any) => sum + (s.tutoring_minutes || 0), 0),
      sessionsThisWeek: mWeekSessions.length,
      minutesThisWeek: mWeekSessions.reduce((sum: number, s: any) => sum + (s.tutoring_minutes || 0), 0),
      usedLessonPlanRate: rate,
      assignedTeachers: teachersForMentor,
      assignedDistricts: districtsForMentor,
      tags: mTags,
      noteCount: mNotes.length,
      activeGoalCount: mGoals.length
    };
  });
}

export async function getCoachAlerts(coachId: string, teachers: CoachTeacher[], mentors: CoachMentor[]): Promise<CoachAlert[]> {
  const alerts: CoachAlert[] = [];
  const now = new Date();

  teachers.forEach(t => {
    if (t.exitTicketsThisWeek === 0) {
      alerts.push({
        id: `teacher-no-assess-${t.username}`,
        type: 'warning',
        category: 'teacher',
        targetId: t.username,
        targetName: t.name,
        message: 'No assessments this week',
        detail: `${t.name} has not created any assessments this week.`,
        timestamp: now.toISOString()
      });
    }

    if (t.lastLogin) {
      const daysSinceLogin = Math.floor((now.getTime() - new Date(t.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLogin > 7) {
        alerts.push({
          id: `teacher-inactive-${t.username}`,
          type: 'danger',
          category: 'teacher',
          targetId: t.username,
          targetName: t.name,
          message: `Inactive for ${daysSinceLogin} days`,
          detail: `${t.name} hasn't logged in for ${daysSinceLogin} days.`,
          timestamp: now.toISOString()
        });
      }
    } else {
      alerts.push({
        id: `teacher-never-login-${t.username}`,
        type: 'danger',
        category: 'teacher',
        targetId: t.username,
        targetName: t.name,
        message: 'Never logged in',
        detail: `${t.name} has never logged into the platform.`,
        timestamp: now.toISOString()
      });
    }

    if (t.studentCount > 0 && t.studentsAssessedThisWeek === 0) {
      alerts.push({
        id: `teacher-no-students-assessed-${t.username}`,
        type: 'warning',
        category: 'teacher',
        targetId: t.username,
        targetName: t.name,
        message: '0% students assessed this week',
        detail: `None of ${t.name}'s ${t.studentCount} students have been assessed this week.`,
        timestamp: now.toISOString()
      });
    }
  });

  mentors.forEach(m => {
    if (m.sessionsThisWeek === 0) {
      const hasNeverLoggedIn = !m.lastLogin;
      const severity = hasNeverLoggedIn ? 'danger' : 'warning';
      const msg = hasNeverLoggedIn
        ? 'Never logged in'
        : 'No sessions logged this week';
      const detail = hasNeverLoggedIn
        ? `${m.fullName} has never logged into the mentor portal.`
        : `${m.fullName} has not logged any tutoring sessions this week (${m.sessionCount} total sessions to date).`;
      alerts.push({
        id: `mentor-no-sessions-${m.id}`,
        type: severity,
        category: 'mentor',
        targetId: m.id,
        targetName: m.fullName,
        message: msg,
        detail,
        timestamp: now.toISOString()
      });
    }

    if (m.minutesThisWeek < 60 && m.sessionsThisWeek > 0) {
      alerts.push({
        id: `mentor-low-dosage-${m.id}`,
        type: 'warning',
        category: 'mentor',
        targetId: m.id,
        targetName: m.fullName,
        message: 'Low dosage this week',
        detail: `${m.fullName} has only logged ${m.minutesThisWeek} minutes this week.`,
        timestamp: now.toISOString()
      });
    }

    if (m.usedLessonPlanRate < 50 && m.sessionCount > 2) {
      alerts.push({
        id: `mentor-low-plan-usage-${m.id}`,
        type: 'info',
        category: 'mentor',
        targetId: m.id,
        targetName: m.fullName,
        message: 'Low lesson plan usage',
        detail: `${m.fullName} uses generated lesson plans only ${m.usedLessonPlanRate}% of the time.`,
        timestamp: now.toISOString()
      });
    }
  });

  return alerts.sort((a, b) => {
    const priority = { danger: 0, warning: 1, info: 2 };
    return priority[a.type] - priority[b.type];
  });
}

export async function getTeacherStudentData(teacherUsername: string): Promise<TeacherStudentData[]> {
  const [
    { data: students },
    { data: quizAttempts }
  ] = await Promise.all([
    supabase.from('students').select('*').eq('teacher_username', teacherUsername),
    supabase.from('quiz_attempts').select('*').eq('teacher_username', teacherUsername).order('created_at', { ascending: true })
  ]);

  return (students || []).map(s => {
    const studentAttempts = (quizAttempts || []).filter(q => q.student_id === s.id);
    const scores = studentAttempts.map(q => Math.round((q.score / q.total_questions) * 100));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const recentScore = scores.length > 0 ? scores[scores.length - 1] : null;

    const allStruggles: string[] = [];
    for (const attempt of studentAttempts) {
      const answers = attempt.answers as { correct: boolean; questionSubtopic: string }[] | null;
      if (answers) {
        for (const ans of answers) {
          if (!ans.correct && ans.questionSubtopic) {
            allStruggles.push(ans.questionSubtopic);
          }
        }
      }
    }
    const uniqueStruggles = [...new Set(allStruggles)];

    const lastAttempt = studentAttempts.length > 0 ? studentAttempts[studentAttempts.length - 1] : null;

    let trend: 'up' | 'down' | 'flat' = 'flat';
    if (scores.length >= 3) {
      const recent = scores.slice(-3);
      const earlier = scores.slice(-6, -3);
      if (earlier.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        if (recentAvg > earlierAvg + 5) trend = 'up';
        else if (recentAvg < earlierAvg - 5) trend = 'down';
      }
    }

    return {
      studentId: s.id,
      studentName: `${s.first_name || ''} ${s.last_initial || ''}`.trim() || `Student ${s.id}`,
      gradeLevel: s.grade_level,
      subject: s.subject,
      totalExitTickets: studentAttempts.length,
      avgScore,
      recentScore,
      struggledAreas: uniqueStruggles,
      lastAssessed: lastAttempt?.created_at || null,
      trend
    };
  });
}

export async function getMentorSessions(mentorIds: string[]): Promise<MentorSessionData[]> {
  if (!mentorIds.length) return [];

  const [
    { data: sessions },
    { data: mentors }
  ] = await Promise.all([
    supabase.from('mentor_sessions').select('*').in('mentor_id', mentorIds).order('session_date', { ascending: false }).limit(500),
    supabase.from('college_mentors').select('id, full_name').in('id', mentorIds)
  ]);

  const mentorMap = new Map((mentors || []).map(m => [m.id, m.full_name]));

  return (sessions || []).map(s => ({
    id: s.id,
    mentorId: s.mentor_id,
    mentorName: mentorMap.get(s.mentor_id) || 'Unknown',
    groupId: s.group_id,
    sessionDate: s.session_date,
    usedLessonPlan: s.used_lesson_plan,
    resourceUsed: s.resource_used || null,
    isAdHoc: s.is_ad_hoc || false,
    lessonPlanComments: s.lesson_plan_comments,
    curriculumFeedback: s.curriculum_feedback,
    tutoringMinutes: s.tutoring_minutes,
    attendanceNotes: s.attendance_notes
  }));
}

export async function getCoachNotes(coachId: string, targetType?: string, targetId?: string): Promise<CoachNote[]> {
  let query = supabase.from('coach_notes').select('*').eq('coach_id', coachId).order('created_at', { ascending: false });
  if (targetType) query = query.eq('target_type', targetType);
  if (targetId) query = query.eq('target_id', targetId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(n => ({
    id: n.id,
    coachId: n.coach_id,
    targetType: n.target_type,
    targetId: n.target_id,
    content: n.content,
    visibleToTeacher: n.visible_to_teacher || false,
    createdAt: n.created_at,
    updatedAt: n.updated_at
  }));
}

export async function addCoachNote(coachId: string, targetType: 'teacher' | 'mentor', targetId: string, content: string): Promise<CoachNote> {
  const { data, error } = await supabase
    .from('coach_notes')
    .insert({ coach_id: coachId, target_type: targetType, target_id: targetId, content })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    coachId: data.coach_id,
    targetType: data.target_type,
    targetId: data.target_id,
    content: data.content,
    visibleToTeacher: data.visible_to_teacher || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function deleteCoachNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('coach_notes').delete().eq('id', noteId);
  if (error) throw error;
}

export async function getCoachGoals(coachId: string, targetType?: string, targetId?: string): Promise<CoachGoal[]> {
  let query = supabase.from('coaching_goals').select('*').eq('coach_id', coachId).order('created_at', { ascending: false });
  if (targetType) query = query.eq('target_type', targetType);
  if (targetId) query = query.eq('target_id', targetId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(g => ({
    id: g.id,
    coachId: g.coach_id,
    targetType: g.target_type,
    targetId: g.target_id,
    title: g.title,
    description: g.description,
    status: g.status,
    dueDate: g.due_date,
    visibleToTeacher: g.visible_to_teacher || false,
    visibleToMentor: g.visible_to_mentor || false,
    createdAt: g.created_at,
    updatedAt: g.updated_at
  }));
}

export async function addCoachGoal(coachId: string, targetType: 'teacher' | 'mentor', targetId: string, title: string, description: string, dueDate?: string): Promise<CoachGoal> {
  const { data, error } = await supabase
    .from('coaching_goals')
    .insert({ coach_id: coachId, target_type: targetType, target_id: targetId, title, description, due_date: dueDate || null })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    coachId: data.coach_id,
    targetType: data.target_type,
    targetId: data.target_id,
    title: data.title,
    description: data.description,
    status: data.status,
    dueDate: data.due_date,
    visibleToTeacher: data.visible_to_teacher || false,
    visibleToMentor: data.visible_to_mentor || false,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

export async function updateCoachGoalStatus(goalId: string, status: 'active' | 'completed' | 'cancelled'): Promise<void> {
  const { error } = await supabase.from('coaching_goals').update({ status, updated_at: new Date().toISOString() }).eq('id', goalId);
  if (error) throw error;
}

export async function addCoachTag(coachId: string, targetType: 'teacher' | 'mentor', targetId: string, tag: string): Promise<void> {
  const { error } = await supabase.from('coach_tags').insert({ coach_id: coachId, target_type: targetType, target_id: targetId, tag });
  if (error) throw error;
}

export async function removeCoachTag(tagId: string): Promise<void> {
  const { error } = await supabase.from('coach_tags').delete().eq('id', tagId);
  if (error) throw error;
}

export async function getTeacherWeeklyGroups(teacherUsername: string) {
  const { data, error } = await supabase
    .from('weekly_groups')
    .select('*')
    .eq('teacher_username', teacherUsername)
    .order('week_start_date', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function getTeacherExitTicketStats(teacherUsername: string) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, student_id, score, total_questions, answers, created_at')
    .eq('teacher_username', teacherUsername)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(q => ({
    ...q,
    struggled_areas: ((q.answers as any[] | null) || [])
      .filter((a: any) => !a.correct && a.questionSubtopic)
      .map((a: any) => a.questionSubtopic),
    last_lesson: null,
  }));
}

export async function getQuizAttemptStats(teacherUsername: string) {
  const { data, error } = await supabase
    .from('quiz_attempts')
    .select('id, student_id, score, total_questions, duration, completed_at, start_time, completion_time')
    .eq('teacher_username', teacherUsername)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
