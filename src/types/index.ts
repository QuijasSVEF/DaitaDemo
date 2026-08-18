export interface Teacher {
  username: string;
  name: string;
}

export interface Coach {
  id: string;
  email: string;
  fullName: string;
}

export interface TeacherAssignment {
  id: string;
  teacherUsername: string;
  teacherName: string;
  lastLogin: string | null;
}

export interface Student {
  id: number;
  firstName: string;
  lastInitial: string;
  emoji: string;
  gradeLevel: string;
  subject: string;
  teacherUsername: string;
}

export interface ExitTicketResult {
  id: string;
  studentId: number;
  score: number;
  totalQuestions: number;
  struggledAreas: string[];
  lastLesson: string;
  timestamp: Date;
}

export interface LessonPlan {
  objective: string;
  engagement: string[];
  representation: string[];
  actionExpression: string[];
  wrapup: string[];
  duration: number;
  dokLevels: {
    engagement: number;
    representation: number;
    action_expression: number;
    wrapup: number;
  };
  alignedStandards?: any[];
  emReference?: string;
  detailedActivities?: {
    engagement?: DetailedActivity[];
    representation?: DetailedActivity[];
    actionExpression?: DetailedActivity[];
    wrapup?: DetailedActivity[];
  };
}

export interface DetailedActivity {
  description: string;
  timeAllocation: string;
  objective?: string;
  setup?: string;
  steps: Array<{
    phase: string;
    duration: string;
    instruction: string;
    expectedResponse?: string;
    teacherSays?: string;
    lookFor?: string;
  }> | string[];
  materials: string[];
  teacherScript?: string[];
  studentBehaviors?: string[];
  expectedStudentBehaviors?: string[];
  differentiation?: {
    struggling?: string[];
    advanced?: string[];
    ifStrugglingMore?: string;
    ifGettingIt?: string;
  };
  commonMisconceptions?: string[];
  commonMistakes?: string[];
  quickAssessment?: string[];
  successCriteria?: string[];
  standardsAlignment?: {
    code: string;
    description: string;
    activities: string[];
    assessmentMethods: string[];
  };
}
