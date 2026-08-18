import { supabase } from './config';
import { TEST_TEACHER_USERNAMES, TEST_MENTOR_IDS, isTestStudent } from '../../constants/testUsers';

const BATCH_SIZE = 200;
const PAGE_SIZE = 1000;

async function paginatedFetch<T>(buildQuery: (offset: number, limit: number) => any): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  while (true) {
    const { data } = await buildQuery(offset, offset + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    results.push(...(data as T[]));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return results;
}


async function batchedIn<T>(
  table: string,
  column: string,
  values: (string | number)[],
  selectCols: string
): Promise<T[]> {
  if (values.length === 0) return [];
  const results: T[] = [];
  for (let i = 0; i < values.length; i += BATCH_SIZE) {
    const chunk = values.slice(i, i + BATCH_SIZE);
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data } = await supabase
        .from(table)
        .select(selectCols)
        .in(column, chunk)
        .range(offset, offset + pageSize - 1);
      if (!data || data.length === 0) break;
      results.push(...(data as T[]));
      if (data.length < pageSize) break;
      offset += pageSize;
    }
  }
  return results;
}

export interface ExportFilters {
  districtIds: string[];
  teacherUsernames: string[];
  dateFrom: string | null;
  dateTo: string | null;
  gradeLevel: string | null;
  subject: string | null;
  excludeTestData?: boolean;
}

export interface ExportCounts {
  teachers: number;
  students: number;
  quizAttempts: number;
  rawAnswers: number;
  confidenceLogs: number;
  lessonPlans: number;
  weeklyGroups: number;
  classroomAnalytics: number;
  mentorSessions: number;
}

interface TeacherRow {
  username: string;
  name: string;
  district_id: string | null;
  school_districts: { name: string } | null;
}

function buildTeacherFilter(filters: ExportFilters): string[] | null {
  if (filters.teacherUsernames.length > 0) return filters.teacherUsernames;
  return null;
}

async function getFilteredTeacherUsernames(filters: ExportFilters): Promise<string[]> {
  if (filters.teacherUsernames.length > 0) {
    return filters.excludeTestData
      ? filters.teacherUsernames.filter(u => !TEST_TEACHER_USERNAMES.includes(u))
      : filters.teacherUsernames;
  }

  let query = supabase
    .from('teachers')
    .select('username, district_id');

  if (filters.districtIds.length > 0) {
    query = query.in('district_id', filters.districtIds);
  }

  const { data } = await query;
  const usernames = (data || []).map(t => t.username);
  return filters.excludeTestData
    ? usernames.filter(u => !TEST_TEACHER_USERNAMES.includes(u))
    : usernames;
}

async function getTeacherLookup(filters: ExportFilters): Promise<Map<string, { name: string; district_name: string }>> {
  let query = supabase
    .from('teachers')
    .select('username, name, district_id, school_districts(name)');

  if (filters.districtIds.length > 0) {
    query = query.in('district_id', filters.districtIds);
  }

  const { data } = await query;
  const map = new Map<string, { name: string; district_name: string }>();
  for (const t of (data || []) as unknown as TeacherRow[]) {
    map.set(t.username, {
      name: t.name,
      district_name: t.school_districts?.name || 'No District',
    });
  }
  return map;
}

export interface StudentExportRow {
  id: number;
  teacher_username: string;
  first_name: string;
  last_initial: string;
  emoji_password: string;
  grade_level: string;
  subject: string;
  salesforce_id: string;
  identifier: string;
  name: string;
}

function parseAdHocNames(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .flatMap(part => part.split(/\band\b/i))
    .map(n => n.trim())
    .filter(n => n.length > 0 && !/^\d+ students/.test(n));
}

function matchAdHocNameToStudent(
  typed: string,
  students: StudentExportRow[]
): StudentExportRow | null {
  if (students.length === 0) return null;
  const t = typed.replace(/[.?!()]/g, '').trim().toLowerCase();
  if (!t) return null;

  const parts = t.split(/\s+/);
  const firstName = parts[0];
  const lastInit = parts.length > 1 ? parts[parts.length - 1][0] : null;

  const firstMatches = students.filter(
    s => s.first_name.toLowerCase() === firstName
  );

  if (firstMatches.length === 1) return firstMatches[0];

  if (firstMatches.length > 1 && lastInit) {
    const withInitial = firstMatches.filter(
      s => s.last_initial.toLowerCase() === lastInit
    );
    if (withInitial.length === 1) return withInitial[0];
  }

  return null;
}

async function getStudentsByTeacher(username: string, excludeTest = false): Promise<StudentExportRow[]> {
  if (!username) return [];
  const { data } = await supabase
    .from('students')
    .select('id, teacher_username, first_name, last_initial, emoji_password, grade_level, subject, salesforce_id')
    .eq('teacher_username', username);
  if (!data) return [];
  const rows: StudentExportRow[] = [];
  for (const s of data) {
    if (excludeTest && isTestStudent(s.id, s.first_name)) continue;
    const first = s.first_name || '';
    const initial = s.last_initial ? `${String(s.last_initial).toUpperCase()}.` : '';
    const emoji = s.emoji_password || '';
    const name = [first, initial].filter(Boolean).join(' ');
    const identifier = [name, emoji].filter(Boolean).join(' ').trim() || `Student #${s.id}`;
    rows.push({
      id: s.id,
      teacher_username: s.teacher_username || '',
      first_name: first,
      last_initial: s.last_initial || '',
      emoji_password: emoji,
      grade_level: s.grade_level || '',
      subject: s.subject || '',
      salesforce_id: s.salesforce_id || '',
      identifier,
      name: name || `Student #${s.id}`,
    });
  }
  return rows;
}

async function getStudentLookup(usernames: string[], excludeTest = false): Promise<Map<number, StudentExportRow>> {
  const map = new Map<number, StudentExportRow>();
  if (usernames.length === 0) return map;
  const allData = await batchedIn<any>(
    'students', 'teacher_username', usernames,
    'id, teacher_username, first_name, last_initial, emoji_password, grade_level, subject, salesforce_id'
  );
  for (const s of allData) {
    if (excludeTest && isTestStudent(s.id, s.first_name)) continue;
    const first = s.first_name || '';
    const initial = s.last_initial ? `${String(s.last_initial).toUpperCase()}.` : '';
    const emoji = s.emoji_password || '';
    const name = [first, initial].filter(Boolean).join(' ');
    const identifier = [name, emoji].filter(Boolean).join(' ').trim() || `Student #${s.id}`;
    map.set(s.id, {
      id: s.id,
      teacher_username: s.teacher_username || '',
      first_name: first,
      last_initial: s.last_initial || '',
      emoji_password: emoji,
      grade_level: s.grade_level || '',
      subject: s.subject || '',
      salesforce_id: s.salesforce_id || '',
      identifier,
      name: name || `Student #${s.id}`,
    });
  }
  return map;
}

function studentCols(row: StudentExportRow | undefined, fallbackId: number | null): Record<string, any> {
  return {
    student_id: row?.id ?? fallbackId ?? '',
    student_name: row?.name || (fallbackId ? `Student #${fallbackId}` : ''),
    student_emoji: row?.emoji_password || '',
    student_identifier: row?.identifier || (fallbackId ? `Student #${fallbackId}` : ''),
    salesforce_id: row?.salesforce_id || '',
  };
}

