import { LessonPlan, ExitTicketResult, Student } from '../../types';

export interface LessonPlanData {
  plan: LessonPlan;
  studentId: number;
  studentGrade: string;
  exitTicket: ExitTicketResult;
  uniqueId: string;
}

export interface LessonPlanError extends Error {
  code: string;
  details?: any;
}