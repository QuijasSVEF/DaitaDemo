import { Student, ExitTicketResult } from '../../types';

export interface StudentGroupData {
  id: number;
  gradeLevel: string;
  struggles: string[];
  averageScore?: number;
}

export interface GroupingResult {
  focusAreas: string[];
  students: number[];
  recommendedApproach?: string;
}

export interface GroupingError extends Error {
  code: string;
  details?: any;
}