async function getStudentLookupByIds(ids: number[], excludeTest = false): Promise<Map<number, StudentExportRow>> {
  const map = new Map<number, StudentExportRow>();
  if (ids.length === 0) return map;
  const data = await batchedIn<any>(
    'students', 'id', ids,
    'id, teacher_username, first_name, last_initial, emoji_password, grade_level, subject, salesforce_id'
  );
  for (const s of data) {
    if (excludeTest && isTestStudent(s.id, s.first_name)) continue;
    const first = s.first_name || '';
    const initial = s.last_initial ? `${String(s.last_initial).toUpperCase()}.` : '';
    const emoji = s.emoji_password || '';
    const name = [first, initial].filter(Boolean).join(' ');
    const identifier = [name, emoji].filter(Boolean).join(' ').trim() || `Student #${s.id}`;
    map.set(s.id, {
      id: s.id,
      teacher_username: s.teacher_username || '',
      first_name: first,
      last_initial: s.last_initial || '',
      emoji_password: emoji,
      grade_level: s.grade_level || '',
      subject: s.subject || '',
      salesforce_id: s.salesforce_id || '',
      identifier,
      name: name || `Student #${s.id}`,
    });
  }
  return map;
}

export async function fetchExportCounts(filters: ExportFilters): Promise<ExportCounts> {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) {
    return { teachers: 0, students: 0, quizAttempts: 0, rawAnswers: 0, confidenceLogs: 0, lessonPlans: 0, weeklyGroups: 0, classroomAnalytics: 0, mentorSessions: 0 };
  }

  const dateFilter = (query: any, col: string) => {
    if (filters.dateFrom) query = query.gte(col, filters.dateFrom);
    if (filters.dateTo) query = query.lte(col, filters.dateTo + 'T23:59:59');
    return query;
  };

  const [teachers, students, attempts, confidenceLogs, plans, groupPlans, groups, analytics, sessions] = await Promise.all([
    supabase.from('teachers').select('username', { count: 'exact', head: true }).in('username', usernames),
    supabase.from('students').select('id', { count: 'exact', head: true }).in('teacher_username', usernames),
    dateFilter(supabase.from('quiz_attempts').select('id, answers', { count: 'exact' }).in('teacher_username', usernames), 'created_at'),
    dateFilter(supabase.from('student_session_logs').select('id', { count: 'exact', head: true }).in('teacher_username', usernames).not('confidence_rating', 'is', null), 'session_date'),
    dateFilter(supabase.from('lesson_plans').select('id', { count: 'exact', head: true }).in('teacher_username', usernames), 'created_at'),
    dateFilter(supabase.from('group_lesson_plans').select('id', { count: 'exact', head: true }).in('teacher_username', usernames), 'created_at'),
    supabase.from('weekly_groups').select('id', { count: 'exact', head: true }).in('teacher_username', usernames),
    supabase.from('classroom_analytics').select('id', { count: 'exact', head: true }).in('teacher_username', usernames),
    filters.excludeTestData
      ? paginatedFetch<any>((off, end) => supabase.from('mentor_sessions').select('id, mentor_id, ad_hoc_teacher_username, mentor_groups(teacher_username)').range(off, end))
      : paginatedFetch<any>((off, end) => supabase.from('mentor_sessions').select('id, ad_hoc_teacher_username, mentor_groups(teacher_username)').range(off, end)),
  ]);

  let rawAnswerCount = 0;
  if (attempts.data) {
    for (const a of attempts.data) {
      if (Array.isArray(a.answers)) rawAnswerCount += a.answers.length;
    }
  }

  let mentorSessionCount = 0;
  const sessionRows = sessions as any[];
  const usernameFilterForCount = filters.teacherUsernames.length > 0 ? new Set(filters.teacherUsernames) : null;
  mentorSessionCount = sessionRows.filter(s => {
    if (filters.excludeTestData && TEST_MENTOR_IDS.includes(s.mentor_id)) return false;
    if (usernameFilterForCount) {
      const tu = s.mentor_groups?.teacher_username || s.ad_hoc_teacher_username || '';
      if (!usernameFilterForCount.has(tu)) return false;
    }
    return true;
  }).length;

  return {
    teachers: teachers.count || 0,
    students: students.count || 0,
    quizAttempts: attempts.count || 0,
    rawAnswers: rawAnswerCount,
    confidenceLogs: confidenceLogs.count || 0,
    lessonPlans: (plans.count || 0) + (groupPlans.count || 0),
    weeklyGroups: groups.count || 0,
    classroomAnalytics: analytics.count || 0,
    mentorSessions: mentorSessionCount,
  };
}

