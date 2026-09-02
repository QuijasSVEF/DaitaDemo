export interface QuizTemplate {
  id: string;
  teacherUsername: string;
  title: string;
  topic: string;
  subtopics: string[];
  questionTypes: string[];
  numQuestions: number;
  gradeLevel: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  createdAt: Date;
  showAnswers?: boolean;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface NumberLineData {
  min: number;
  max: number;
  points: { value: number; label?: string }[];
}

export interface CoordinatePlotData {
  points: { x: number; y: number; label?: string }[];
  xLabel?: string;
  yLabel?: string;
}

export interface MultiTableData {
  tables: { label: string; headers: string[]; rows: string[][] }[];
}

export interface DotPlotData {
  values: number[];
  label?: string;
  min?: number;
  max?: number;
}

export interface BarChartData {
  categories: string[];
  values: number[];
  xLabel?: string;
  yLabel?: string;
}

export interface UnavailableData {
  reason?: string;
}

export interface QuestionVisual {
  type: 'table' | 'number_line' | 'coordinate_plot' | 'multi_table' | 'dot_plot' | 'bar_chart' | 'unavailable';
  data: TableData | NumberLineData | CoordinatePlotData | MultiTableData | DotPlotData | BarChartData | UnavailableData;
  caption?: string;
}

export interface QuizQuestion {
  id: string;
  templateId?: string;
  questionText: string;
  correctAnswer: string;
  explanation: string;
  options: string[];
  type: string;
  subtopic: string;
  createdAt?: Date;
  dokLevel?: number;
  visual?: QuestionVisual;
}

export interface QuizAttempt {
  id: string;
  studentId: number;
  templateId: string;
  score: number;
  totalQuestions: number;
  answers: {
    questionId: string;
    answer: string;
    correct: boolean;
  }[];
  completedAt: Date;
}

export interface QuizSettings {
  title: string;
  topic: string;
  subtopics: string[];
  questionTypes: string[];
  numQuestions: number;
  gradeLevel: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive?: boolean;
  showAnswers?: boolean;
  emLevelCode?: string;
  emModuleId?: string;
  emSubtopicIds?: string[];
  emContext?: {
    levelTitle?: string;
    moduleTitle?: string;
    subtopicTitles?: string[];
    bigIdeas?: string[];
    academicVocabulary?: string[];
    commonMisconceptions?: string[];
    alignedStandards?: string[];
    dokLevel?: number | null;
  };
}