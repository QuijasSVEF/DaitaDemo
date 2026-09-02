import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, ClipboardCheck, BookOpen, Lock, UserCheck, History, Clock, AlertTriangle, Download, ArrowUpRight, ArrowDownRight, Minus, Filter, Building2, PlusCircle, BarChart3, Activity, TrendingUp, FileText, Heart, ShieldOff, Briefcase } from 'lucide-react';
import { StudentEngagementTab } from './StudentEngagementTab';
import { MentorMetricsTab } from './MentorMetricsTab';
import { supabase } from '../../services/supabase/config';
import { cn } from '../../utils/cn';
import { TEST_TEACHER_USERNAMES, TEST_MENTOR_IDS, TEST_STUDENT_IDS, isTestStudent, getExcludeTestData, setExcludeTestData } from '../../constants/testUsers';
import * as XLSX from 'xlsx';

interface SystemStats {
  total_teachers: number | bigint;
  total_students: number | bigint;
  total_mentors: number | bigint;
  total_coaches: number | bigint;
  total_assessments: number | bigint;
  total_assessments_created: number;
  total_lessons: number | bigint;
  active_teachers: number | bigint;
  locked_accounts: number | bigint;
  assessment_history: any;
  lesson_timeline: any;
  duration_analysis: any;
  teacher_usage: {
    username: string;
    name: string;
    total_logins: number | bigint;
    last_login: string;
    assessments_created: number | bigint;
    lessons_generated: number | bigint;
    students_managed: number | bigint;
    district_name?: string;
    district_id?: string;
    days_since_last_login: number;
    total_active_days: number | bigint;
    average_sessions_per_week: number;
    usage_frequency: string;
  }[];
  teacher_performance: {
    username: string;
    name: string;
    total_students: number;
    average_score: number;
    subjects: string[];
    student_improvement: number;
    district_id?: string;
    district_name?: string;
  }[];
  subject_breakdown: {
    subject: string;
    student_count: number;
    average_score: number;
  }[];
  student_progress: {
    student_id: number;
    initial_score: number;
    current_score: number;
    improvement: number;
    teacher: string;
    subject: string;
  }[];
}

function StatCard({ 
  title, 
  value, 
  icon: Icon,
  description 
}: { 
  title: string; 
  value: number | bigint; 
  icon: React.ElementType;
  description: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-svef-purple/10 p-3 rounded-lg">
          <Icon className="w-6 h-6 text-svef-purple" />
        </div>
        <h3 className="font-oswald text-xl font-medium text-svef-gray">
          {title}
        </h3>
      </div>
      <p className="text-3xl font-oswald text-svef-purple mb-2">
        {Number(value).toLocaleString()}
      </p>
      <p className="text-sm text-svef-gray">
        {description}
      </p>
    </div>
  );
}

