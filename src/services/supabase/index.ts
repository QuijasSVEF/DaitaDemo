export { supabase } from './config';
export { getTeachers, saveTeacher, getTeacher } from './teachers';
export { saveStudent, getTeacherStudents } from './students';
export { saveExitTicket, getTeacherExitTickets } from './exitTickets';
export { 
  saveLessonPlan, 
  getTeacherLessonPlans,
  getLessonPlanByExitTicket 
} from './lessonPlans';
export { saveWeeklyGroups, getCurrentWeekGroups } from './weeklyGroups';
export { saveGroupLessonPlan, getGroupLessonPlan } from './groupLessonPlans';
export { saveClassroomAnalytics, getLatestClassroomAnalytics } from './classroomAnalytics';