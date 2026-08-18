import { QueryClient } from '@tanstack/react-query';

export class DataRefreshService {
  private static instance: DataRefreshService;
  private queryClient: QueryClient | null = null;

  static getInstance(): DataRefreshService {
    if (!DataRefreshService.instance) {
      DataRefreshService.instance = new DataRefreshService();
    }
    return DataRefreshService.instance;
  }

  setQueryClient(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  async refreshTeacherData(teacherUsername: string): Promise<void> {
    if (!this.queryClient) {
      console.warn('QueryClient not set, cannot refresh data');
      return;
    }

    console.log('🔄 Refreshing all teacher data for:', teacherUsername);

    try {
      // Invalidate all teacher-related queries
      await Promise.all([
        this.queryClient.invalidateQueries(['teacherStudents', teacherUsername]),
        this.queryClient.invalidateQueries(['teacherExitTickets', teacherUsername]),
        this.queryClient.invalidateQueries(['teacherLessonPlans', teacherUsername]),
        this.queryClient.invalidateQueries(['weeklyGroups', teacherUsername]),
        this.queryClient.invalidateQueries(['classroomAnalytics', teacherUsername]),
        this.queryClient.invalidateQueries(['studentsWithAssessments', teacherUsername]),
        this.queryClient.invalidateQueries(['studentsWithAssessmentsDropdown', teacherUsername]),
        this.queryClient.invalidateQueries(['teacherQuizzes', teacherUsername]),
        this.queryClient.invalidateQueries(['activeQuiz', teacherUsername])
      ]);

      // Force refetch critical queries
      await Promise.all([
        this.queryClient.refetchQueries(['studentsWithAssessments', teacherUsername]),
        this.queryClient.refetchQueries(['teacherExitTickets', teacherUsername]),
        this.queryClient.refetchQueries(['teacherLessonPlans', teacherUsername])
      ]);

      console.log('✅ Teacher data refresh completed');
    } catch (error) {
      console.error('❌ Error refreshing teacher data:', error);
    }
  }

  async refreshStudentData(studentId: number, teacherUsername: string): Promise<void> {
    if (!this.queryClient) return;

    console.log('🔄 Refreshing student data for:', studentId);

    try {
      // Invalidate student-specific queries
      await Promise.all([
        this.queryClient.invalidateQueries(['studentData', studentId, teacherUsername]),
        this.queryClient.invalidateQueries(['latestQuizAttempt', studentId, teacherUsername]),
        this.queryClient.invalidateQueries(['studentsWithAssessments', teacherUsername])
      ]);

      // Force refetch
      await this.queryClient.refetchQueries(['studentsWithAssessments', teacherUsername]);

      console.log('✅ Student data refresh completed');
    } catch (error) {
      console.error('❌ Error refreshing student data:', error);
    }
  }
}

export const dataRefreshService = DataRefreshService.getInstance();