export function SystemAnalytics() {
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [excludeTestData, setExcludeTestDataState] = useState<boolean>(getExcludeTestData());

  const toggleExcludeTestData = () => {
    const next = !excludeTestData;
    setExcludeTestDataState(next);
    setExcludeTestData(next);
  };

  // Fetch districts
  const { data: districts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_districts')
        .select('id, name, code')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ['systemAnalytics', selectedDistrict, excludeTestData],
    queryFn: async () => {
      try {
        // Fetch basic system analytics
        const { data: basicStats, error: basicError } = await supabase.rpc('get_system_analytics', { 
          p_district_id: selectedDistrict === 'all' ? null : selectedDistrict 
        });
        
        if (basicError) {
          console.error('Basic analytics error:', basicError);
        }

        // Fetch teacher usage data directly from tables
        const { data: teacherUsageData, error: usageError } = await supabase
          .from('teachers')
          .select(`
            username,
            name,
            last_login,
            login_count,
            account_status,
            account_locked,
            created_at,
            district_id,
            school_districts (
              name
            )
          `)
          .eq('account_status', 'active');

        if (usageError) {
          console.error('Teacher usage error:', usageError);
        }

        // Fetch teacher performance data
        const { data: performanceData, error: perfError } = await supabase
          .from('teachers')
          .select(`
            username,
            name,
            district_id,
            school_districts (
              name
            )
          `);

        if (perfError) {
          console.error('Performance data error:', perfError);
        }

        // Get quiz attempts and lesson plans for each teacher
        const { data: quizAttempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('teacher_username, score, total_questions, student_id, created_at, template_id');

        const { data: lessonPlans, error: lessonsError } = await supabase
          .from('lesson_plans')
          .select('teacher_username, student_id, objective, created_at, updated_at');

        const { data: groupLessonPlans, error: groupLessonsError } = await supabase
          .from('group_lesson_plans')
          .select('teacher_username, lesson_plan, created_at, updated_at');

        if (groupLessonsError) {
          console.error('Group lesson plans error:', groupLessonsError);
        }

        const { data: quizTemplates, error: templatesError } = await supabase
          .from('quiz_templates')
          .select('teacher_username, id, title');

        const { data: studentsData } = await supabase
          .from('students')
          .select('id, teacher_username, first_name');

        const { data: mentorsData } = await supabase
          .from('college_mentors')
          .select('id, full_name');

        const { data: coachesData } = await supabase
          .from('coaches')
          .select('id, full_name');

        // Process teacher usage data
        const filteredTeacherUsage = excludeTestData
          ? (teacherUsageData || []).filter(t => !TEST_TEACHER_USERNAMES.includes(t.username))
          : (teacherUsageData || []);
        const filteredQuizAttempts = excludeTestData
          ? (quizAttempts || []).filter(a => !TEST_TEACHER_USERNAMES.includes(a.teacher_username) && !TEST_STUDENT_IDS.includes(a.student_id))
          : (quizAttempts || []);
        const filteredLessonPlans = excludeTestData
          ? (lessonPlans || []).filter(l => !TEST_TEACHER_USERNAMES.includes(l.teacher_username))
          : (lessonPlans || []);
        const filteredGroupLessonPlans = excludeTestData
          ? (groupLessonPlans || []).filter(l => !TEST_TEACHER_USERNAMES.includes(l.teacher_username))
          : (groupLessonPlans || []);
        const filteredQuizTemplates = excludeTestData
          ? (quizTemplates || []).filter(q => !TEST_TEACHER_USERNAMES.includes(q.teacher_username))
          : (quizTemplates || []);
        const filteredStudents = excludeTestData
          ? (studentsData || []).filter(s => !TEST_TEACHER_USERNAMES.includes(s.teacher_username) && !isTestStudent(s.id, s.first_name))
          : (studentsData || []);
        const filteredMentors = excludeTestData
          ? (mentorsData || []).filter(m => !TEST_MENTOR_IDS.includes(m.id))
          : (mentorsData || []);
        const filteredCoaches = coachesData || [];
        const filteredPerformanceData = excludeTestData
          ? (performanceData || []).filter(t => !TEST_TEACHER_USERNAMES.includes(t.username))
          : (performanceData || []);

        const processedUsage = filteredTeacherUsage.map(teacher => {
          const daysSinceCreated = Math.floor((Date.now() - new Date(teacher.created_at).getTime()) / (1000 * 60 * 60 * 24));
          const daysSinceLastLogin = teacher.last_login 
            ? Math.floor((Date.now() - new Date(teacher.last_login).getTime()) / (1000 * 60 * 60 * 24))
            : null;
          
          const assessmentsCreated = filteredQuizTemplates.filter(q => q.teacher_username === teacher.username).length;
          const lessonsGenerated = filteredLessonPlans.filter(l => l.teacher_username === teacher.username).length + filteredGroupLessonPlans.filter(l => l.teacher_username === teacher.username).length;
          const studentsManaged = new Set(filteredQuizAttempts.filter(a => a.teacher_username === teacher.username).map(a => a.student_id)).size;
          
          const avgSessionsPerWeek = daysSinceCreated > 0 ? (teacher.login_count / (daysSinceCreated / 7)) : 0;
          
          let usageFrequency = 'Inactive';
          if (avgSessionsPerWeek >= 3) usageFrequency = 'Very Active';
          else if (avgSessionsPerWeek >= 2) usageFrequency = 'Active';
          else if (avgSessionsPerWeek >= 1) usageFrequency = 'Moderate';
          else if (avgSessionsPerWeek > 0) usageFrequency = 'Low Activity';

          return {
            username: teacher.username,
            name: teacher.name,
            total_logins: Number(teacher.login_count || 0),
            last_login: teacher.last_login,
            assessments_created: Number(assessmentsCreated),
            lessons_generated: Number(lessonsGenerated),
            students_managed: Number(studentsManaged),
            district_name: teacher.school_districts?.name || 'No District',
            days_since_last_login: daysSinceLastLogin,
            total_active_days: Number(daysSinceCreated),
            average_sessions_per_week: Number(avgSessionsPerWeek),
            usage_frequency: usageFrequency,
            district_id: teacher.district_id
          };
        });

        // Process teacher performance data
        const processedPerformance = filteredPerformanceData.map(teacher => {
          const teacherAttempts = filteredQuizAttempts.filter(a => a.teacher_username === teacher.username);
          const totalStudents = new Set(teacherAttempts.map(a => a.student_id)).size;
          const averageScore = teacherAttempts.length > 0 
            ? teacherAttempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total_questions * 100), 0) / teacherAttempts.length
            : 0;

          return {
            username: teacher.username,
            name: teacher.name,
            total_students: totalStudents,
            average_score: averageScore,
            subjects: ['Mathematics'], // Default subject
            student_improvement: 0, // Would need more complex calculation
            district_id: teacher.district_id,
            district_name: teacher.school_districts?.name || 'No District'
          };
        });

        // Transform quiz attempts for assessment history
        const processedAssessments = filteredQuizAttempts.map(attempt => {
          const createdDate = new Date(attempt.created_at || Date.now());
          const template = filteredQuizTemplates.find(t => t.id === attempt.template_id);
          return {
            last_lesson: template?.title || 'Assessment',
            student_id: attempt.student_id,
            score: attempt.score,
            total_questions: attempt.total_questions,
            created_at: createdDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp: createdDate
          };
        }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);

        // Transform lesson plans for timeline (both individual and group)
        const individualLessons = filteredLessonPlans.map(plan => {
          const createdDate = new Date(plan.created_at || Date.now());
          const updatedDate = new Date(plan.updated_at || plan.created_at || Date.now());
          return {
            objective: plan.objective || 'Lesson Plan',
            student_id: plan.student_id,
            created_at: createdDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            updated_at: updatedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp: createdDate
          };
        });
        const groupLessons = filteredGroupLessonPlans.map(plan => {
          const createdDate = new Date(plan.created_at || Date.now());
          const updatedDate = new Date(plan.updated_at || plan.created_at || Date.now());
          return {
            objective: plan.lesson_plan?.objective || 'Group Lesson Plan',
            student_id: 'Group',
            created_at: createdDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            updated_at: updatedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp: createdDate
          };
        });
        const processedLessons = [...individualLessons, ...groupLessons]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 50);

      return {
        total_teachers: filteredTeacherUsage.length,
        total_students: filteredStudents.length,
        total_mentors: filteredMentors.length,
        total_coaches: filteredCoaches.length,
        total_assessments: filteredQuizAttempts.length,
        total_assessments_created: filteredQuizTemplates.length,
        total_lessons: filteredLessonPlans.length + filteredGroupLessonPlans.length,
        active_teachers: filteredTeacherUsage.filter(t => !t.account_locked).length,
        locked_accounts: filteredTeacherUsage.filter(t => t.account_locked).length,
        assessment_history: { all_assessments: processedAssessments },
        teacher_usage: processedUsage,
        lesson_timeline: { lessons: processedLessons },
        duration_analysis: { student_breakdown: [] },
        teacher_performance: processedPerformance,
        subject_breakdown: [
          {
            subject: 'Mathematics',
            student_count: filteredStudents.length,
            average_score: filteredQuizAttempts.length > 0
              ? filteredQuizAttempts.reduce((sum, attempt) => sum + (attempt.score / attempt.total_questions * 100), 0) / filteredQuizAttempts.length
              : 0
          }
        ],
        student_progress: []
      };
      } catch (error) {
        console.error('Error fetching system analytics:', error);
        // Return fallback data structure to prevent complete failure
        return {
          total_teachers: 0,
          total_students: 0,
          total_mentors: 0,
          total_coaches: 0,
          total_assessments: 0,
          total_assessments_created: 0,
          total_lessons: 0,
          active_teachers: 0,
          locked_accounts: 0,
          assessment_history: { all_assessments: [] },
          teacher_usage: [],
          lesson_timeline: { lessons: [] },
          duration_analysis: { student_breakdown: [] },
          teacher_performance: [],
          subject_breakdown: [],
          student_progress: []
        };
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const handleExportData = async () => {
    if (!stats) return;

    const workbook = XLSX.utils.book_new();

    // 1. Overview Stats Sheet
    const overviewData = [{
      'Total Teachers': stats.total_teachers,
      'Total Students': stats.total_students,
      'Total Mentors': stats.total_mentors,
      'Total Coaches': stats.total_coaches,
      'Total Assessments Taken': stats.total_assessments,
      'Total Assessments Created': stats.total_assessments_created,
      'Total Lessons': stats.total_lessons,
      'Active Teachers': stats.active_teachers,
      'Locked Accounts': stats.locked_accounts
    }];
    const overviewSheet = XLSX.utils.json_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // 2. Teacher Usage Sheet
    const usageData = (stats.teacher_usage || []).map(t => ({
      'Teacher Name': t.name,
      'Username': t.username,
      'District': t.district_name || 'No District',
      'Usage Frequency': t.usage_frequency,
      'Total Logins': t.total_logins,
      'Average Sessions Per Week': t.average_sessions_per_week?.toFixed(1) || '0.0',
      'Total Active Days': t.total_active_days,
      'Days Since Last Login': t.days_since_last_login || 'Never',
      'Last Login': t.last_login ? new Date(t.last_login).toLocaleDateString() : 'Never',
      'Assessments Created': t.assessments_created,
      'Lessons Generated': t.lessons_generated,
      'Students Managed': t.students_managed
    }));
    const usageSheet = XLSX.utils.json_to_sheet(usageData);
    XLSX.utils.book_append_sheet(workbook, usageSheet, 'Teacher Usage');

    // 3. Student Engagement Data
    try {
      const { data: sessionLogs } = await supabase
        .from('student_session_logs')
        .select('*')
        .order('session_date', { ascending: false });

      const { data: allStudents } = await supabase
        .from('students')
        .select('id, teacher_username, first_name, last_initial');

      const { data: recentAttempts } = await supabase
        .from('quiz_attempts')
        .select('student_id, teacher_username, completed_at')
        .order('completed_at', { ascending: false });

      const filteredLogs = excludeTestData
        ? (sessionLogs || []).filter((l: any) => !TEST_TEACHER_USERNAMES.includes(l.teacher_username))
        : (sessionLogs || []);
      const filteredStudents = excludeTestData
        ? (allStudents || []).filter((s: any) => !TEST_TEACHER_USERNAMES.includes(s.teacher_username))
        : (allStudents || []);
      const filteredAttempts = excludeTestData
        ? (recentAttempts || []).filter((a: any) => !TEST_TEACHER_USERNAMES.includes(a.teacher_username))
        : (recentAttempts || []);

      const allLogs = filteredLogs;

      const studentNameMap = new Map<number, string>();
      filteredStudents.forEach((s: any) => {
        const name = [s.first_name, s.last_initial ? s.last_initial + '.' : ''].filter(Boolean).join(' ');
        studentNameMap.set(s.id, name || `#${s.id}`);
      });

      // Engagement Summary
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const confidenceRatings = allLogs.filter((l: any) => l.confidence_rating).map((l: any) => l.confidence_rating);
      const avgConf = confidenceRatings.length > 0 ? confidenceRatings.reduce((a: number, b: number) => a + b, 0) / confidenceRatings.length : 0;
      const uniqueStudentSet = new Set(allLogs.map((l: any) => `${l.student_id}-${l.teacher_username}`));

      const engagementSummary = [{
        'Total Session Logs': allLogs.length,
        'Students Logging': uniqueStudentSet.size,
        'Average Confidence': avgConf.toFixed(1) + '/5',
        'Logs This Week': allLogs.filter((l: any) => new Date(l.session_date) >= oneWeekAgo).length,
      }];
      const engagementSummarySheet = XLSX.utils.json_to_sheet(engagementSummary);
      XLSX.utils.book_append_sheet(workbook, engagementSummarySheet, 'Engagement Summary');

      // Most Practiced Topics
      const topicCounts: Record<string, number> = {};
      allLogs.forEach((l: any) => {
        (l.topics_practiced || []).forEach((t: string) => {
          topicCounts[t] = (topicCounts[t] || 0) + 1;
        });
      });
      const topicsData = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([topic, count]) => ({ 'Topic': topic, 'Times Practiced': count }));
      const topicsSheet = XLSX.utils.json_to_sheet(topicsData.length > 0 ? topicsData : [{ 'Topic': 'No data', 'Times Practiced': 0 }]);
      XLSX.utils.book_append_sheet(workbook, topicsSheet, 'Most Practiced Topics');

      // Confidence Distribution
      const confDist = [0, 0, 0, 0, 0];
      confidenceRatings.forEach((r: number) => { if (r >= 1 && r <= 5) confDist[r - 1]++; });
      const confLabels = ['Not confident (1)', 'A little (2)', 'Somewhat (3)', 'Confident (4)', 'Very confident (5)'];
      const confDistData = confDist.map((count, idx) => ({ 'Confidence Level': confLabels[idx], 'Count': count }));
      const confDistSheet = XLSX.utils.json_to_sheet(confDistData);
      XLSX.utils.book_append_sheet(workbook, confDistSheet, 'Confidence Distribution');

      // All Individual Students Activity (every student, not just top 15)
      const studentLogMap = new Map<string, { count: number; totalConfidence: number; confCount: number }>();
      allLogs.forEach((l: any) => {
        const key = `${l.student_id}-${l.teacher_username}`;
        const existing = studentLogMap.get(key) || { count: 0, totalConfidence: 0, confCount: 0 };
        existing.count++;
        if (l.confidence_rating) {
          existing.totalConfidence += l.confidence_rating;
          existing.confCount++;
        }
        studentLogMap.set(key, existing);
      });

      const activeLoggersData = Array.from(studentLogMap.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .map(([key, val]) => {
          const [studentId, ...teacherParts] = key.split('-');
          const teacher = teacherParts.join('-');
          const id = parseInt(studentId);
          return {
            'Student Name': studentNameMap.get(id) || `#${id}`,
            'Student ID': id,
            'Teacher': teacher,
            'Total Logs': val.count,
            'Avg Confidence': val.confCount > 0 ? (val.totalConfidence / val.confCount).toFixed(1) : 'N/A',
          };
        });
      const activeLoggersSheet = XLSX.utils.json_to_sheet(activeLoggersData.length > 0 ? activeLoggersData : [{ 'Student Name': 'No data', 'Student ID': '', 'Teacher': '', 'Total Logs': 0, 'Avg Confidence': '' }]);
      XLSX.utils.book_append_sheet(workbook, activeLoggersSheet, 'Student Activity');

      // Students With No Session Logs
      const studentsWithLogs = new Set(allLogs.map((l: any) => `${l.student_id}-${l.teacher_username}`));
      const attemptMap = new Map<string, string>();
      filteredAttempts.forEach((a: any) => {
        const key = `${a.student_id}-${a.teacher_username}`;
        if (!attemptMap.has(key)) attemptMap.set(key, a.completed_at);
      });

      const inactiveData = filteredStudents
        .filter((s: any) => !studentsWithLogs.has(`${s.id}-${s.teacher_username}`))
        .map((s: any) => ({
          'Student Name': studentNameMap.get(s.id) || `#${s.id}`,
          'Student ID': s.id,
          'Teacher': s.teacher_username,
          'Last Assessment': attemptMap.get(`${s.id}-${s.teacher_username}`)
            ? new Date(attemptMap.get(`${s.id}-${s.teacher_username}`)!).toLocaleDateString()
            : 'Never',
        }));
      const inactiveSheet = XLSX.utils.json_to_sheet(inactiveData.length > 0 ? inactiveData : [{ 'Student Name': 'All students have logs', 'Student ID': '', 'Teacher': '', 'Last Assessment': '' }]);
      XLSX.utils.book_append_sheet(workbook, inactiveSheet, 'Students No Logs');

      // All Session Logs (raw data)
      const rawLogsData = allLogs.map((l: any) => ({
        'Date': l.session_date,
        'Student Name': studentNameMap.get(l.student_id) || `#${l.student_id}`,
        'Student ID': l.student_id,
        'Teacher': l.teacher_username,
        'Topics Practiced': (l.topics_practiced || []).join('; '),
        'Confidence Rating': l.confidence_rating || '',
        'Self Reflection': l.self_reflection || '',
        'Notes': l.notes || '',
        'Logged At': l.created_at,
      }));
      const rawLogsSheet = XLSX.utils.json_to_sheet(rawLogsData.length > 0 ? rawLogsData : [{ 'Date': 'No data' }]);
      XLSX.utils.book_append_sheet(workbook, rawLogsSheet, 'All Session Logs');
    } catch (e) {
      console.error('Error fetching engagement data for export:', e);
    }

    // 4. Mentor Sessions Data
    try {
      const { data: mentors } = await supabase
        .from('college_mentors')
        .select('id, full_name, email');

      const { data: sessions } = await supabase
        .from('mentor_sessions')
        .select('id, mentor_id, group_id, session_date, tutoring_minutes, used_lesson_plan, is_ad_hoc, ad_hoc_teacher_username, curriculum_feedback, college_mentors(full_name), mentor_groups(name)')
        .order('session_date', { ascending: false });

      const { data: assignments } = await supabase
        .from('mentor_group_assignments')
        .select('mentor_id, group_id');

      const allMentors = excludeTestData
        ? (mentors || []).filter((m: any) => !TEST_MENTOR_IDS.includes(m.id))
        : (mentors || []);
      const allSessions = excludeTestData
        ? (sessions || []).filter((s: any) => !TEST_MENTOR_IDS.includes(s.mentor_id))
        : (sessions || []);
      const allAssignments = excludeTestData
        ? (assignments || []).filter((a: any) => !TEST_MENTOR_IDS.includes(a.mentor_id))
        : (assignments || []);

      const mentorNameMap = new Map(allMentors.map((m: any) => [m.id, m.full_name]));

      // Mentor Summary
      const mentorGroupMap = new Map<string, Set<string>>();
      allAssignments.forEach((a: any) => {
        const existing = mentorGroupMap.get(a.mentor_id) || new Set();
        existing.add(a.group_id);
        mentorGroupMap.set(a.mentor_id, existing);
      });

      const mentorSessionMap = new Map<string, any[]>();
      allSessions.forEach((s: any) => {
        const existing = mentorSessionMap.get(s.mentor_id) || [];
        existing.push(s);
        mentorSessionMap.set(s.mentor_id, existing);
      });

      const mentorSummaryData = allMentors.map((m: any) => {
        const mSessions = mentorSessionMap.get(m.id) || [];
        const mGroups = mentorGroupMap.get(m.id) || new Set();
        const mMinutes = mSessions.reduce((sum: number, s: any) => sum + (s.tutoring_minutes || 0), 0);
        const mPlanCount = mSessions.filter((s: any) => s.used_lesson_plan).length;
        const lastSession = mSessions.length > 0 ? mSessions[0].session_date : null;

        return {
          'Mentor Name': m.full_name,
          'Email': m.email,
          'Status': m.status,
          'Total Sessions': mSessions.length,
          'Total Minutes': mMinutes,
          'Used Lesson Plan': mPlanCount,
          'Groups Assigned': mGroups.size,
          'Last Session': lastSession || 'Never',
        };
      }).sort((a, b) => b['Total Sessions'] - a['Total Sessions']);

      const mentorSummarySheet = XLSX.utils.json_to_sheet(mentorSummaryData.length > 0 ? mentorSummaryData : [{ 'Mentor Name': 'No mentors' }]);
      XLSX.utils.book_append_sheet(workbook, mentorSummarySheet, 'Mentor Summary');

      // All Mentor Sessions (detailed)
      const mentorSessionsData = allSessions.map((s: any) => ({
        'Date': s.session_date,
        'Mentor': s.college_mentors?.full_name || mentorNameMap.get(s.mentor_id) || 'Unknown',
        'Group': s.is_ad_hoc ? `Ad-hoc (${s.ad_hoc_teacher_username || ''})` : (s.mentor_groups?.name || 'Unknown'),
        'Duration (min)': s.tutoring_minutes || 0,
        'Used Lesson Plan': s.used_lesson_plan ? 'Yes' : 'No',
        'Ad Hoc': s.is_ad_hoc ? 'Yes' : 'No',
        'Feedback/Notes': s.curriculum_feedback || '',
      }));
      const mentorSessionsSheet = XLSX.utils.json_to_sheet(mentorSessionsData.length > 0 ? mentorSessionsData : [{ 'Date': 'No sessions' }]);
      XLSX.utils.book_append_sheet(workbook, mentorSessionsSheet, 'Mentor Sessions');
    } catch (e) {
      console.error('Error fetching mentor data for export:', e);
    }

    XLSX.writeFile(workbook, 'system-analytics.xlsx');
  };

  const filteredTeachers = stats?.teacher_performance.filter(t => {
    return true;
  });
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'usage', label: 'Teacher Usage', icon: Activity },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'engagement', label: 'Student Engagement', icon: FileText },
    { id: 'mentors', label: 'Mentor Metrics', icon: Heart },
    { id: 'history', label: 'History & Timeline', icon: History },
    { id: 'duration', label: 'Duration Analysis', icon: Clock }
  ];

  if (isLoading || !stats) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center mb-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-svef-purple"></div>
          <span className="ml-3 text-svef-gray">Loading analytics data...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gray-200 p-3 rounded-lg w-12 h-12" />
              <div className="h-6 bg-gray-200 rounded w-32" />
            </div>
            <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-48" />
          </div>
        ))}
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Teachers"
                value={stats.total_teachers}
                icon={GraduationCap}
                description="Total registered teacher accounts"
              />
              <StatCard
                title="Total Students"
                value={stats.total_students}
                icon={Users}
                description="Total students across all teachers"
              />
              <StatCard
                title="Total Mentors"
                value={stats.total_mentors}
                icon={Heart}
                description="College mentors registered"
              />
              <StatCard
                title="Total Coaches"
                value={stats.total_coaches}
                icon={Briefcase}
                description="Coaches registered"
              />
              <StatCard
                title="Total Assessments Taken"
                value={stats.total_assessments}
                icon={ClipboardCheck}
                description="Total assessments completed by students"
              />
              <StatCard
               title="Assessments Created"
               value={stats.total_assessments_created || 0}
                icon={PlusCircle}
                description="Total assessments created by teachers"
              />
              <StatCard
                title="Total Lessons"
                value={stats.total_lessons}
                icon={BookOpen}
                description="Total lesson plans generated"
              />
              <StatCard
                title="Active Teachers"
                value={stats.active_teachers}
                icon={UserCheck}
                description="Teachers active in the last 30 days"
              />
              <StatCard
                title="Locked Accounts"
                value={stats.locked_accounts}
                icon={Lock}
                description="Currently locked teacher accounts"
              />
            </div>

            {/* Subject Breakdown */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-oswald text-xl font-medium text-svef-gray mb-4">Subject Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.subject_breakdown.map((subject) => (
                  <div key={subject.subject} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-svef-gray mb-2">{subject.subject}</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Students:</span>
                        <span className="font-medium">{Number(subject.student_count)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Average Score:</span>
                        <span className="font-medium">{Number(subject.average_score).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'usage':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-oswald text-xl font-medium text-svef-gray mb-4">Teacher Usage Analytics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => {
                        if (sortField === 'name') {
                          setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('name');
                          setSortDirection('asc');
                        }
                      }}
                    >
                      Teacher Name
                      {sortField === 'name' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Frequency</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => {
                        if (sortField === 'total_logins') {
                          setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('total_logins');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      Total Logins
                      {sortField === 'total_logins' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => {
                        if (sortField === 'average_sessions_per_week') {
                          setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('average_sessions_per_week');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      Sessions/Week
                      {sortField === 'average_sessions_per_week' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => {
                        if (sortField === 'assessments_created') {
                          setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('assessments_created');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      Assessments Created
                      {sortField === 'assessments_created' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                      onClick={() => {
                        if (sortField === 'lessons_generated') {
                          setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortField('lessons_generated');
                          setSortDirection('desc');
                        }
                      }}
                    >
                      Lessons Generated
                      {sortField === 'lessons_generated' && (
                        <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(stats.teacher_usage || [])
                    .filter(t => {
                      if (selectedDistrict === 'all') return true;
                      return t.district_id === selectedDistrict;
                    })
                    .sort((a, b) => {
                      const aValue = a[sortField as keyof typeof a];
                      const bValue = b[sortField as keyof typeof b];
                      if (typeof aValue === 'number' && typeof bValue === 'number') {
                        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                      }
                      return sortDirection === 'asc' 
                        ? String(aValue).localeCompare(String(bValue))
                        : String(bValue).localeCompare(String(aValue));
                    })
                    .map((teacher) => (
                    <tr key={teacher.username}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {teacher.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {teacher.district_name || 'No District'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          "px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full",
                          teacher.usage_frequency === 'Very Active' ? "bg-green-100 text-green-800" :
                          teacher.usage_frequency === 'Active' ? "bg-blue-100 text-blue-800" :
                          teacher.usage_frequency === 'Moderate' ? "bg-yellow-100 text-yellow-800" :
                          teacher.usage_frequency === 'Low Activity' ? "bg-orange-100 text-orange-800" :
                          "bg-red-100 text-red-800"
                        )}>
                          {teacher.usage_frequency}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className={cn(
                            "font-medium",
                            Number(teacher.total_logins) > 10 ? "text-green-600" :
                            Number(teacher.total_logins) > 5 ? "text-yellow-600" :
                            "text-red-600"
                          )}>
                            {Number(teacher.total_logins)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className={cn(
                            "font-medium",
                            Number(teacher.average_sessions_per_week || 0) >= 2 ? "text-green-600" :
                            Number(teacher.average_sessions_per_week || 0) >= 1 ? "text-yellow-600" :
                            "text-red-600"
                          )}>
                            {Number(teacher.average_sessions_per_week || 0).toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className={cn(
                            "font-medium",
                            Number(teacher.total_active_days) > 20 ? "text-green-600" :
                            Number(teacher.total_active_days) > 10 ? "text-yellow-600" :
                            "text-red-600"
                          )}>
                            {Number(teacher.total_active_days)}
                          </span>
                          <span className="ml-1 text-xs text-gray-400">days</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div>{teacher.last_login ? new Date(teacher.last_login).toLocaleDateString() : 'Never'}</div>
                          {teacher.days_since_last_login !== null && (
                            <div className="text-xs text-gray-400">
                              {teacher.days_since_last_login === 0 ? 'Today' : 
                               teacher.days_since_last_login === 1 ? '1 day ago' :
                               `${teacher.days_since_last_login} days ago`}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className={cn(
                            "font-medium",
                            Number(teacher.assessments_created) > 2 ? "text-green-600" :
                            Number(teacher.assessments_created) > 0 ? "text-yellow-600" :
                            "text-red-600"
                          )}>
                            {Number(teacher.assessments_created)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className={cn(
                            "font-medium",
                            Number(teacher.lessons_generated) > 10 ? "text-green-600" :
                            Number(teacher.lessons_generated) > 5 ? "text-yellow-600" :
                            "text-red-600"
                          )}>
                            {Number(teacher.lessons_generated)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {Number(teacher.students_managed)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            {/* Teacher Performance Table */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-oswald text-xl font-medium text-svef-gray mb-4">Teacher Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                        onClick={() => {
                          if (sortField === 'name') {
                            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortField('name');
                            setSortDirection('asc');
                          }
                        }}
                      >
                        Teacher Name
                        {sortField === 'name' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subjects</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg. Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Improvement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(stats.teacher_performance || [])
                      .filter(t => {
                        if (selectedDistrict === 'all') return true;
                        return t.district_id === selectedDistrict;
                      })
                      .sort((a, b) => {
                        const aValue = a[sortField as keyof typeof a];
                        const bValue = b[sortField as keyof typeof b];
                        if (typeof aValue === 'number' && typeof bValue === 'number') {
                          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
                        }
                        return sortDirection === 'asc' 
                          ? String(aValue).localeCompare(String(bValue))
                          : String(bValue).localeCompare(String(aValue));
                      })
                      .map((teacher) => (
                      <tr key={teacher.username}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {teacher.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {teacher.subjects.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Number(teacher.total_students)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Number(teacher.average_score).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {teacher.student_improvement > 0 ? (
                              <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                            ) : teacher.student_improvement < 0 ? (
                              <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                            ) : (
                              <Minus className="w-4 h-4 text-yellow-500 mr-1" />
                            )}
                            <span className={cn(
                              "text-sm",
                              teacher.student_improvement > 0 ? "text-green-500" :
                              teacher.student_improvement < 0 ? "text-red-500" :
                              "text-yellow-500"
                            )}>
                              {Math.abs(Number(teacher.student_improvement)).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Student Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-oswald text-xl font-medium text-svef-gray mb-4">Student Progress Overview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Initial Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Score</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Improvement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(stats.student_progress || []).map((student) => (
                      <tr key={student.student_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{student.student_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.teacher}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Number(student.initial_score).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {Number(student.current_score).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {student.improvement > 0 ? (
                              <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                            ) : student.improvement < 0 ? (
                              <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                            ) : (
                              <Minus className="w-4 h-4 text-yellow-500 mr-1" />
                            )}
                            <span className={cn(
                              "text-sm",
                              student.improvement > 0 ? "text-green-500" :
                              student.improvement < 0 ? "text-red-500" :
                              "text-yellow-500"
                            )}>
                              {Math.abs(Number(student.improvement)).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'engagement':
        return <StudentEngagementTab excludeTestData={excludeTestData} />;

      case 'mentors':
        return <MentorMetricsTab excludeTestData={excludeTestData} />;

      case 'history':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assessment History */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-6">
                <History className="w-6 h-6 text-svef-purple" />
                <h3 className="font-oswald text-xl font-medium text-svef-gray">Assessment History</h3>
              </div>
              <div className="space-y-4">
                {stats?.assessment_history?.all_assessments?.length > 0 ? (
                  stats.assessment_history.all_assessments.map((assessment: any, index: number) => (
                    <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{assessment.last_lesson}</p>
                          <p className="text-sm text-gray-500">Student #{assessment.student_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-svef-purple">
                            {assessment.score}/{assessment.total_questions}
                          </p>
                          <p className="text-xs text-gray-500">{assessment.created_at}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No assessment history available yet.</p>
                    <p className="text-sm mt-2">Assessments will appear here once students complete quizzes.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lesson Timeline */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Clock className="w-6 h-6 text-svef-purple" />
                <h3 className="font-oswald text-xl font-medium text-svef-gray">Lesson Timeline</h3>
              </div>
              <div className="space-y-4">
                {stats?.lesson_timeline?.lessons?.length > 0 ? (
                  stats.lesson_timeline.lessons.map((lesson: any, index: number) => (
                    <div key={index} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{lesson.objective}</p>
                          <p className="text-sm text-gray-500">Student #{lesson.student_id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Created: {lesson.created_at}</p>
                          <p className="text-xs text-gray-500">Updated: {lesson.updated_at}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No lesson plans available yet.</p>
                    <p className="text-sm mt-2">Lesson plans will appear here once teachers generate them.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'duration':
        return (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center space-x-2 mb-6">
              <AlertTriangle className="w-6 h-6 text-svef-purple" />
              <h3 className="font-oswald text-xl font-medium text-svef-gray">Assessment Duration Analysis</h3>
            </div>
            
            {stats?.duration_analysis?.average_duration && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700">Average Duration</p>
                <p className="text-2xl font-oswald text-svef-purple">{stats.duration_analysis.average_duration}</p>
              </div>
            )}

            <div className="space-y-6">
              {stats?.duration_analysis?.student_breakdown?.map((student: any, index: number) => (
                <div key={index} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="font-medium text-gray-900">Student #{student.student_id}</p>
                      <p className="text-sm text-gray-500">Average: {student.average_duration}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {student.attempts.map((attempt: any, attemptIndex: number) => (
                      <div 
                        key={attemptIndex}
                        className={cn(
                          "p-3 rounded-lg",
                          attempt.duration > stats.duration_analysis.average_duration
                            ? "bg-yellow-50"
                            : "bg-green-50"
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">
                              Score: {attempt.score}/{attempt.total_questions}
                            </p>
                            <p className="text-xs text-gray-500">
                              Duration: {attempt.duration}
                            </p>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <p>Start: {attempt.start_time}</p>
                            <p>End: {attempt.completion_time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {stats?.duration_analysis?.outliers?.length > 0 && (
              <div className="mt-8">
                <h4 className="font-medium text-gray-900 mb-4">Notable Outliers</h4>
                <div className="space-y-3">
                  {stats.duration_analysis.outliers.map((outlier: any, index: number) => (
                    <div 
                      key={index}
                      className={cn(
                        "p-4 rounded-lg",
                        outlier.type === 'long' ? "bg-red-50" : "bg-blue-50"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            Student #{outlier.student_id}
                          </p>
                          <p className="text-sm text-gray-500">
                            Duration: {outlier.duration}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p>Start: {outlier.start_time}</p>
                          <p>End: {outlier.completion_time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-oswald font-medium text-svef-gray">
          Analytics Dashboard
        </h2>
        <button
          onClick={handleExportData}
          className="inline-flex items-center px-4 py-2 bg-svef-purple text-white rounded-md hover:bg-svef-purple/90"
        >
          <Download className="w-4 h-4 mr-2" />
          Export to Excel
        </button>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-svef-gray" />
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-svef-gray" />
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5"
            >
              <option value="all">All Districts</option>
              {districts.map(district => (
                <option key={district.id} value={district.id}>
                  {district.name} ({district.code})
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={toggleExcludeTestData}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors',
            excludeTestData
              ? 'bg-teal-50 border-teal-300 text-teal-700'
              : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
          )}
        >
          <ShieldOff className="w-3.5 h-3.5" />
          {excludeTestData ? 'Test Data Excluded' : 'Exclude Test Data'}
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Analytics tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                    activeTab === tab.id
                      ? "border-svef-purple text-svef-purple"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}