export interface NotificationData {
  id: string;
  type: 'assessment_completed' | 'lesson_generated' | 'data_updated';
  studentId?: number;
  teacherUsername: string;
  message: string;
  timestamp: Date;
  data?: any;
}

export class RealTimeNotificationService {
  private static instance: RealTimeNotificationService;
  private listeners: Map<string, (notification: NotificationData) => void> = new Map();

  static getInstance(): RealTimeNotificationService {
    if (!RealTimeNotificationService.instance) {
      RealTimeNotificationService.instance = new RealTimeNotificationService();
    }
    return RealTimeNotificationService.instance;
  }

  subscribe(teacherUsername: string, callback: (notification: NotificationData) => void): () => void {
    const key = `${teacherUsername}_${Date.now()}`;
    this.listeners.set(key, callback);

    console.log('🔔 Subscribed to notifications for teacher:', teacherUsername);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(key);
      console.log('🔕 Unsubscribed from notifications for teacher:', teacherUsername);
    };
  }

  notify(notification: NotificationData): void {
    console.log('📢 Broadcasting notification:', notification);
    
    this.listeners.forEach((callback, key) => {
      if (key.startsWith(notification.teacherUsername)) {
        try {
          callback(notification);
        } catch (error) {
          console.error('Error in notification callback:', error);
        }
      }
    });
  }

  notifyAssessmentCompleted(studentId: number, teacherUsername: string, data?: any): void {
    this.notify({
      id: `assessment_${studentId}_${Date.now()}`,
      type: 'assessment_completed',
      studentId,
      teacherUsername,
      message: `Student #${studentId} completed an assessment`,
      timestamp: new Date(),
      data
    });
  }

  notifyLessonGenerated(studentId: number, teacherUsername: string, data?: any): void {
    this.notify({
      id: `lesson_${studentId}_${Date.now()}`,
      type: 'lesson_generated',
      studentId,
      teacherUsername,
      message: `Lesson plan generated for Student #${studentId}`,
      timestamp: new Date(),
      data
    });
  }

  notifyDataUpdated(teacherUsername: string): void {
    this.notify({
      id: `update_${teacherUsername}_${Date.now()}`,
      type: 'data_updated',
      teacherUsername,
      message: 'Student data has been updated',
      timestamp: new Date()
    });
  }
}

export const notificationService = RealTimeNotificationService.getInstance();