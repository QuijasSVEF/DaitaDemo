import { Student, ExitTicketResult } from '../../types';
import { ClassroomAnalysis } from '../aiAnalyticsService';
import { getCachedAnalytics, cacheAnalytics } from './cache';
import { analyzeClassroomData } from '../aiAnalyticsService';
import { saveClassroomAnalytics, getLatestClassroomAnalytics } from '../supabase/classroomAnalytics';

export async function loadAnalytics(
  students: Student[],
  exitTickets: ExitTicketResult[],
  teacherUsername: string,
  weekKey: string,
  districtKey: string = 'all',
  forceUpdate: boolean = false
): Promise<ClassroomAnalysis> {
  // Try cache first for non-all-time views
  if (!forceUpdate && weekKey !== 'all') {
    const cacheKey = `${weekKey}-${districtKey}`;
    const cached = getCachedAnalytics(teacherUsername, cacheKey, students, exitTickets);
    if (cached) {
      return cached;
    }
  }

  // For all-time view, try database first if not forcing update
  if (!forceUpdate && weekKey === 'all' && districtKey === 'all') {
    try {
      const savedAnalytics = await getLatestClassroomAnalytics(teacherUsername);
      if (savedAnalytics && savedAnalytics.totalStudents > 0) {
        // Also cache it for faster subsequent access
        cacheAnalytics(savedAnalytics, teacherUsername, `${weekKey}-${districtKey}`, students, exitTickets);
        return savedAnalytics;
      }
    } catch (error) {
      console.log('No saved analytics found, generating new ones');
    }
  }
  // If no cache or force update, generate new analytics
  const analysis = await analyzeClassroomData(students, exitTickets);
  
  // Cache the results
  cacheAnalytics(analysis, teacherUsername, `${weekKey}-${districtKey}`, students, exitTickets);
  
  // Save to database if it's all-time view and we have meaningful data
  if (weekKey === 'all' && districtKey === 'all' && analysis.totalStudents > 0) {
    try {
      await saveClassroomAnalytics(analysis, teacherUsername);
    } catch (error) {
      console.error('Failed to save analytics:', error);
      // Don't throw here, just log the error
    }
  }
  
  return analysis;
}