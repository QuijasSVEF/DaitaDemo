import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Brain, BookOpen, List, Hash, GraduationCap, BarChart, AlertCircle } from 'lucide-react';
import { QuizSettings as QuizSettingsType } from '../../types/quiz';
import { FormField } from '../forms/FormField';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { MATH_TOPICS } from '../../constants/mathTopics';
import { AssessmentPreview } from './AssessmentPreview';
import { generateQuiz, saveQuizTemplate } from '../../services/quizService';
import { supabase } from '../../services/supabase/config';
import { useQuery } from '@tanstack/react-query';

interface Props {
  onSubmit: (settings: QuizSettingsType) => void;
  isLoading?: boolean;
}

interface PreviewState {
  show: boolean;
  questions: any[];
}

const MATH_TOPICS_ARRAY = Object.entries(MATH_TOPICS).map(([value, { label }]) => ({
  value,
  label
}));

const QUESTION_TYPES = [
  'Multiple Choice',
  'Word Problems',
  'Calculation',
  'Conceptual Understanding'
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

export function QuizSettings({ onSubmit, isLoading: initialIsLoading = false }: Props) {
  const [isLoading, setIsLoading] = useState(initialIsLoading);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<QuizSettingsType>({
    defaultValues: {
      questionTypes: []
    }
  });

  const [preview, setPreview] = useState<PreviewState>({
    show: false,
    questions: []
  });
  const [generatedTemplateId, setGeneratedTemplateId] = useState<string | null>(null);

  const selectedTypes = watch('questionTypes', []);
  const selectedTopic = watch('topic');
  const watchedTitle = watch('title');
  const selectedSubtopics = MATH_TOPICS[selectedTopic]?.subtopics || [];

  const [flowMode, setFlowMode] = useState<'em_curriculum' | 'legacy'>('em_curriculum');
  const [emLevelCode, setEmLevelCode] = useState('');
  const [emModuleId, setEmModuleId] = useState('');
  const [emSubtopicIds, setEmSubtopicIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'assessment_flow_default')
        .maybeSingle();
      if (data?.value === 'legacy') setFlowMode('legacy');
    })();
  }, []);

  const { data: emLevels = [] } = useQuery({
    queryKey: ['emLevelsAll'],
    enabled: flowMode === 'em_curriculum',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('em_levels')
        .select('level_code, title, grade_level')
        .order('level_code');
      if (error) throw error;
      return data as { level_code: string; title: string; grade_level: string | null }[];
    },
  });

  const { data: emModules = [] } = useQuery({
    queryKey: ['emModulesForLevel', emLevelCode],
    enabled: !!emLevelCode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('em_modules')
        .select('id, title, order_index')
        .eq('level_code', emLevelCode)
        .order('order_index');
      if (error) throw error;
      return data as { id: string; title: string; order_index: number }[];
    },
  });

  const { data: emSubtopicsData = [] } = useQuery({
    queryKey: ['emSubtopicsForModule', emModuleId],
    enabled: !!emModuleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('em_subtopics')
        .select('id, title, order_index, default_difficulty, dok_level')
        .eq('module_id', emModuleId)
        .order('order_index');
      if (error) throw error;
      return data as { id: string; title: string; order_index: number; default_difficulty: string | null; dok_level: number | null }[];
    },
  });

  useEffect(() => {
    if (flowMode !== 'em_curriculum' || !emLevelCode) return;
    const level = emLevels.find((l) => l.level_code === emLevelCode);
    if (level?.grade_level) setValue('gradeLevel', level.grade_level);
  }, [flowMode, emLevelCode, emLevels, setValue]);

  useEffect(() => {
    if (flowMode !== 'em_curriculum') return;
    const module = emModules.find((m) => m.id === emModuleId);
    if (module) setValue('topic', module.title);
    const selected = emSubtopicsData.filter((s) => emSubtopicIds.includes(s.id));
    if (selected.length) {
      setValue('subtopics', selected.map((s) => s.title));
      const diffs = selected.map((s) => s.default_difficulty).filter(Boolean) as string[];
      if (diffs.length) {
        const firstValid = diffs.find((d) => d === 'easy' || d === 'medium' || d === 'hard');
        if (firstValid) setValue('difficulty', firstValid as 'easy' | 'medium' | 'hard');
      }
    }
  }, [flowMode, emModuleId, emSubtopicIds, emModules, emSubtopicsData, setValue]);

  // Get teacher username from session
  const getTeacherUsername = () => {
    const sessionStr = localStorage.getItem('teacherSession');
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      return session.username;
    }
    return null;
  };

  const teacherUsername = getTeacherUsername();

  // Check for duplicate titles
  const { data: existingQuizzes = [] } = useQuery({
    queryKey: ['existingQuizTitles', teacherUsername],
    queryFn: async () => {
      if (!teacherUsername) return [];
      
      const { data, error } = await supabase
        .from('quiz_templates')
        .select('title')
        .eq('teacher_username', teacherUsername);

      if (error) throw error;
      return data.map(quiz => quiz.title.toLowerCase());
    },
    enabled: !!teacherUsername
  });

  // Check for duplicate title when title changes
  useEffect(() => {
    if (watchedTitle && existingQuizzes.length > 0) {
      const isDuplicate = existingQuizzes.includes(watchedTitle.toLowerCase());
      if (isDuplicate) {
        setTitleError('An assessment with this title already exists. Please choose a different title.');
      } else {
        setTitleError(null);
      }
    } else {
      setTitleError(null);
    }
  }, [watchedTitle, existingQuizzes]);

  const handleFormSubmit = async (data: QuizSettingsType) => {
    try {
      setIsLoading(true);
      setError(null);

      // Prevent submission if duplicate title exists
      if (titleError) {
        setError('Please change the assessment title. An assessment with this name already exists.');
        setIsLoading(false);
        return;
      }

      // Double-check for duplicate title one more time
      if (watchedTitle && existingQuizzes.includes(watchedTitle.toLowerCase())) {
        setError('An assessment with this title already exists. Please choose a different title.');
        setIsLoading(false);
        return;
      }

      // Double-check authentication first
      const sessionStr = localStorage.getItem('teacherSession');
      if (!sessionStr) {
        throw new Error('You must be logged in as a teacher to create assessments. Please log in and try again.');
      }

      const session = JSON.parse(sessionStr);
      const teacherUsername = session.username;
      
      // Validate required fields
      if (!data.title?.trim()) {
        throw new Error('Assessment title is required');
      }
      
      if (flowMode === 'em_curriculum') {
        if (!emLevelCode || !emModuleId || emSubtopicIds.length === 0) {
          throw new Error('Please select an Elevate Math level, module, and at least one subtopic.');
        }
      } else {
        if (!data.topic) {
          throw new Error('Please select a topic');
        }
        if (!data.subtopics?.length) {
          throw new Error('Please select at least one subtopic');
        }
      }
      
      if (!data.questionTypes?.length) {
        throw new Error('Please select at least one question type');
      }
      
      if (!data.numQuestions || data.numQuestions < 1 || data.numQuestions > 20) {
        throw new Error('Number of questions must be between 1 and 20');
      }
      
      if (!data.gradeLevel) {
        throw new Error('Please select a grade level');
      }
      
      if (!data.difficulty) {
        throw new Error('Please select a difficulty level');
      }

      let emContext: QuizSettingsType['emContext'] | undefined;
      let emMetadata: { emLevelCode?: string; emModuleId?: string; emSubtopicIds?: string[] } = {};
      if (flowMode === 'em_curriculum' && emLevelCode && emModuleId) {
        const level = emLevels.find((l) => l.level_code === emLevelCode);
        const mod = emModules.find((m) => m.id === emModuleId);
        const subs = emSubtopicsData.filter((s) => emSubtopicIds.includes(s.id));

        const { data: enriched } = await supabase
          .from('em_subtopics')
          .select('id, title, big_ideas, academic_vocabulary, common_misconceptions, aligned_standards, dok_level')
          .in('id', emSubtopicIds.length ? emSubtopicIds : ['__none__']);

        const flatten = (rows: any[] | null, key: string): string[] => {
          const out: string[] = [];
          (rows || []).forEach((r) => {
            const v = r?.[key];
            if (Array.isArray(v)) v.forEach((x) => x && out.push(String(x)));
            else if (v && typeof v === 'string') out.push(v);
          });
          return Array.from(new Set(out));
        };

        emContext = {
          levelTitle: level?.title,
          moduleTitle: mod?.title,
          subtopicTitles: subs.map((s) => s.title),
          bigIdeas: flatten(enriched, 'big_ideas'),
          academicVocabulary: flatten(enriched, 'academic_vocabulary'),
          commonMisconceptions: flatten(enriched, 'common_misconceptions'),
          alignedStandards: flatten(enriched, 'aligned_standards'),
          dokLevel: (enriched || []).map((r: any) => r?.dok_level).find((x: number | null) => x != null) ?? null,
        };
        emMetadata = {
          emLevelCode,
          emModuleId,
          emSubtopicIds: emSubtopicIds.length ? emSubtopicIds : undefined,
        };
      }

      // Generate questions first
      const questions = await generateQuiz({
        ...data,
        emContext,
        teacherUsername
      });

      if (!questions || questions.length === 0) {
        throw new Error('Failed to generate quiz questions. Please try again.');
      }

      // Save quiz template with the generated questions
      const templateId = await saveQuizTemplate({
        ...data,
        ...emMetadata,
        emContext,
        questions,
        showAnswers: true,
        isActive: true
      }, teacherUsername);
      
      setGeneratedTemplateId(templateId);
      
      // Show preview with template ID
      setPreview({
        show: true,
        questions: questions.map(q => ({
          ...q,
          templateId
        }))
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      setError(error instanceof Error ? error.message : 'Failed to create assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQuestions = async (questions: any[]) => {
    try {
      setIsLoading(true);
      setError(null);
      // Save the quiz with final questions
      await onSubmit({
        ...watch(),
        questions
      });
    } catch (error) {
      console.error('Error saving quiz:', error);
      setError(error instanceof Error ? error.message : 'Failed to save quiz');
    } finally {
      setIsLoading(false);
    }
  };

  if (preview.show) {
    return (
      <AssessmentPreview 
        questions={preview.questions}
        onSave={handleSaveQuestions}
        onActivate={() => {}}
        isLoading={isLoading} 
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {error && (
        <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center space-x-2 mb-6">
        <Brain className="w-6 h-6 text-svef-purple" />
        <h2 className="font-oswald text-2xl font-medium text-svef-gray">
          Create Assessment
        </h2>
      </div>

      {flowMode === 'em_curriculum' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-emerald-700" />
            <h3 className="font-medium text-emerald-900">Elevate Math Curriculum</h3>
          </div>
          <p className="text-sm text-emerald-800">
            Pick a level, module, and subtopics. Grade, topic, subtopics, and difficulty auto-populate below.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
              <select
                value={emLevelCode}
                onChange={(e) => {
                  setEmLevelCode(e.target.value);
                  setEmModuleId('');
                  setEmSubtopicIds([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-svef-purple focus:border-svef-purple"
              >
                <option value="">Select level</option>
                {emLevels.map((l) => (
                  <option key={l.level_code} value={l.level_code}>{l.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Module</label>
              <select
                value={emModuleId}
                disabled={!emLevelCode}
                onChange={(e) => {
                  setEmModuleId(e.target.value);
                  setEmSubtopicIds([]);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:ring-svef-purple focus:border-svef-purple"
              >
                <option value="">Select module</option>
                {emModules.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subtopics</label>
              <select
                multiple
                value={emSubtopicIds}
                disabled={!emModuleId}
                onChange={(e) => {
                  const ids = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setEmSubtopicIds(ids);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm h-24 disabled:bg-gray-100 disabled:text-gray-400 focus:ring-svef-purple focus:border-svef-purple"
              >
                {emSubtopicsData.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField label="Assessment Title" error={errors.title?.message || titleError}>
          <input
            type="text"
            {...register('title', {
              required: 'Title is required'
            })}
            className={cn(
              "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-purple focus:border-svef-purple",
              (errors.title || titleError) ? "border-red-300" : "border-gray-300"
            )}
            placeholder="e.g., Week 1 Math Assessment"
          />
          {titleError && (
            <div className="mt-1 flex items-center text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span>{titleError}</span>
            </div>
          )}
        </FormField>

        {flowMode === 'legacy' && (
          <>
            <FormField label="Main Topic" error={errors.topic?.message}>
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-svef-gray" />
                <select
                  {...register('topic', {
                    required: flowMode === 'legacy' ? 'Topic is required' : false
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-purple focus:border-svef-purple",
                    errors.topic ? "border-red-300" : "border-gray-300"
                  )}
                >
                  <option value="">Select a topic...</option>
                  {MATH_TOPICS_ARRAY.map(topic => (
                    <option key={topic.value} value={topic.value}>
                      {topic.label}
                    </option>
                  ))}
                </select>
              </div>
            </FormField>

            <FormField label="Subtopics" error={errors.subtopics?.message}>
              <div className="flex items-center space-x-2">
                <List className="w-4 h-4 text-svef-gray" />
                <select
                  multiple
                  {...register('subtopics', {
                    required: flowMode === 'legacy' ? 'At least one subtopic is required' : false
                  })}
                  className={cn(
                    "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-purple focus:border-svef-purple h-32",
                    errors.subtopics ? "border-red-300" : "border-gray-300"
                  )}
                >
                  {selectedSubtopics.map(subtopic => (
                    <option key={subtopic} value={subtopic}>
                      {subtopic}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-sm text-svef-gray">
                Hold Ctrl/Cmd to select multiple subtopics
              </p>
            </FormField>
          </>
        )}

        <FormField label="Number of Questions" error={errors.numQuestions?.message}>
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-svef-gray" />
            <input
              type="number"
              {...register('numQuestions', {
                required: 'Number of questions is required',
                min: { value: 1, message: 'Minimum 1 question' },
                max: { value: 20, message: 'Maximum 20 questions' }
              })}
              className={cn(
                "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-purple focus:border-svef-purple",
                errors.numQuestions ? "border-red-300" : "border-gray-300"
              )}
              placeholder="Enter number of questions"
            />
          </div>
        </FormField>

        <FormField label={flowMode === 'em_curriculum' ? 'Grade Level (from curriculum)' : 'Grade Level'} error={errors.gradeLevel?.message}>
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-svef-gray" />
            <select
              {...register('gradeLevel', {
                required: 'Grade level is required'
              })}
              disabled={flowMode === 'em_curriculum'}
              className={cn(
                "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-purple focus:border-svef-purple",
                errors.gradeLevel ? "border-red-300" : "border-gray-300",
                flowMode === 'em_curriculum' && "bg-gray-100 text-gray-600 cursor-not-allowed"
              )}
            >
              <option value="">Select grade level...</option>
              {Array.from({ length: 8 }, (_, i) => i + 3).map(grade => (
                <option key={grade} value={`${grade}`}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>
        </FormField>

        <FormField label={flowMode === 'em_curriculum' ? 'Difficulty Level (from curriculum)' : 'Difficulty Level'} error={errors.difficulty?.message}>
          <div className="flex items-center space-x-2">
            <BarChart className="w-4 h-4 text-svef-gray" />
            <select
              {...register('difficulty', {
                required: 'Difficulty level is required'
              })}
              disabled={flowMode === 'em_curriculum'}
              className={cn(
                "mt-1 block w-full rounded-md border shadow-sm focus:ring-svef-purple focus:border-svef-purple",
                errors.difficulty ? "border-red-300" : "border-gray-300",
                flowMode === 'em_curriculum' && "bg-gray-100 text-gray-600 cursor-not-allowed"
              )}
            >
              <option value="">Select difficulty...</option>
              {DIFFICULTIES.map(diff => (
                <option key={diff.value} value={diff.value}>
                  {diff.label}
                </option>
              ))}
            </select>
          </div>
        </FormField>
      </div>

      <FormField label="Question Types" error={errors.questionTypes?.message}>
        <div className="grid grid-cols-2 gap-4">
          {QUESTION_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => {
                const currentTypes = watch('questionTypes') || [];
                const newTypes = currentTypes.includes(type)
                  ? currentTypes.filter(t => t !== type)
                  : [...currentTypes, type];
                setValue('questionTypes', newTypes);
              }}
              className={cn(
                "flex items-center p-4 border rounded-lg cursor-pointer transition-colors duration-200",
                Array.isArray(selectedTypes) && selectedTypes.includes(type)
                  ? "border-svef-purple bg-svef-purple/5"
                  : "border-gray-200 hover:border-svef-purple/50"
              )}
            >
              <span className="ml-2">{type}</span>
            </button>
          ))}
        </div>
      </FormField>

      <Button 
        type="submit" 
        isLoading={isLoading}
        disabled={isLoading}
        className={cn(
          "w-full",
          isLoading && "opacity-70 cursor-not-allowed"
        )}
      >
        Generate Assessment
      </Button>
    </form>
  );
}