import { supabase } from '../supabase/config';

export interface AssessmentWorkflowData {
  studentId: number;
  teacherUsername: string;
  templateId: string;
  score: number;
  totalQuestions: number;
  answers: any[];
  gradeLevel?: string;
  startTime?: string;
}

export type LessonPlanGenerationStatus = 'idle' | 'processing' | 'complete' | 'error';

export interface GenerationStatusEvent {
  studentId: number;
  teacherUsername: string;
  status: LessonPlanGenerationStatus;
}

type StatusListener = (event: GenerationStatusEvent) => void;

export class AutomatedAssessmentWorkflow {
  private static instance: AutomatedAssessmentWorkflow;
  private processingQueue: Map<string, Promise<void>> = new Map();
  private statusListeners: Set<StatusListener> = new Set();

  static getInstance(): AutomatedAssessmentWorkflow {
    if (!AutomatedAssessmentWorkflow.instance) {
      AutomatedAssessmentWorkflow.instance = new AutomatedAssessmentWorkflow();
    }
    return AutomatedAssessmentWorkflow.instance;
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private notifyListeners(studentId: number, teacherUsername: string, status: LessonPlanGenerationStatus): void {
    const event: GenerationStatusEvent = { studentId, teacherUsername, status };
    this.statusListeners.forEach(listener => listener(event));
  }

  private async writeStatus(
    teacherUsername: string,
    patch: Record<string, any>
  ): Promise<void> {
    try {
      const payload = {
        teacher_username: teacherUsername,
        ...patch,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('generation_status').upsert(payload, { onConflict: 'teacher_username' });
    } catch (err) {
      console.error('Failed to write generation_status:', err);
    }
  }

  async processAssessmentCompletion(data: AssessmentWorkflowData): Promise<void> {
    const workflowId = `${data.studentId}-${data.teacherUsername}-${Date.now()}`;

    if (this.processingQueue.has(workflowId)) {
      return;
    }

    // Save the quiz attempt
    const completionTime = new Date().toISOString();
    const startTime = data.startTime || completionTime;
    const durationSeconds = Math.round(
      (new Date(completionTime).getTime() - new Date(startTime).getTime()) / 1000
    );

    const { error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        student_id: data.studentId,
        teacher_username: data.teacherUsername,
        template_id: data.templateId,
        score: data.score,
        total_questions: data.totalQuestions,
        answers: data.answers,
        completion_time: completionTime,
        start_time: startTime,
        duration: durationSeconds
      });

    if (attemptError) {
      throw new Error(`Failed to save quiz attempt: ${attemptError.message}`);
    }

    // Set status to processing
    await this.writeStatus(data.teacherUsername, {
      phase: 'processing',
      students_pending: 0,
      lesson_plan_started_at: new Date().toISOString(),
      lesson_plan_completed_at: null,
      groups_ready_at: null,
      last_message: 'New assessment received, updating groups...',
    });

    this.notifyListeners(data.studentId, data.teacherUsername, 'processing');

    // Run group update in background
    const backgroundWork = this.updateWeeklyGroups(data.teacherUsername, data.studentId);
    this.processingQueue.set(workflowId, backgroundWork);
    backgroundWork.finally(() => this.processingQueue.delete(workflowId));
  }

  private async updateWeeklyGroups(teacherUsername: string, studentId: number): Promise<void> {
    try {
      const { error } = await supabase.rpc('regenerate_weekly_groups', {
        p_teacher_username: teacherUsername
      });

      if (error) {
        console.error('Error updating weekly groups:', error);
      }

      await this.writeStatus(teacherUsername, {
        phase: 'ready',
        students_pending: 0,
        lesson_plan_completed_at: new Date().toISOString(),
        groups_ready_at: new Date().toISOString(),
        last_message: 'Groups updated with new assessment data',
      });

      this.notifyListeners(studentId, teacherUsername, 'complete');
    } catch (error) {
      console.error('Error in weekly groups update:', error);
      await this.writeStatus(teacherUsername, {
        phase: 'error',
        last_message: 'Failed to update groups',
      });
      this.notifyListeners(studentId, teacherUsername, 'error');
    }
  }
}

export const automatedWorkflow = AutomatedAssessmentWorkflow.getInstance();
