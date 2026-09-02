// Re-export Supabase services
export { supabase } from './supabase/config';
export {
  getTeachers,
  saveTeacher,
  getTeacher
} from './supabase/teachers';
export {
  saveStudent,
  getTeacherStudents
} from './supabase/students';
export {
  saveExitTicket,
  getTeacherExitTickets
} from './supabase/exitTickets';
export { 
  saveLessonPlan, 
  getTeacherLessonPlans,
  getLessonPlanByExitTicket 
} from './supabase/lessonPlans';
export { saveWeeklyGroups, getCurrentWeekGroups } from './supabase/weeklyGroups';
export { saveGroupLessonPlan, getGroupLessonPlan } from './supabase/groupLessonPlans';
export { saveClassroomAnalytics, getLatestClassroomAnalytics } from './supabase/classroomAnalytics';