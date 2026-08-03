import * as XLSX from 'xlsx';
import JSZip from 'jszip';

function sanitizeCell(value: any): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function sanitizeRow(row: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    clean[key] = sanitizeCell(value);
  }
  return clean;
}

export interface SheetData {
  name: string;
  data: Record<string, any>[];
}

export function buildDataDictionary(
  selectedSheets: string[],
  filters: { dateFrom: string | null; dateTo: string | null; districts: string[] }
): Record<string, any>[] {
  const STUDENT_IDENTITY_COLS = [
    { name: 'student_id', type: 'integer', description: 'Numeric student identifier' },
    { name: 'student_name', type: 'text', description: 'Student first name + last initial (e.g., "Jose Q.")' },
    { name: 'student_emoji', type: 'text', description: 'Emoji used as the student login password' },
    { name: 'student_identifier', type: 'text', description: 'Full identifier combining name + emoji (e.g., "Jose Q. lion") for matching in Salesforce' },
    { name: 'salesforce_id', type: 'text', description: 'External Salesforce record ID (if linked)' },
  ];

  const definitions: Record<string, { columns: { name: string; type: string; description: string }[] }> = {
    'Quiz Attempts (Raw)': {
      columns: [
        { name: 'teacher_username', type: 'text', description: 'Teacher account username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        ...STUDENT_IDENTITY_COLS,
        { name: 'quiz_title', type: 'text', description: 'Title of the quiz template' },
        { name: 'topic', type: 'text', description: 'Main math topic of the quiz' },
        { name: 'subtopics', type: 'text', description: 'Semicolon-separated list of subtopics' },
        { name: 'grade_level', type: 'text', description: 'Grade level the quiz targets' },
        { name: 'difficulty', type: 'text', description: 'Quiz difficulty: easy, medium, or hard' },
        { name: 'num_questions', type: 'integer', description: 'Total questions on the quiz template' },
        { name: 'score', type: 'integer', description: 'Number of correct answers on this attempt' },
        { name: 'total_questions', type: 'integer', description: 'Total questions answered in this attempt' },
        { name: 'percent_correct', type: 'integer', description: 'Score as a percentage (0-100)' },
        { name: 'duration_seconds', type: 'integer', description: 'Time spent on the quiz in seconds' },
        { name: 'start_time', type: 'timestamp', description: 'When the student started the quiz' },
        { name: 'completed_at', type: 'timestamp', description: 'When the student submitted the quiz' },
        { name: 'question_number', type: 'integer', description: 'Position of this question within the quiz (1-based)' },
        { name: 'question_text', type: 'text', description: 'Full text of the question shown to the student' },
        { name: 'student_answer', type: 'text', description: 'The answer the student selected or typed' },
        { name: 'is_correct', type: 'text', description: 'Whether the answer was correct: Yes or No' },
        { name: 'question_subtopic', type: 'text', description: 'Specific subtopic this question assesses' },
      ],
    },
    'Lesson Plans': {
      columns: [
        { name: 'teacher_username', type: 'text', description: 'Teacher account username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        ...STUDENT_IDENTITY_COLS,
        { name: 'em_reference', type: 'text', description: 'Elevate Math curriculum reference cited by the lesson (e.g., "EM 5 — Module 2: Fractions")' },
        { name: 'objective', type: 'text', description: 'Learning objective of the lesson' },
        { name: 'duration_minutes', type: 'integer', description: 'Planned lesson duration in minutes' },
        { name: 'engagement', type: 'text', description: 'UDL engagement strategies (semicolon-separated)' },
        { name: 'representation', type: 'text', description: 'UDL representation strategies (semicolon-separated)' },
        { name: 'action_expression', type: 'text', description: 'UDL action/expression strategies (semicolon-separated)' },
        { name: 'wrapup', type: 'text', description: 'Lesson wrap-up strategies (semicolon-separated)' },
        { name: 'dok_engagement', type: 'integer', description: 'Depth of Knowledge level for engagement (1-4)' },
        { name: 'dok_representation', type: 'integer', description: 'Depth of Knowledge level for representation (1-4)' },
        { name: 'dok_action_expression', type: 'integer', description: 'Depth of Knowledge level for action/expression (1-4)' },
        { name: 'dok_wrapup', type: 'integer', description: 'Depth of Knowledge level for wrapup (1-4)' },
        { name: 'aligned_standards', type: 'text', description: 'California math standard codes aligned to this lesson' },
        { name: 'created_at', type: 'timestamp', description: 'When the lesson plan was generated' },
        { name: 'updated_at', type: 'timestamp', description: 'When the lesson plan was last modified' },
      ],
    },
    'Weekly Groups': {
      columns: [
        { name: 'group_id', type: 'uuid', description: 'Unique group identifier (repeats for every student row)' },
        { name: 'teacher_username', type: 'text', description: 'Teacher account username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'week_start_date', type: 'date', description: 'Monday of the week this group was created for' },
        { name: 'focus_areas', type: 'text', description: 'Math topics this group should focus on (semicolon-separated)' },
        { name: 'group_size', type: 'integer', description: 'Number of students in the group' },
        { name: 'recommended_approach', type: 'text', description: 'AI-recommended teaching approach for this group' },
        { name: 'has_lesson_plan', type: 'text', description: 'Whether a lesson plan was generated: Yes or No' },
        { name: 'created_at', type: 'timestamp', description: 'When this group was created' },
        ...STUDENT_IDENTITY_COLS,
      ],
    },
    'Classroom Analytics': {
      columns: [
        { name: 'teacher_username', type: 'text', description: 'Teacher account username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'total_students', type: 'integer', description: 'Number of students at time of snapshot' },
        { name: 'average_score', type: 'integer', description: 'Class average score at time of snapshot' },
        { name: 'total_assessments', type: 'integer', description: 'Total assessments completed at snapshot time' },
        { name: 'top_struggle_areas', type: 'text', description: 'Top 5 struggle areas (semicolon-separated)' },
        { name: 'insights', type: 'text', description: 'AI-generated insights about classroom performance' },
        { name: 'recommendations', type: 'text', description: 'AI-generated teaching recommendations' },
        { name: 'snapshot_date', type: 'timestamp', description: 'When this analytics snapshot was taken' },
      ],
    },
    'Mentor Sessions': {
      columns: [
        { name: 'mentor_name', type: 'text', description: 'College mentor full name' },
        { name: 'mentor_university', type: 'text', description: 'University the mentor attends' },
        { name: 'mentor_major', type: 'text', description: 'Mentor academic major' },
        { name: 'group_name', type: 'text', description: 'Name of the tutoring group' },
        { name: 'group_subject', type: 'text', description: 'Subject the group focuses on' },
        { name: 'group_grade_level', type: 'text', description: 'Grade level of students in the group' },
        { name: 'teacher_username', type: 'text', description: 'Assigned teacher username' },
        { name: 'teacher_name', type: 'text', description: 'Assigned teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'session_date', type: 'date', description: 'Date the tutoring session took place' },
        { name: 'tutoring_minutes', type: 'integer', description: 'Duration of the session in minutes' },
        { name: 'used_lesson_plan', type: 'text', description: 'Whether the mentor used the lesson plan: Yes or No' },
        { name: 'lesson_plan_comments', type: 'text', description: 'Mentor comments on the lesson plan' },
        { name: 'curriculum_feedback', type: 'text', description: 'Mentor feedback on curriculum' },
        { name: 'attendance_notes', type: 'text', description: 'Notes about student attendance' },
      ],
    },
    'Teacher Activity': {
      columns: [
        { name: 'teacher_username', type: 'text', description: 'Teacher account username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'account_status', type: 'text', description: 'Account status: active, inactive, or locked' },
        { name: 'login_count', type: 'integer', description: 'Total number of logins' },
        { name: 'last_login', type: 'timestamp', description: 'Most recent login timestamp' },
        { name: 'account_created', type: 'timestamp', description: 'When the account was created' },
        { name: 'total_students', type: 'integer', description: 'Number of students assigned to this teacher' },
        { name: 'assessments_created', type: 'integer', description: 'Number of quiz templates created' },
        { name: 'total_quiz_attempts', type: 'integer', description: 'Total quiz attempts by students' },
        { name: 'total_exit_tickets', type: 'integer', description: 'Total exit tickets completed' },
        { name: 'total_lesson_plans', type: 'integer', description: 'Total lesson plans generated' },
      ],
    },
    'Teacher Usage': {
      columns: [
        { name: 'teacher_username', type: 'text', description: 'Teacher account username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'account_status', type: 'text', description: 'Account status (active, inactive, locked)' },
        { name: 'account_created', type: 'timestamp', description: 'When the account was created' },
        { name: 'last_login', type: 'timestamp', description: 'Most recent login timestamp' },
        { name: 'days_since_last_login', type: 'integer', description: 'Days since last login (empty if never)' },
        { name: 'login_count', type: 'integer', description: 'Lifetime login count' },
        { name: 'total_students', type: 'integer', description: 'Number of students on teacher roster' },
        { name: 'quiz_attempts_last_30d', type: 'integer', description: 'Student quiz attempts under this teacher in last 30 days' },
        { name: 'exit_tickets_last_30d', type: 'integer', description: 'Exit tickets submitted in last 30 days' },
        { name: 'lesson_plans_last_30d', type: 'integer', description: 'Lesson plans generated in last 30 days' },
        { name: 'is_inactive_30d', type: 'text', description: 'Yes if no activity in last 30 days; used for fidelity flagging' },
      ],
    },
    'Mentor Usage': {
      columns: [
        { name: 'mentor_id', type: 'uuid', description: 'Unique mentor identifier' },
        { name: 'mentor_name', type: 'text', description: 'Mentor full name' },
        { name: 'university', type: 'text', description: 'University the mentor attends' },
        { name: 'major', type: 'text', description: 'Mentor academic major' },
        { name: 'account_status', type: 'text', description: 'Account status' },
        { name: 'account_created', type: 'timestamp', description: 'When the mentor account was created' },
        { name: 'last_login', type: 'timestamp', description: 'Most recent mentor login' },
        { name: 'days_since_last_login', type: 'integer', description: 'Days since last mentor login' },
        { name: 'total_sessions', type: 'integer', description: 'Total tutoring sessions recorded (within date range)' },
        { name: 'total_tutoring_minutes', type: 'integer', description: 'Sum of tutoring minutes across sessions' },
        { name: 'average_session_minutes', type: 'integer', description: 'Average minutes per session' },
        { name: 'sessions_with_time_override', type: 'integer', description: 'Count of sessions where mentor manually adjusted time vs. the timer' },
        { name: 'sessions_last_30d', type: 'integer', description: 'Sessions created in last 30 days' },
        { name: 'is_inactive_30d', type: 'text', description: 'Yes if no sessions recorded in last 30 days' },
      ],
    },
    'Mentor Sessions (Detailed)': {
      columns: [
        { name: 'session_id', type: 'uuid', description: 'Unique session identifier' },
        { name: 'session_date', type: 'date', description: 'Date the session took place' },
        { name: 'mentor_name', type: 'text', description: 'College mentor full name' },
        { name: 'mentor_university', type: 'text', description: 'Mentor university' },
        { name: 'mentor_major', type: 'text', description: 'Mentor major' },
        { name: 'teacher_username', type: 'text', description: 'Assigned teacher username (from group or ad-hoc)' },
        { name: 'teacher_name', type: 'text', description: 'Assigned teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'group_name', type: 'text', description: 'Tutoring group name (or Ad-hoc session)' },
        { name: 'group_grade_level', type: 'text', description: 'Grade level' },
        { name: 'group_subject', type: 'text', description: 'Subject' },
        { name: 'is_ad_hoc', type: 'text', description: 'Yes if this was an ad-hoc (unscheduled) session' },
        { name: 'tutoring_minutes', type: 'integer', description: 'Minutes recorded for the session (what counts for reporting)' },
        { name: 'timer_minutes', type: 'integer', description: 'Minutes tracked by the in-app timer' },
        { name: 'time_manually_adjusted', type: 'text', description: 'Yes if mentor manually overrode the timer-derived duration' },
        { name: 'minutes_adjustment', type: 'integer', description: 'Signed delta: tutoring_minutes minus timer_minutes' },
        { name: 'used_lesson_plan', type: 'text', description: 'Whether the mentor used the provided lesson plan' },
        { name: 'resource_used', type: 'text', description: 'Which resource the mentor used' },
        { name: 'lesson_plan_comments', type: 'text', description: 'Mentor comments on the lesson plan' },
        { name: 'curriculum_feedback', type: 'text', description: 'Mentor feedback on curriculum' },
        { name: 'attendance_notes', type: 'text', description: 'Free-text attendance notes' },
        { name: 'created_at', type: 'timestamp', description: 'When the session record was created' },
      ],
    },
    'Session Attendance': {
      columns: [
        { name: 'session_id', type: 'uuid', description: 'Session identifier' },
        { name: 'session_date', type: 'date', description: 'Session date' },
        { name: 'mentor_name', type: 'text', description: 'Mentor who ran the session' },
        { name: 'group_name', type: 'text', description: 'Group name' },
        { name: 'teacher_username', type: 'text', description: 'Teacher username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        ...STUDENT_IDENTITY_COLS,
        { name: 'present', type: 'text', description: 'Yes if the student attended the session, No otherwise' },
        { name: 'session_minutes', type: 'integer', description: 'Duration of the session' },
      ],
    },
    'Student Tutor Sessions (Individual)': {
      columns: [
        ...STUDENT_IDENTITY_COLS,
        { name: 'student_grade_level', type: 'text', description: 'Student grade level' },
        { name: 'teacher_username', type: 'text', description: 'Teacher username linked to session (via group or ad-hoc)' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'session_id', type: 'uuid', description: 'Unique session identifier' },
        { name: 'session_date', type: 'date', description: 'Date of the tutoring session' },
        { name: 'mentor_name', type: 'text', description: 'Mentor who ran the session' },
        { name: 'group_name', type: 'text', description: 'Group name (or Ad-hoc session)' },
        { name: 'is_ad_hoc', type: 'text', description: 'Yes if ad-hoc/unscheduled session, No otherwise' },
        { name: 'present', type: 'text', description: 'Yes if student attended, No if absent' },
        { name: 'session_minutes', type: 'integer', description: 'Duration of the session in minutes' },
      ],
    },
    'Student Roster': {
      columns: [
        ...STUDENT_IDENTITY_COLS,
        { name: 'grade_level', type: 'text', description: 'Grade level' },
        { name: 'subject', type: 'text', description: 'Primary subject' },
        { name: 'teacher_username', type: 'text', description: 'Assigned teacher username' },
        { name: 'teacher_name', type: 'text', description: 'Assigned teacher name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'last_seen', type: 'timestamp', description: 'Most recent time the student logged in' },
        { name: 'enrolled_at', type: 'timestamp', description: 'When the student was added to the roster' },
      ],
    },
    'Student Sessions (Instances)': {
      columns: [
        { name: 'log_id', type: 'uuid', description: 'Unique log identifier' },
        { name: 'session_date', type: 'date', description: 'Date of the tutoring session' },
        ...STUDENT_IDENTITY_COLS,
        { name: 'teacher_username', type: 'text', description: 'Teacher username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'tutoring_minutes', type: 'integer', description: 'Minutes from the associated mentor session (if linked)' },
        { name: 'mentor_session_id', type: 'uuid', description: 'Linked mentor session id (if any)' },
        { name: 'topics_practiced', type: 'text', description: 'Topics practiced during the session (semicolon-separated)' },
        { name: 'confidence_rating', type: 'integer', description: 'Student-reported confidence (1-5 scale) after the session' },
        { name: 'self_reflection', type: 'text', description: 'Student reflection text' },
        { name: 'notes', type: 'text', description: 'Additional notes' },
        { name: 'logged_at', type: 'timestamp', description: 'When the log was created' },
      ],
    },
    'Student Assessments (Instances)': {
      columns: [
        { name: 'attempt_id', type: 'uuid', description: 'Unique quiz attempt identifier' },
        { name: 'attempt_date', type: 'timestamp', description: 'When the attempt was recorded' },
        ...STUDENT_IDENTITY_COLS,
        { name: 'teacher_username', type: 'text', description: 'Teacher username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'quiz_title', type: 'text', description: 'Quiz title' },
        { name: 'topic', type: 'text', description: 'Quiz main topic' },
        { name: 'subtopics', type: 'text', description: 'Subtopics' },
        { name: 'grade_level', type: 'text', description: 'Grade level targeted' },
        { name: 'difficulty', type: 'text', description: 'Quiz difficulty' },
        { name: 'score', type: 'integer', description: 'Number correct' },
        { name: 'total_questions', type: 'integer', description: 'Total questions on the quiz' },
        { name: 'percent_correct', type: 'integer', description: 'Score as percentage' },
        { name: 'duration_seconds', type: 'integer', description: 'Time spent on the quiz' },
        { name: 'start_time', type: 'timestamp', description: 'Quiz start time' },
        { name: 'completed_at', type: 'timestamp', description: 'Quiz completion time' },
        { name: 'standards_assessed', type: 'text', description: 'California math standards observed in this attempt' },
      ],
    },
    'Student Growth': {
      columns: [
        ...STUDENT_IDENTITY_COLS,
        { name: 'teacher_username', type: 'text', description: 'Teacher username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'total_quiz_attempts', type: 'integer', description: 'Lifetime count of quiz attempts' },
        { name: 'total_exit_tickets', type: 'integer', description: 'Lifetime count of exit tickets' },
        { name: 'total_session_logs', type: 'integer', description: 'Lifetime count of student-logged tutoring sessions' },
        { name: 'first_attempts_avg_percent', type: 'integer', description: 'Average percent correct on first 3 quiz attempts' },
        { name: 'recent_attempts_avg_percent', type: 'integer', description: 'Average percent correct on most recent 3 quiz attempts' },
        { name: 'score_change', type: 'integer', description: 'Recent avg minus first avg (percentage-point change)' },
        { name: 'first_confidence_avg', type: 'number', description: 'Average confidence (1-5) from first 3 session logs' },
        { name: 'recent_confidence_avg', type: 'number', description: 'Average confidence (1-5) from most recent 3 session logs' },
        { name: 'confidence_change', type: 'number', description: 'Recent avg minus first avg (confidence points)' },
        { name: 'first_activity_at', type: 'timestamp', description: 'Timestamp of first recorded quiz attempt' },
        { name: 'last_activity_at', type: 'timestamp', description: 'Timestamp of most recent quiz attempt' },
      ],
    },
    'Student Confidence Logs': {
      columns: [
        ...STUDENT_IDENTITY_COLS,
        { name: 'teacher_username', type: 'text', description: 'Teacher username' },
        { name: 'teacher_name', type: 'text', description: 'Teacher display name' },
        { name: 'district_name', type: 'text', description: 'School district name' },
        { name: 'session_date', type: 'date', description: 'Date of the session log' },
        { name: 'session_number', type: 'integer', description: 'Ordinal session number for this student (1st, 2nd, etc.)' },
        { name: 'confidence_rating', type: 'integer', description: 'Confidence rating (1-5)' },
        { name: 'confidence_label', type: 'text', description: 'Human-readable label (Not confident, A little, Somewhat, Confident, Very confident)' },
        { name: 'topics_practiced', type: 'text', description: 'Semicolon-separated math topics practiced in this session' },
        { name: 'self_reflection', type: 'text', description: 'Student self-reflection text' },
        { name: 'notes', type: 'text', description: 'Additional notes' },
        { name: 'logged_at', type: 'timestamp', description: 'When the log was recorded' },
      ],
    },
  };

  const rows: Record<string, any>[] = [];

  rows.push({
    sheet_name: '--- EXPORT INFO ---',
    column_name: '',
    data_type: '',
    description: `DAITA Research Export | Date range: ${filters.dateFrom || 'All'} to ${filters.dateTo || 'All'} | Districts: ${filters.districts.length > 0 ? filters.districts.join(', ') : 'All'}`,
  });
  rows.push({
    sheet_name: '--- PRIVACY ---',
    column_name: '',
    data_type: '',
    description: 'Includes student first name, last initial, and chosen login emoji for Salesforce matching. Excludes email addresses, IP addresses, and authentication data. Handle as confidential.',
  });
  rows.push({ sheet_name: '', column_name: '', data_type: '', description: '' });

  for (const sheetName of selectedSheets) {
    const def = definitions[sheetName];
    if (!def) continue;
    for (const col of def.columns) {
      rows.push({
        sheet_name: sheetName,
        column_name: col.name,
        data_type: col.type,
        description: col.description,
      });
    }
    rows.push({ sheet_name: '', column_name: '', data_type: '', description: '' });
  }

  return rows;
}

export function exportToXlsx(sheets: SheetData[], filename: string) {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const sanitized = sheet.data.map(sanitizeRow);
    const ws = XLSX.utils.json_to_sheet(sanitized);
    const sheetName = sheet.name.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, ws, sheetName);
  }

  XLSX.writeFile(workbook, filename);
}

function arrayToCsv(data: Record<string, any>[]): string {
  if (data.length === 0) return '\uFEFF';
  const headers = Object.keys(data[0]);
  const lines: string[] = [headers.map(h => csvEscape(h)).join(',')];
  for (const row of data) {
    const sanitized = sanitizeRow(row);
    lines.push(headers.map(h => csvEscape(String(sanitized[h] ?? ''))).join(','));
  }
  return '\uFEFF' + lines.join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export async function exportToCsvZip(sheets: SheetData[], filename: string) {
  const zip = new JSZip();

  for (const sheet of sheets) {
    const csvContent = arrayToCsv(sheet.data);
    const safeName = sheet.name.replace(/[^a-zA-Z0-9_() -]/g, '_').toLowerCase().replace(/\s+/g, '_');
    zip.file(`${safeName}.csv`, csvContent);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
