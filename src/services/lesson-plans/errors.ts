import { LessonPlanError } from './types';

export class LessonPlanNotFoundError extends Error implements LessonPlanError {
  code = 'LESSON_PLAN_NOT_FOUND';
  constructor(details?: any) {
    super('Lesson plan not found');
    this.details = details;
  }
}

export class LessonPlanSaveError extends Error implements LessonPlanError {
  code = 'LESSON_PLAN_SAVE_ERROR';
  constructor(details?: any) {
    super('Failed to save lesson plan');
    this.details = details;
  }
}