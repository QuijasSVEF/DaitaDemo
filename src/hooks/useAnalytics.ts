import { useState, useEffect, useCallback } from 'react';
import { Student, ExitTicketResult } from '../types';
import { ClassroomAnalysis } from '../services/aiAnalyticsService';
import { loadAnalytics } from '../services/analytics/loader';
import { filterDataByWeek } from '../utils/dateUtils';
import { getLatestClassroomAnalytics } from '../services/supabase/classroomAnalytics';

export function useAnalytics(
  students: Student[],
  exitTickets: ExitTicketResult[],
  teacherUsername: string | undefined,
  selectedWeek: string,
  selectedDistrict: string = 'all',
  shouldUpdate: boolean
) {
  const [analysis, setAnalysis] = useState<ClassroomAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (forceUpdate: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate teacher username before proceeding
      if (!teacherUsername) {
        console.log('No teacher username provided to analytics');
        throw new Error('Teacher username is required');
      }

      console.log('Fetching analytics for teacher:', teacherUsername);
      console.log('Students count:', students.length);
      console.log('Exit tickets count:', exitTickets.length);

      // First try to load from database if not forcing update
      if (!forceUpdate && selectedWeek === 'all' && selectedDistrict === 'all') {
        try {
          const savedAnalytics = await getLatestClassroomAnalytics(teacherUsername);
          if (savedAnalytics && savedAnalytics.totalStudents > 0) {
            console.log('Using saved analytics from database');
            setAnalysis(savedAnalytics);
            setIsLoading(false);
            return;
          }
        } catch (dbError) {
          console.log('No saved analytics found, generating new ones:', dbError);
        }
      }
      const filteredExitTickets = filterDataByWeek(exitTickets, selectedWeek);
      
      // Filter students by district if a district is selected
      const filteredStudents = students;
      
      console.log('Loading analytics with filtered data:', {
        filteredStudents: filteredStudents.length,
        filteredExitTickets: filteredExitTickets.length
      });
      
      const result = await loadAnalytics(
        filteredStudents,
        filteredExitTickets,
        teacherUsername,
        selectedWeek,
        selectedDistrict,
        forceUpdate || shouldUpdate
      );

      setAnalysis(result);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load analytics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [students, exitTickets, teacherUsername, selectedWeek, selectedDistrict, shouldUpdate]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!mounted || !teacherUsername) return;
      await fetchAnalytics();
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [teacherUsername, selectedWeek, selectedDistrict]); // Remove fetchAnalytics dependency

  const regenerateAnalytics = useCallback(async () => {
    await fetchAnalytics(true);
  }, [fetchAnalytics]);

  return { analysis, isLoading, error, regenerateAnalytics };
}