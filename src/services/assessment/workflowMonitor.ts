import { supabase } from '../supabase/config';
import { dataRefreshService } from './dataRefreshService';
import { notificationService } from './realTimeNotifications';

export class WorkflowMonitor {
  private static instance: WorkflowMonitor;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): WorkflowMonitor {
    if (!WorkflowMonitor.instance) {
      WorkflowMonitor.instance = new WorkflowMonitor();
    }
    return WorkflowMonitor.instance;
  }

  startMonitoring(teacherUsername: string): void {
    if (this.monitoringIntervals.has(teacherUsername)) {
      console.log('⚠️ Already monitoring teacher:', teacherUsername);
      return;
    }

    console.log('👁️ Starting workflow monitoring for teacher:', teacherUsername);

    // Monitor for new assessments every 10 seconds
    const interval = setInterval(async () => {
      await this.checkForNewData(teacherUsername);
    }, 10000);

    this.monitoringIntervals.set(teacherUsername, interval);
  }

  stopMonitoring(teacherUsername: string): void {
    const interval = this.monitoringIntervals.get(teacherUsername);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(teacherUsername);
      console.log('🛑 Stopped monitoring teacher:', teacherUsername);
    }
  }

  private async checkForNewData(teacherUsername: string): Promise<void> {
    try {
      // Check for recent quiz attempts (last 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      
      const { data: recentAttempts, error } = await supabase
        .from('quiz_attempts')
        .select('id, student_id, score, total_questions, completed_at')
        .eq('teacher_username', teacherUsername)
        .gte('completed_at', twoMinutesAgo)
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error checking for new data:', error);
        return;
      }

      if (recentAttempts && recentAttempts.length > 0) {
        console.log('🔍 Found recent assessment activity, refreshing data');
        
        // Refresh teacher data
        await dataRefreshService.refreshTeacherData(teacherUsername);
        
        // Notify about the updates
        recentAttempts.forEach(attempt => {
          notificationService.notifyAssessmentCompleted(
            attempt.student_id,
            teacherUsername,
            attempt
          );
        });
      }
    } catch (error) {
      console.error('Error in workflow monitoring:', error);
    }
  }
}

export const workflowMonitor = WorkflowMonitor.getInstance();