export async function fetchQuizAttemptsRaw(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  const selectCols = `
    id, student_id, score, total_questions, answers, duration,
    start_time, completed_at, created_at, teacher_username,
    quiz_templates(title, topic, subtopics, grade_level, difficulty, num_questions)
  `;

  const allData: any[] = [];
  for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
    const chunk = usernames.slice(i, i + BATCH_SIZE);
    let offset = 0;
    while (true) {
      let query = supabase
        .from('quiz_attempts')
        .select(selectCols)
        .in('teacher_username', chunk)
        .range(offset, offset + PAGE_SIZE - 1);

      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

      const { data } = await query;
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  const filtered = filters.excludeTestData
    ? allData.filter(a => !isTestStudent(a.student_id))
    : allData;

  const rows: Record<string, any>[] = [];
  for (const attempt of filtered) {
    const teacher = teacherLookup.get(attempt.teacher_username);
    const template = attempt.quiz_templates;
    const answers: any[] = Array.isArray(attempt.answers) ? attempt.answers : [];

    if (answers.length === 0) {
      rows.push({
        teacher_username: attempt.teacher_username,
        teacher_name: teacher?.name || '',
        district_name: teacher?.district_name || '',
        ...studentCols(studentLookup.get(attempt.student_id), attempt.student_id),
        quiz_title: template?.title || '',
        topic: template?.topic || '',
        subtopics: Array.isArray(template?.subtopics) ? template.subtopics.join('; ') : '',
        grade_level: template?.grade_level || '',
        difficulty: template?.difficulty || '',
        num_questions: template?.num_questions || attempt.total_questions,
        score: attempt.score,
        total_questions: attempt.total_questions,
        percent_correct: attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0,
        duration_seconds: attempt.duration || '',
        start_time: attempt.start_time || '',
        completed_at: attempt.completed_at || '',
        question_number: '',
        question_text: '',
        student_answer: '',
        is_correct: '',
        question_subtopic: '',
      });
    } else {
      answers.forEach((ans, idx) => {
        rows.push({
          teacher_username: attempt.teacher_username,
          teacher_name: teacher?.name || '',
          district_name: teacher?.district_name || '',
          ...studentCols(studentLookup.get(attempt.student_id), attempt.student_id),
          quiz_title: template?.title || '',
          topic: template?.topic || '',
          subtopics: Array.isArray(template?.subtopics) ? template.subtopics.join('; ') : '',
          grade_level: template?.grade_level || '',
          difficulty: template?.difficulty || '',
          num_questions: template?.num_questions || attempt.total_questions,
          score: attempt.score,
          total_questions: attempt.total_questions,
          percent_correct: attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0,
          duration_seconds: attempt.duration || '',
          start_time: attempt.start_time || '',
          completed_at: attempt.completed_at || '',
          question_number: idx + 1,
          question_text: ans.questionText || '',
          student_answer: ans.answer || '',
          is_correct: ans.correct === true ? 'Yes' : ans.correct === false ? 'No' : '',
          question_subtopic: ans.questionSubtopic || '',
        });
      });
    }
  }
  return rows;
}

export async function fetchExitTickets(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  let query = supabase
    .from('exit_tickets')
    .select('id, student_id, teacher_username, score, total_questions, struggled_areas, last_lesson, created_at')
    .in('teacher_username', usernames);

  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

  const { data } = await query;
  const filtered = filters.excludeTestData
    ? (data || []).filter(t => !isTestStudent(t.student_id))
    : (data || []);
  return filtered.map(t => {
    const teacher = teacherLookup.get(t.teacher_username);
    return {
      teacher_username: t.teacher_username,
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      ...studentCols(studentLookup.get(t.student_id), t.student_id),
      score: t.score,
      total_questions: t.total_questions,
      percent_correct: t.total_questions > 0 ? Math.round((t.score / t.total_questions) * 100) : 0,
      struggled_areas: Array.isArray(t.struggled_areas) ? t.struggled_areas.join('; ') : '',
      last_lesson: t.last_lesson || '',
      created_at: t.created_at || '',
    };
  });
}

export async function fetchLessonPlans(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  const selectCols = 'id, student_id, teacher_username, objective, duration, engagement, representation, action_expression, wrapup, dok_levels, aligned_standards, em_reference, created_at, updated_at';
  const groupSelectCols = 'id, group_id, teacher_username, lesson_plan, student_ids, focus_areas, created_at, updated_at';

  const allData: any[] = [];
  const allGroupData: any[] = [];

  for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
    const chunk = usernames.slice(i, i + BATCH_SIZE);
    let offset = 0;
    while (true) {
      let query = supabase.from('lesson_plans').select(selectCols).in('teacher_username', chunk).range(offset, offset + PAGE_SIZE - 1);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      const { data } = await query;
      if (!data || data.length === 0) break;
      allData.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  for (let i = 0; i < usernames.length; i += BATCH_SIZE) {
    const chunk = usernames.slice(i, i + BATCH_SIZE);
    let offset = 0;
    while (true) {
      let query = supabase.from('group_lesson_plans').select(groupSelectCols).in('teacher_username', chunk).range(offset, offset + PAGE_SIZE - 1);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      const { data } = await query;
      if (!data || data.length === 0) break;
      allGroupData.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  const data = allData;
  const groupData = allGroupData;

  const individualRows = (data || []).map(p => {
    const teacher = teacherLookup.get(p.teacher_username);
    const dok = p.dok_levels as any;
    const standards = Array.isArray(p.aligned_standards) ? p.aligned_standards : [];
    return {
      type: 'Individual',
      teacher_username: p.teacher_username,
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      ...studentCols(studentLookup.get(p.student_id), p.student_id),
      em_reference: (p as any).em_reference || '',
      objective: p.objective || '',
      duration_minutes: p.duration || '',
      engagement: Array.isArray(p.engagement) ? p.engagement.join('; ') : '',
      representation: Array.isArray(p.representation) ? p.representation.join('; ') : '',
      action_expression: Array.isArray(p.action_expression) ? p.action_expression.join('; ') : '',
      wrapup: Array.isArray(p.wrapup) ? p.wrapup.join('; ') : '',
      dok_engagement: dok?.engagement || '',
      dok_representation: dok?.representation || '',
      dok_action_expression: dok?.action_expression || '',
      dok_wrapup: dok?.wrapup || '',
      aligned_standards: standards.map((s: any) => s.standardCode || s.standard_code || '').filter(Boolean).join('; '),
      focus_areas: '',
      group_size: '',
      created_at: p.created_at || '',
      updated_at: p.updated_at || '',
    };
  });

  const groupRows = (groupData || []).map(g => {
    const teacher = teacherLookup.get(g.teacher_username);
    const lp = g.lesson_plan as any || {};
    const studentIds: number[] = Array.isArray(g.student_ids) ? g.student_ids : [];
    const studentNames = studentIds.map(id => {
      const s = studentLookup.get(id);
      return s?.name || `Student #${id}`;
    }).join('; ');
    return {
      type: 'Group',
      teacher_username: g.teacher_username,
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      student_id: studentIds.join('; '),
      student_name: studentNames,
      student_emoji: '',
      student_identifier: studentNames,
      salesforce_id: '',
      em_reference: '',
      objective: lp.objective || '',
      duration_minutes: lp.duration || '',
      engagement: Array.isArray(lp.engagement) ? lp.engagement.join('; ') : '',
      representation: Array.isArray(lp.representation) ? lp.representation.join('; ') : '',
      action_expression: Array.isArray(lp.action_expression) ? lp.action_expression.join('; ') : '',
      wrapup: Array.isArray(lp.wrapup) ? lp.wrapup.join('; ') : '',
      dok_engagement: lp.dok_levels?.engagement || '',
      dok_representation: lp.dok_levels?.representation || '',
      dok_action_expression: lp.dok_levels?.action_expression || '',
      dok_wrapup: lp.dok_levels?.wrapup || '',
      aligned_standards: Array.isArray(lp.aligned_standards) ? lp.aligned_standards.map((s: any) => s.standardCode || s.standard_code || '').filter(Boolean).join('; ') : '',
      focus_areas: Array.isArray(g.focus_areas) ? g.focus_areas.join('; ') : '',
      group_size: studentIds.length,
      created_at: g.created_at || '',
      updated_at: g.updated_at || '',
    };
  });

  return [...individualRows, ...groupRows];
}

export async function fetchWeeklyGroups(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  const data = await batchedIn<any>(
    'weekly_groups', 'teacher_username', usernames,
    'id, teacher_username, week_start_date, focus_areas, students, recommended_approach, lesson_plan_id, created_at'
  );

  const rows: Record<string, any>[] = [];
  for (const g of data) {
    const teacher = teacherLookup.get(g.teacher_username || '');
    const studentIds: number[] = Array.isArray(g.students) ? g.students : [];
    const base = {
      group_id: g.id,
      teacher_username: g.teacher_username || '',
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      week_start_date: g.week_start_date || '',
      focus_areas: Array.isArray(g.focus_areas) ? g.focus_areas.join('; ') : '',
      group_size: studentIds.length,
      recommended_approach: g.recommended_approach || '',
      has_lesson_plan: g.lesson_plan_id ? 'Yes' : 'No',
      created_at: g.created_at || '',
    };
    if (studentIds.length === 0) {
      rows.push({ ...base, ...studentCols(undefined, null) });
    } else {
      for (const sid of studentIds) {
        rows.push({ ...base, ...studentCols(studentLookup.get(sid), sid) });
      }
    }
  }
  return rows;
}

export async function fetchClassroomAnalytics(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);

  const { data } = await supabase
    .from('classroom_analytics')
    .select('id, teacher_username, total_students, average_score, total_assessments, struggle_areas, insights, recommendations, created_at')
    .in('teacher_username', usernames);

  return (data || []).map(a => {
    const teacher = teacherLookup.get(a.teacher_username || '');
    const areas = Array.isArray(a.struggle_areas) ? a.struggle_areas : [];
    const topAreas = areas.slice(0, 5).map((s: any) => s.area || s).filter(Boolean);
    return {
      teacher_username: a.teacher_username || '',
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      total_students: a.total_students,
      average_score: typeof a.average_score === 'number' ? Math.round(a.average_score) : '',
      total_assessments: a.total_assessments,
      top_struggle_areas: topAreas.join('; '),
      insights: Array.isArray(a.insights) ? a.insights.join('; ') : '',
      recommendations: Array.isArray(a.recommendations) ? a.recommendations.join('; ') : '',
      snapshot_date: a.created_at || '',
    };
  });
}

export async function fetchMentorSessions(filters: ExportFilters) {
  const teacherLookup = await getTeacherLookup(filters);

  const data = await paginatedFetch<any>((offset, end) => {
    let query = supabase
      .from('mentor_sessions')
      .select(`
        id, mentor_id, session_date, used_lesson_plan, lesson_plan_comments,
        curriculum_feedback, tutoring_minutes, attendance_notes,
        is_ad_hoc, ad_hoc_teacher_username,
        college_mentors(full_name),
        mentor_groups(name, subject, grade_level, teacher_username)
      `)
      .range(offset, end);

    if (filters.dateFrom) query = query.gte('session_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('session_date', filters.dateTo);

    return query;
  });

  const usernames = filters.teacherUsernames.length > 0 ? new Set(filters.teacherUsernames) : null;

  return (data as any[])
    .filter(s => {
      if (filters.excludeTestData && TEST_MENTOR_IDS.includes(s.mentor_id)) return false;
      if (!usernames) return true;
      const tu = s.mentor_groups?.teacher_username || s.ad_hoc_teacher_username;
      return tu && usernames.has(tu);
    })
    .map(s => {
      const tu = s.mentor_groups?.teacher_username || s.ad_hoc_teacher_username || '';
      const teacher = teacherLookup.get(tu);
      return {
        mentor_name: s.college_mentors?.full_name || '',
        group_name: s.mentor_groups?.name || (s.is_ad_hoc ? 'Ad-hoc session' : ''),
        group_subject: s.mentor_groups?.subject || '',
        group_grade_level: s.mentor_groups?.grade_level || '',
        teacher_username: tu,
        teacher_name: teacher?.name || '',
        district_name: teacher?.district_name || '',
        session_date: s.session_date || '',
        tutoring_minutes: s.tutoring_minutes,
        used_lesson_plan: s.used_lesson_plan ? 'Yes' : 'No',
        lesson_plan_comments: s.lesson_plan_comments || '',
        curriculum_feedback: s.curriculum_feedback || '',
        attendance_notes: s.attendance_notes || '',
      };
    });
}

export async function fetchTeacherActivity(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const { data: teachers } = await supabase
    .from('teachers')
    .select('username, name, account_status, login_count, last_login, created_at, district_id, school_districts(name)')
    .in('username', usernames);

  if (!teachers) return [];

  const [studentsData, templatesData, attemptsData, ticketsData, plansData, groupPlansData] = await Promise.all([
    supabase.from('students').select('teacher_username').in('teacher_username', usernames),
    supabase.from('quiz_templates').select('teacher_username').in('teacher_username', usernames),
    supabase.from('quiz_attempts').select('teacher_username').in('teacher_username', usernames),
    supabase.from('exit_tickets').select('teacher_username').in('teacher_username', usernames),
    supabase.from('lesson_plans').select('teacher_username').in('teacher_username', usernames),
    supabase.from('group_lesson_plans').select('teacher_username').in('teacher_username', usernames),
  ]);

  const countBy = (data: any[] | null, field: string) => {
    const map: Record<string, number> = {};
    for (const row of data || []) {
      const key = row[field];
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  };

  const studentCounts = countBy(studentsData.data, 'teacher_username');
  const templateCounts = countBy(templatesData.data, 'teacher_username');
  const attemptCounts = countBy(attemptsData.data, 'teacher_username');
  const ticketCounts = countBy(ticketsData.data, 'teacher_username');
  const planCounts = countBy(plansData.data, 'teacher_username');
  const groupPlanCounts = countBy(groupPlansData.data, 'teacher_username');

  return (teachers as any[]).map(t => ({
    teacher_username: t.username,
    teacher_name: t.name,
    district_name: t.school_districts?.name || 'No District',
    account_status: t.account_status || 'active',
    login_count: t.login_count || 0,
    last_login: t.last_login || '',
    account_created: t.created_at || '',
    total_students: studentCounts[t.username] || 0,
    assessments_created: templateCounts[t.username] || 0,
    total_quiz_attempts: attemptCounts[t.username] || 0,
    total_exit_tickets: ticketCounts[t.username] || 0,
    total_lesson_plans: (planCounts[t.username] || 0) + (groupPlanCounts[t.username] || 0),
  }));
}

export async function fetchStandardsAlignments(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  const { data } = await supabase
    .from('standards_alignments')
    .select(`
      id, teacher_username, student_id, struggle_area, created_at,
      ca_standards(standard_code, description, domain, cluster, grade_level, subject)
    `)
    .in('teacher_username', usernames);

  return (data || []).map((a: any) => ({
    teacher_username: a.teacher_username || '',
    teacher_name: teacherLookup.get(a.teacher_username)?.name || '',
    district_name: teacherLookup.get(a.teacher_username)?.district_name || '',
    ...studentCols(studentLookup.get(a.student_id), a.student_id),
    standard_code: a.ca_standards?.standard_code || '',
    standard_description: a.ca_standards?.description || '',
    domain: a.ca_standards?.domain || '',
    cluster: a.ca_standards?.cluster || '',
    grade_level: a.ca_standards?.grade_level || '',
    subject: a.ca_standards?.subject || '',
    struggle_area: a.struggle_area || '',
    created_at: a.created_at || '',
  }));
}

export async function fetchFilterOptions() {
  const [districts, gradeData, subjectData] = await Promise.all([
    supabase.from('school_districts').select('id, name, code').order('name'),
    supabase.from('students').select('grade_level'),
    supabase.from('students').select('subject'),
  ]);

  const grades = [...new Set((gradeData.data || []).map(s => s.grade_level).filter(Boolean))].sort();
  const subjects = [...new Set((subjectData.data || []).map(s => s.subject).filter(Boolean))].sort();

  return {
    districts: districts.data || [],
    grades,
    subjects,
  };
}

export async function fetchTeacherUsage(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const { data: teachers } = await supabase
    .from('teachers')
    .select('username, name, account_status, login_count, last_login, created_at, district_id, school_districts(name)')
    .in('username', usernames);

  if (!teachers) return [];

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [attempts30, tickets30, plans30, students] = await Promise.all([
    supabase.from('quiz_attempts').select('teacher_username').in('teacher_username', usernames).gte('created_at', thirtyDaysAgo),
    supabase.from('exit_tickets').select('teacher_username').in('teacher_username', usernames).gte('created_at', thirtyDaysAgo),
    supabase.from('lesson_plans').select('teacher_username').in('teacher_username', usernames).gte('created_at', thirtyDaysAgo),
    supabase.from('students').select('teacher_username').in('teacher_username', usernames),
  ]);

  const countBy = (data: any[] | null, field: string) => {
    const map: Record<string, number> = {};
    for (const row of data || []) {
      const key = row[field];
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  };

  const attempts30Count = countBy(attempts30.data, 'teacher_username');
  const tickets30Count = countBy(tickets30.data, 'teacher_username');
  const plans30Count = countBy(plans30.data, 'teacher_username');
  const studentCount = countBy(students.data, 'teacher_username');

  const now = Date.now();

  return (teachers as any[]).map(t => {
    const lastLoginMs = t.last_login ? new Date(t.last_login).getTime() : 0;
    const daysSinceLogin = lastLoginMs ? Math.floor((now - lastLoginMs) / 86400000) : null;
    const active30 = (attempts30Count[t.username] || 0) + (tickets30Count[t.username] || 0) + (plans30Count[t.username] || 0);
    return {
      teacher_username: t.username,
      teacher_name: t.name,
      district_name: t.school_districts?.name || 'No District',
      account_status: t.account_status || 'active',
      account_created: t.created_at || '',
      last_login: t.last_login || '',
      days_since_last_login: daysSinceLogin ?? '',
      login_count: t.login_count || 0,
      total_students: studentCount[t.username] || 0,
      quiz_attempts_last_30d: attempts30Count[t.username] || 0,
      exit_tickets_last_30d: tickets30Count[t.username] || 0,
      lesson_plans_last_30d: plans30Count[t.username] || 0,
      is_inactive_30d: active30 === 0 ? 'Yes' : 'No',
    };
  });
}

export async function fetchMentorUsage(filters: ExportFilters) {
  const { data: mentors } = await supabase
    .from('college_mentors')
    .select('id, full_name, university, major, account_status, last_login, created_at');

  if (!mentors) return [];

  const filteredMentors = filters.excludeTestData
    ? mentors.filter((m: any) => !TEST_MENTOR_IDS.includes(m.id))
    : mentors;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  let sessionsQuery = supabase
    .from('mentor_sessions')
    .select('mentor_id, tutoring_minutes, timer_minutes, time_manually_adjusted, session_date, created_at');
  if (filters.dateFrom) sessionsQuery = sessionsQuery.gte('session_date', filters.dateFrom);
  if (filters.dateTo) sessionsQuery = sessionsQuery.lte('session_date', filters.dateTo);

  const { data: sessions } = await sessionsQuery;
  const { data: sessions30 } = await supabase
    .from('mentor_sessions')
    .select('mentor_id')
    .gte('created_at', thirtyDaysAgo);

  const totals: Record<string, { count: number; minutes: number; adjusted: number }> = {};
  for (const s of sessions || []) {
    const mid = (s as any).mentor_id;
    if (!mid) continue;
    if (!totals[mid]) totals[mid] = { count: 0, minutes: 0, adjusted: 0 };
    totals[mid].count += 1;
    totals[mid].minutes += (s as any).tutoring_minutes || 0;
    if ((s as any).time_manually_adjusted) totals[mid].adjusted += 1;
  }

  const recent: Record<string, number> = {};
  for (const s of sessions30 || []) {
    const mid = (s as any).mentor_id;
    if (!mid) continue;
    recent[mid] = (recent[mid] || 0) + 1;
  }

  const now = Date.now();

  return (filteredMentors as any[]).map(m => {
    const t = totals[m.id] || { count: 0, minutes: 0, adjusted: 0 };
    const lastLoginMs = m.last_login ? new Date(m.last_login).getTime() : 0;
    const daysSinceLogin = lastLoginMs ? Math.floor((now - lastLoginMs) / 86400000) : null;
    return {
      mentor_id: m.id,
      mentor_name: m.full_name || '',
      university: m.university || '',
      major: m.major || '',
      account_status: m.account_status || 'active',
      account_created: m.created_at || '',
      last_login: m.last_login || '',
      days_since_last_login: daysSinceLogin ?? '',
      total_sessions: t.count,
      total_tutoring_minutes: t.minutes,
      average_session_minutes: t.count > 0 ? Math.round(t.minutes / t.count) : 0,
      sessions_with_time_override: t.adjusted,
      sessions_last_30d: recent[m.id] || 0,
      is_inactive_30d: (recent[m.id] || 0) === 0 ? 'Yes' : 'No',
    };
  });
}

export async function fetchMentorSessionsDetailed(filters: ExportFilters) {
  const teacherLookup = await getTeacherLookup(filters);

  const data = await paginatedFetch<any>((offset, end) => {
    let query = supabase
      .from('mentor_sessions')
      .select(`
        id, mentor_id, session_date, used_lesson_plan, resource_used, lesson_plan_comments,
        curriculum_feedback, tutoring_minutes, timer_minutes, time_manually_adjusted,
        attendance_notes, is_ad_hoc, ad_hoc_teacher_username, ad_hoc_grade_level, ad_hoc_subject,
        ad_hoc_student_names, created_at,
        college_mentors(full_name),
        mentor_groups(name, subject, grade_level, teacher_username)
      `)
      .range(offset, end);

    if (filters.dateFrom) query = query.gte('session_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('session_date', filters.dateTo);

    return query;
  });

  const usernames = filters.teacherUsernames.length > 0 ? new Set(filters.teacherUsernames) : null;

  const filtered = (data as any[]).filter(s => {
    if (filters.excludeTestData && TEST_MENTOR_IDS.includes(s.mentor_id)) return false;
    if (!usernames) return true;
    const tu = s.mentor_groups?.teacher_username || s.ad_hoc_teacher_username;
    return tu && usernames.has(tu);
  });

  // Fetch attendance for all sessions to show students_in_session
  const sessionIds = filtered.map(s => s.id);
  let attendanceBySession: Record<string, number[]> = {};
  if (sessionIds.length > 0) {
    const attendance = await batchedIn<{ session_id: string; student_id: number }>(
      'mentor_session_attendance', 'session_id', sessionIds, 'session_id, student_id'
    );
    for (const a of attendance) {
      if (!attendanceBySession[a.session_id]) attendanceBySession[a.session_id] = [];
      attendanceBySession[a.session_id].push(a.student_id);
    }
  }

  // Look up student names by IDs directly (not filtered by teacher)
  const allStudentIds = [...new Set(Object.values(attendanceBySession).flat())];
  const studentLookup = await getStudentLookupByIds(allStudentIds, filters.excludeTestData);

  return filtered.map(s => {
    const tu = s.mentor_groups?.teacher_username || s.ad_hoc_teacher_username || '';
    const teacher = teacherLookup.get(tu);
    const timer = s.timer_minutes || 0;
    const recorded = s.tutoring_minutes || 0;

    // Build student names list for this session
    const sessionStudentIds = attendanceBySession[s.id] || [];
    let studentNames = sessionStudentIds
      .map(id => studentLookup.get(id)?.name || '')
      .filter(Boolean)
      .join('; ');

    // For ad-hoc sessions, fall back to the free-text student names field
    if (!studentNames && s.ad_hoc_student_names) {
      studentNames = s.ad_hoc_student_names;
    }

    const studentCount = sessionStudentIds.length > 0
      ? sessionStudentIds.length
      : (s.ad_hoc_student_names
        ? parseAdHocNames(s.ad_hoc_student_names).length
        : 0);

    return {
      session_id: s.id,
      session_date: s.session_date || '',
      mentor_name: s.college_mentors?.full_name || '',
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      group_name: s.mentor_groups?.name || (s.is_ad_hoc ? 'Ad-hoc session' : ''),
      group_grade_level: s.mentor_groups?.grade_level || s.ad_hoc_grade_level || '',
      group_subject: s.mentor_groups?.subject || s.ad_hoc_subject || '',
      students_in_session: studentNames,
      student_count: studentCount,
      is_ad_hoc: s.is_ad_hoc ? 'Yes' : 'No',
      tutoring_minutes: recorded,
      timer_minutes: timer,
      time_manually_adjusted: s.time_manually_adjusted ? 'Yes' : 'No',
      minutes_adjustment: recorded - timer,
      used_lesson_plan: s.used_lesson_plan ? 'Yes' : 'No',
      resource_used: s.resource_used || '',
      lesson_plan_comments: s.lesson_plan_comments || '',
      curriculum_feedback: s.curriculum_feedback || '',
      attendance_notes: s.attendance_notes || '',
      created_at: s.created_at || '',
    };
  });
}

export async function fetchSessionAttendance(filters: ExportFilters) {
  const teacherLookup = await getTeacherLookup(filters);

  const sessions = await paginatedFetch<any>((offset, end) => {
    let query = supabase
      .from('mentor_sessions')
      .select(`
        id, mentor_id, session_date, tutoring_minutes, is_ad_hoc, ad_hoc_teacher_username,
        ad_hoc_student_names, ad_hoc_grade_level,
        college_mentors(full_name),
        mentor_groups(name, teacher_username)
      `)
      .range(offset, end);
    if (filters.dateFrom) query = query.gte('session_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('session_date', filters.dateTo);
    return query;
  });
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map(s => s.id);
  const attendance = await batchedIn<{ session_id: string; student_id: number; present: boolean }>(
    'mentor_session_attendance', 'session_id', sessionIds, 'session_id, student_id, present'
  );

  const allStudentIds = [...new Set(attendance.map(a => a.student_id).filter(Boolean))];
  const studentLookup = await getStudentLookupByIds(allStudentIds, filters.excludeTestData);

  const usernameFilter = filters.teacherUsernames.length > 0 ? new Set(filters.teacherUsernames) : null;

  const adHocTeachers = new Set(
    (sessions as any[])
      .filter(s => s.is_ad_hoc)
      .map(s => s.ad_hoc_teacher_username || '')
      .filter(Boolean)
  );
  const teacherStudentsCache = new Map<string, StudentExportRow[]>();
  for (const teacher of adHocTeachers) {
    teacherStudentsCache.set(teacher, await getStudentsByTeacher(teacher, filters.excludeTestData));
  }

  const rows: Record<string, any>[] = [];
  for (const s of sessions as any[]) {
    if (filters.excludeTestData && TEST_MENTOR_IDS.includes(s.mentor_id)) continue;
    const tu = s.mentor_groups?.teacher_username || s.ad_hoc_teacher_username || '';
    if (usernameFilter && !usernameFilter.has(tu)) continue;
    const teacher = teacherLookup.get(tu);

    const sessionAttendance = attendance.filter(a => a.session_id === s.id);

    if (sessionAttendance.length > 0) {
      for (const a of sessionAttendance) {
        rows.push({
          session_id: s.id,
          session_date: s.session_date || '',
          mentor_name: s.college_mentors?.full_name || '',
          group_name: s.mentor_groups?.name || (s.is_ad_hoc ? 'Ad-hoc session' : ''),
          teacher_username: tu,
          teacher_name: teacher?.name || '',
          district_name: teacher?.district_name || '',
          ...studentCols(studentLookup.get(a.student_id), a.student_id),
          present: a.present ? 'Yes' : 'No',
          session_minutes: s.tutoring_minutes || 0,
        });
      }
    } else if (s.is_ad_hoc) {
      const rawNames = s.ad_hoc_student_names || '';
      const names = rawNames ? parseAdHocNames(rawNames) : [];
      const rosterStudents = teacherStudentsCache.get(tu) || [];

      if (names.length > 0) {
        for (const name of names) {
          const matched = matchAdHocNameToStudent(name, rosterStudents);
          rows.push({
            session_id: s.id,
            session_date: s.session_date || '',
            mentor_name: s.college_mentors?.full_name || '',
            group_name: 'Ad-hoc session',
            teacher_username: tu,
            teacher_name: teacher?.name || '',
            district_name: teacher?.district_name || '',
            ...(matched
              ? studentCols(matched, matched.id)
              : { student_id: '', student_name: name, student_emoji: '', student_identifier: name, salesforce_id: '' }),
            present: 'Yes',
            session_minutes: s.tutoring_minutes || 0,
          });
        }
      } else {
        rows.push({
          session_id: s.id,
          session_date: s.session_date || '',
          mentor_name: s.college_mentors?.full_name || '',
          group_name: 'Ad-hoc session',
          teacher_username: tu,
          teacher_name: teacher?.name || '',
          district_name: teacher?.district_name || '',
          student_id: '',
          student_name: '(names not recorded)',
          student_emoji: '',
          student_identifier: '(names not recorded)',
          salesforce_id: '',
          present: 'Yes',
          session_minutes: s.tutoring_minutes || 0,
        });
      }
    }
  }
  return rows;
}

export async function fetchStudentRoster(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  let query = supabase
    .from('students')
    .select('id, teacher_username, first_name, last_initial, emoji_password, grade_level, subject, salesforce_id, last_seen, created_at')
    .in('teacher_username', usernames);

  if (filters.gradeLevel) query = query.eq('grade_level', filters.gradeLevel);
  if (filters.subject) query = query.eq('subject', filters.subject);

  const { data } = await query;
  const filtered = filters.excludeTestData
    ? (data || []).filter((s: any) => !isTestStudent(s.id, s.first_name))
    : (data || []);
  return filtered.map((s: any) => {
    const teacher = teacherLookup.get(s.teacher_username);
    return {
      ...studentCols(studentLookup.get(s.id), s.id),
      grade_level: s.grade_level || '',
      subject: s.subject || '',
      teacher_username: s.teacher_username || '',
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      last_seen: s.last_seen || '',
      enrolled_at: s.created_at || '',
    };
  });
}

export async function fetchStudentSessionInstances(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  let query = supabase
    .from('student_session_logs')
    .select('id, student_id, teacher_username, session_date, topics_practiced, confidence_rating, self_reflection, notes, mentor_session_id, created_at')
    .in('teacher_username', usernames);

  if (filters.dateFrom) query = query.gte('session_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('session_date', filters.dateTo);

  const { data } = await query;
  if (!data) return [];

  const mentorSessionIds = [...new Set((data as any[]).map(d => d.mentor_session_id).filter(Boolean))];
  let mentorMinutes: Record<string, number> = {};
  if (mentorSessionIds.length > 0) {
    const { data: ms } = await supabase
      .from('mentor_sessions')
      .select('id, tutoring_minutes')
      .in('id', mentorSessionIds);
    for (const m of ms || []) mentorMinutes[(m as any).id] = (m as any).tutoring_minutes || 0;
  }

  return (data as any[])
    .filter(log => !filters.excludeTestData || !isTestStudent(log.student_id))
    .map(log => {
    const teacher = teacherLookup.get(log.teacher_username);
    return {
      log_id: log.id,
      session_date: log.session_date || '',
      ...studentCols(studentLookup.get(log.student_id), log.student_id),
      teacher_username: log.teacher_username || '',
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      tutoring_minutes: log.mentor_session_id ? mentorMinutes[log.mentor_session_id] || 0 : '',
      mentor_session_id: log.mentor_session_id || '',
      topics_practiced: Array.isArray(log.topics_practiced) ? log.topics_practiced.join('; ') : '',
      confidence_rating: log.confidence_rating ?? '',
      self_reflection: log.self_reflection || '',
      notes: log.notes || '',
      logged_at: log.created_at || '',
    };
  });
}

export async function fetchStudentConfidenceLogs(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  let query = supabase
    .from('student_session_logs')
    .select('id, student_id, teacher_username, session_date, topics_practiced, confidence_rating, self_reflection, notes, created_at')
    .in('teacher_username', usernames)
    .not('confidence_rating', 'is', null)
    .order('student_id', { ascending: true })
    .order('session_date', { ascending: true });

  if (filters.dateFrom) query = query.gte('session_date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('session_date', filters.dateTo);

  const { data } = await query;
  if (!data) return [];

  const filtered = filters.excludeTestData
    ? (data as any[]).filter(log => !isTestStudent(log.student_id))
    : (data as any[]);

  const studentLogCounts = new Map<string, number>();
  const rows = filtered.map(log => {
    const key = `${log.student_id}-${log.teacher_username}`;
    const count = (studentLogCounts.get(key) || 0) + 1;
    studentLogCounts.set(key, count);

    const teacher = teacherLookup.get(log.teacher_username);
    return {
      ...studentCols(studentLookup.get(log.student_id), log.student_id),
      teacher_username: log.teacher_username || '',
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      session_date: log.session_date || '',
      session_number: count,
      confidence_rating: log.confidence_rating,
      confidence_label: log.confidence_rating === 1 ? 'Not confident' : log.confidence_rating === 2 ? 'A little' : log.confidence_rating === 3 ? 'Somewhat' : log.confidence_rating === 4 ? 'Confident' : log.confidence_rating === 5 ? 'Very confident' : '',
      topics_practiced: Array.isArray(log.topics_practiced) ? log.topics_practiced.join('; ') : '',
      self_reflection: log.self_reflection || '',
      notes: log.notes || '',
      logged_at: log.created_at || '',
    };
  });

  return rows;
}

export async function fetchStudentAssessmentInstances(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  let query = supabase
    .from('quiz_attempts')
    .select(`
      id, student_id, teacher_username, score, total_questions, duration,
      start_time, completed_at, created_at, answers,
      quiz_templates(title, topic, subtopics, grade_level, difficulty)
    `)
    .in('teacher_username', usernames);

  if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
  if (filters.dateTo) query = query.lte('created_at', filters.dateTo + 'T23:59:59');

  const { data } = await query;
  const filtered = filters.excludeTestData
    ? (data || []).filter((a: any) => !isTestStudent(a.student_id))
    : (data || []);
  return filtered.map((a: any) => {
    const teacher = teacherLookup.get(a.teacher_username);
    const pct = a.total_questions > 0 ? Math.round((a.score / a.total_questions) * 100) : 0;
    const answers: any[] = Array.isArray(a.answers) ? a.answers : [];
    const standardsSet = new Set<string>();
    for (const ans of answers) {
      if (ans.standardCode) standardsSet.add(ans.standardCode);
      if (Array.isArray(ans.standards)) ans.standards.forEach((s: string) => standardsSet.add(s));
    }
    return {
      attempt_id: a.id,
      attempt_date: a.created_at || '',
      ...studentCols(studentLookup.get(a.student_id), a.student_id),
      teacher_username: a.teacher_username || '',
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      quiz_title: a.quiz_templates?.title || '',
      topic: a.quiz_templates?.topic || '',
      subtopics: Array.isArray(a.quiz_templates?.subtopics) ? a.quiz_templates.subtopics.join('; ') : '',
      grade_level: a.quiz_templates?.grade_level || '',
      difficulty: a.quiz_templates?.difficulty || '',
      score: a.score,
      total_questions: a.total_questions,
      percent_correct: pct,
      duration_seconds: a.duration || '',
      start_time: a.start_time || '',
      completed_at: a.completed_at || '',
      standards_assessed: [...standardsSet].join('; '),
    };
  });
}

export async function fetchStudentGrowth(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  const [attemptsRes, logsRes, ticketsRes] = await Promise.all([
    supabase
      .from('quiz_attempts')
      .select('student_id, teacher_username, score, total_questions, created_at')
      .in('teacher_username', usernames),
    supabase
      .from('student_session_logs')
      .select('student_id, teacher_username, confidence_rating, session_date')
      .in('teacher_username', usernames),
    supabase
      .from('exit_tickets')
      .select('student_id, teacher_username, score, total_questions, created_at')
      .in('teacher_username', usernames),
  ]);

  const byStudent: Record<number, {
    attempts: { pct: number; at: number }[];
    confidences: { v: number; at: number }[];
    tickets: { pct: number; at: number }[];
    teacher: string;
  }> = {};

  const ensure = (id: number, tu: string) => {
    if (!byStudent[id]) byStudent[id] = { attempts: [], confidences: [], tickets: [], teacher: tu };
  };

  for (const a of attemptsRes.data || []) {
    if (!a.student_id) continue;
    ensure(a.student_id, a.teacher_username);
    const total = a.total_questions || 0;
    const pct = total > 0 ? (a.score / total) * 100 : 0;
    byStudent[a.student_id].attempts.push({ pct, at: new Date(a.created_at).getTime() });
  }
  for (const l of logsRes.data || []) {
    if (!l.student_id || l.confidence_rating == null) continue;
    ensure(l.student_id, l.teacher_username);
    byStudent[l.student_id].confidences.push({ v: l.confidence_rating, at: new Date(l.session_date).getTime() });
  }
  for (const t of ticketsRes.data || []) {
    if (!t.student_id) continue;
    ensure(t.student_id, t.teacher_username);
    const total = t.total_questions || 0;
    const pct = total > 0 ? (t.score / total) * 100 : 0;
    byStudent[t.student_id].tickets.push({ pct, at: new Date(t.created_at).getTime() });
  }

  const avg = (xs: number[]) => xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

  return Object.entries(byStudent)
    .filter(([sid]) => !filters.excludeTestData || !isTestStudent(Number(sid)))
    .map(([sid, s]) => {
    const studentId = Number(sid);
    const teacher = teacherLookup.get(s.teacher);
    const sortedAttempts = [...s.attempts].sort((a, b) => a.at - b.at);
    const sortedConf = [...s.confidences].sort((a, b) => a.at - b.at);

    const first3 = sortedAttempts.slice(0, 3).map(a => a.pct);
    const last3 = sortedAttempts.slice(-3).map(a => a.pct);
    const firstAvg = avg(first3);
    const lastAvg = avg(last3);

    const firstConf = avg(sortedConf.slice(0, 3).map(c => c.v));
    const lastConf = avg(sortedConf.slice(-3).map(c => c.v));

    return {
      ...studentCols(studentLookup.get(studentId), studentId),
      teacher_username: s.teacher || '',
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      total_quiz_attempts: s.attempts.length,
      total_exit_tickets: s.tickets.length,
      total_session_logs: s.confidences.length,
      first_attempts_avg_percent: firstAvg != null ? Math.round(firstAvg) : '',
      recent_attempts_avg_percent: lastAvg != null ? Math.round(lastAvg) : '',
      score_change: firstAvg != null && lastAvg != null ? Math.round(lastAvg - firstAvg) : '',
      first_confidence_avg: firstConf != null ? Math.round(firstConf * 10) / 10 : '',
      recent_confidence_avg: lastConf != null ? Math.round(lastConf * 10) / 10 : '',
      confidence_change: firstConf != null && lastConf != null ? Math.round((lastConf - firstConf) * 10) / 10 : '',
      first_activity_at: sortedAttempts[0] ? new Date(sortedAttempts[0].at).toISOString() : '',
      last_activity_at: sortedAttempts.length > 0 ? new Date(sortedAttempts[sortedAttempts.length - 1].at).toISOString() : '',
    };
  });
}

export async function fetchTeachersForFilter(districtIds: string[]) {
  let query = supabase
    .from('teachers')
    .select('username, name, district_id')
    .order('name');

  if (districtIds.length > 0) {
    query = query.in('district_id', districtIds);
  }

  const { data } = await query;
  return (data || []).map(t => ({ username: t.username, name: t.name }));
}

export async function fetchStudentTutorSessions(filters: ExportFilters) {
  const usernames = await getFilteredTeacherUsernames(filters);
  if (usernames.length === 0) return [];

  const teacherLookup = await getTeacherLookup(filters);
  const studentLookup = await getStudentLookup(usernames, filters.excludeTestData);

  // Get all mentor groups scoped to these teachers
  const { data: mentorGroups } = await supabase
    .from('mentor_groups')
    .select('id, teacher_username')
    .in('teacher_username', usernames);

  const groupIds = (mentorGroups || []).map(g => g.id);
  const groupTeacherMap = new Map((mentorGroups || []).map(g => [g.id, g.teacher_username]));

  // Fetch group-based sessions
  let groupSessions: any[] = [];
  if (groupIds.length > 0) {
    let sessionQuery = supabase
      .from('mentor_sessions')
      .select('id, group_id, session_date, mentor_id, tutoring_minutes, is_ad_hoc, ad_hoc_teacher_username, college_mentors(full_name)')
      .in('group_id', groupIds);
    if (filters.dateFrom) sessionQuery = sessionQuery.gte('session_date', filters.dateFrom);
    if (filters.dateTo) sessionQuery = sessionQuery.lte('session_date', filters.dateTo);
    const { data } = await sessionQuery;
    groupSessions = data || [];
  }

  // Fetch ad-hoc sessions (linked by ad_hoc_teacher_username, not by group)
  let adHocQuery = supabase
    .from('mentor_sessions')
    .select('id, group_id, session_date, mentor_id, tutoring_minutes, is_ad_hoc, ad_hoc_teacher_username, college_mentors(full_name)')
    .eq('is_ad_hoc', true)
    .in('ad_hoc_teacher_username', usernames);
  if (filters.dateFrom) adHocQuery = adHocQuery.gte('session_date', filters.dateFrom);
  if (filters.dateTo) adHocQuery = adHocQuery.lte('session_date', filters.dateTo);
  const { data: adHocSessions } = await adHocQuery;

  // Merge and deduplicate sessions
  const sessionMap = new Map<string, any>();
  for (const s of groupSessions) sessionMap.set(s.id, s);
  for (const s of (adHocSessions || [])) sessionMap.set(s.id, s);

  let allSessions = Array.from(sessionMap.values());
  if (allSessions.length === 0) return [];

  if (filters.excludeTestData) {
    allSessions = allSessions.filter(s => !TEST_MENTOR_IDS.includes(s.mentor_id));
  }

  const sessionIds = allSessions.map(s => s.id);

  // Get attendance for all sessions
  const attendance = await batchedIn<{ session_id: string; student_id: number; present: boolean }>(
    'mentor_session_attendance', 'session_id', sessionIds, 'session_id, student_id, present'
  );

  // Build per-student totals
  const studentStats: Record<number, { present: number; absent: number; teacherUsername: string; totalMinutes: number; mentorNames: Set<string>; lastSession: string }> = {};

  const sessionsById = new Map(allSessions.map(s => [s.id, s]));

  for (const a of attendance) {
    if (filters.excludeTestData && isTestStudent(a.student_id)) continue;
    if (!studentLookup.has(a.student_id)) continue;

    const session = sessionsById.get(a.session_id);
    if (!session) continue;

    const tu = groupTeacherMap.get(session.group_id) || session.ad_hoc_teacher_username || '';

    if (!studentStats[a.student_id]) {
      studentStats[a.student_id] = { present: 0, absent: 0, teacherUsername: tu, totalMinutes: 0, mentorNames: new Set(), lastSession: '' };
    }

    const stats = studentStats[a.student_id];
    if (a.present) {
      stats.present++;
      stats.totalMinutes += session.tutoring_minutes || 0;
      if (session.session_date > stats.lastSession) stats.lastSession = session.session_date;
    } else {
      stats.absent++;
    }
    const mentorName = (session.college_mentors as any)?.full_name;
    if (mentorName) stats.mentorNames.add(mentorName);
  }

  return Object.entries(studentStats).map(([sid, stats]) => {
    const studentId = Number(sid);
    const teacher = teacherLookup.get(stats.teacherUsername);
    const total = stats.present + stats.absent;
    return {
      ...studentCols(studentLookup.get(studentId), studentId),
      teacher_username: stats.teacherUsername,
      teacher_name: teacher?.name || '',
      district_name: teacher?.district_name || '',
      total_sessions_scheduled: total,
      sessions_present: stats.present,
      sessions_absent: stats.absent,
      attendance_rate: total > 0 ? Math.round((stats.present / total) * 100) + '%' : '',
      total_tutoring_minutes: stats.totalMinutes,
      mentor_names: [...stats.mentorNames].join('; '),
      last_session_date: stats.lastSession || '',
    };
  });
}

export async function fetchStudentTutorSessionsIndividual(filters: ExportFilters) {
  const teacherLookup = await getTeacherLookup(filters);

  const sessions = await paginatedFetch<any>((offset, end) => {
    let query = supabase
      .from('mentor_sessions')
      .select(`
        id, mentor_id, group_id, session_date, tutoring_minutes, is_ad_hoc, ad_hoc_teacher_username,
        ad_hoc_student_names, ad_hoc_grade_level, ad_hoc_subject,
        college_mentors(full_name),
        mentor_groups(name, teacher_username)
      `)
      .range(offset, end);
    if (filters.dateFrom) query = query.gte('session_date', filters.dateFrom);
    if (filters.dateTo) query = query.lte('session_date', filters.dateTo);
    return query;
  });
  if (sessions.length === 0) return [];

  const sessionIds = sessions.map(s => s.id);
  const attendance = await batchedIn<{ session_id: string; student_id: number; present: boolean }>(
    'mentor_session_attendance', 'session_id', sessionIds, 'session_id, student_id, present'
  );

  const allStudentIds = [...new Set(attendance.map(a => a.student_id).filter(Boolean))];
  const studentLookup = await getStudentLookupByIds(allStudentIds, filters.excludeTestData);

  const usernameFilter = filters.teacherUsernames.length > 0 ? new Set(filters.teacherUsernames) : null;

  // Pre-load students per teacher for ad-hoc name matching
  const adHocTeachers = new Set(
    (sessions as any[])
      .filter(s => s.is_ad_hoc)
      .map(s => s.ad_hoc_teacher_username || '')
      .filter(Boolean)
  );
  const teacherStudentsCache = new Map<string, StudentExportRow[]>();
  for (const teacher of adHocTeachers) {
    teacherStudentsCache.set(teacher, await getStudentsByTeacher(teacher, filters.excludeTestData));
  }

  const rows: Record<string, any>[] = [];
  for (const s of sessions as any[]) {
    if (filters.excludeTestData && TEST_MENTOR_IDS.includes(s.mentor_id)) continue;
    const tu = s.mentor_groups?.teacher_username || s.ad_hoc_teacher_username || '';
    if (usernameFilter && !usernameFilter.has(tu)) continue;
    const teacher = teacherLookup.get(tu);
    if (filters.districtIds.length > 0 && !teacher) continue;

    const sessionAttendance = attendance.filter(a => a.session_id === s.id);

    if (sessionAttendance.length > 0) {
      for (const a of sessionAttendance) {
        if (filters.excludeTestData && isTestStudent(a.student_id)) continue;
        const student = studentLookup.get(a.student_id);
        rows.push({
          ...studentCols(student, a.student_id),
          student_grade_level: student?.grade_level || '',
          teacher_username: tu,
          teacher_name: teacher?.name || '',
          district_name: teacher?.district_name || '',
          session_id: s.id,
          session_date: s.session_date || '',
          mentor_name: s.college_mentors?.full_name || '',
          group_name: s.mentor_groups?.name || (s.is_ad_hoc ? 'Ad-hoc session' : ''),
          is_ad_hoc: s.is_ad_hoc ? 'Yes' : 'No',
          present: a.present ? 'Yes' : 'No',
          session_minutes: s.tutoring_minutes || 0,
        });
      }
    } else if (s.is_ad_hoc) {
      const rawNames = s.ad_hoc_student_names || '';
      const names = rawNames ? parseAdHocNames(rawNames) : [];
      const rosterStudents = teacherStudentsCache.get(tu) || [];

      if (names.length > 0) {
        for (const name of names) {
          const matched = matchAdHocNameToStudent(name, rosterStudents);
          if (matched) {
            rows.push({
              ...studentCols(matched, matched.id),
              student_grade_level: matched.grade_level || s.ad_hoc_grade_level || '',
              teacher_username: tu,
              teacher_name: teacher?.name || '',
              district_name: teacher?.district_name || '',
              session_id: s.id,
              session_date: s.session_date || '',
              mentor_name: s.college_mentors?.full_name || '',
              group_name: 'Ad-hoc session',
              is_ad_hoc: 'Yes',
              present: 'Yes',
              session_minutes: s.tutoring_minutes || 0,
            });
          } else {
            rows.push({
              student_id: '',
              student_name: name,
              student_emoji: '',
              student_identifier: name,
              salesforce_id: '',
              student_grade_level: s.ad_hoc_grade_level || '',
              teacher_username: tu,
              teacher_name: teacher?.name || '',
              district_name: teacher?.district_name || '',
              session_id: s.id,
              session_date: s.session_date || '',
              mentor_name: s.college_mentors?.full_name || '',
              group_name: 'Ad-hoc session',
              is_ad_hoc: 'Yes',
              present: 'Yes',
              session_minutes: s.tutoring_minutes || 0,
            });
          }
        }
      } else {
        rows.push({
          student_id: '',
          student_name: '(names not recorded)',
          student_emoji: '',
          student_identifier: '(names not recorded)',
          salesforce_id: '',
          student_grade_level: s.ad_hoc_grade_level || '',
          teacher_username: tu,
          teacher_name: teacher?.name || '',
          district_name: teacher?.district_name || '',
          session_id: s.id,
          session_date: s.session_date || '',
          mentor_name: s.college_mentors?.full_name || '',
          group_name: 'Ad-hoc session',
          is_ad_hoc: 'Yes',
          present: 'Yes',
          session_minutes: s.tutoring_minutes || 0,
        });
      }
    }
  }
  return rows;
}
