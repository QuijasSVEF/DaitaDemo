import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { X, Loader2, AlertCircle, CheckCircle2, ArrowRight, CreditCard as Edit2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { supabase } from '../../services/supabase/config';
import { v4 as uuidv4 } from 'uuid';
import { renderMathContent, formatMathContent, detectTablePattern, inferTableFromContext, detectMultiTablePattern, detectDataVisualizationPattern } from '../../utils/mathUtils.tsx';
import { MathVisual } from './MathVisual';

interface QuizTemplate {
  id: string;
  title: string;
  topic: string;
  gradeLevel: string;
  isActive: boolean;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  correctAnswer: string;
  explanation: string;
  options: string[];
  type: string;
  subtopic: string;
}

interface Props {
  quiz: QuizTemplate;
  questions: QuizQuestion[];
  onClose: () => void;
  onSave?: (questions: QuizQuestion[]) => Promise<void>;
}

export function QuizQuestions({ quiz, questions, onClose, onSave }: Props) {
  const queryClient = useQueryClient();
  const [editedQuestions, setEditedQuestions] = useState<QuizQuestion[]>(questions || []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleQuestionEdit = (index: number, updates: Partial<QuizQuestion>) => {
    const newQuestions = [...editedQuestions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setEditedQuestions(newQuestions);
  };

  const handleActivate = async () => {
    try {
      setIsLoading(true);
      setActivationError(null);
      
      // First deactivate all other quizzes for this teacher
      const { error: deactivateError } = await supabase
        .from('quiz_templates')
        .update({ is_active: false })
        .neq('id', quiz.id);

      if (deactivateError) throw deactivateError;

      // Then activate this quiz
      const { error: activateError } = await supabase
        .from('quiz_templates')
        .update({ is_active: true })
        .eq('id', quiz.id);

      if (activateError) throw activateError;

      // Invalidate cache to refresh data
      await queryClient.invalidateQueries(['teacherQuizzes']);
      
      onClose();
    } catch (error) {
      console.error('Error activating quiz:', error);
      setActivationError(error instanceof Error ? error.message : 'Failed to activate assessment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Format questions consistently
      const formattedQuestions = editedQuestions.map(q => ({
        ...q,
        questionText: formatMathContent(q.questionText || ''),
        correctAnswer: formatMathContent(q.correctAnswer || ''),
        explanation: formatMathContent(q.explanation || ''),
        options: Array.isArray(q.options) ? q.options.map(formatMathContent) : []
      }));
      
      console.log('Saving questions to database:', formattedQuestions);
      
      // Update the template directly in the database
      const { error: saveError } = await supabase
        .from('quiz_templates')
        .update({
          questions: formattedQuestions,
          processed_questions: formattedQuestions,
          updated_at: new Date().toISOString()
        })
        .eq('id', quiz.id);

      if (saveError) throw saveError;
      
      console.log('Questions saved successfully to database');
      
      // Call the parent save handler if provided
      if (onSave) {
        await onSave(formattedQuestions);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
        
      // Invalidate cache to refresh data
      await queryClient.invalidateQueries(['quizQuestions']);
      await queryClient.invalidateQueries(['teacherQuizzes']);
    } catch (error) {
      console.error('Error saving changes:', error);
      setError(error instanceof Error ? error.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 bg-svef-beige/30 flex items-center justify-between border-b border-gray-200">
            <div>
              <h2 className="font-oswald text-xl font-medium text-svef-gray">
                {quiz.title}
              </h2>
              <p className="text-sm text-svef-gray mt-1">
                {quiz.topic} • Grade {quiz.gradeLevel}
              </p>
            </div>
            <Button variant="secondary" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-center text-svef-gray flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>No questions available for this assessment.</p>
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 flex justify-end space-x-4">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
            {!quiz.isActive && (
              <Button 
                onClick={handleActivate}
                isLoading={isLoading}
                className="flex items-center"
              >
                Activate <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 bg-svef-beige/30 flex items-center justify-between">
          <div>
            <h2 className="font-oswald text-xl font-medium text-svef-gray">
              {quiz.title}
            </h2>
            <p className="text-sm text-svef-gray mt-1">
              {quiz.topic} • Grade {quiz.gradeLevel}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {quiz.isActive ? (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-md">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
            ) : (
              <Button
                onClick={handleActivate}
                disabled={isLoading}
                className="bg-svef-green hover:bg-svef-green/90"
              >
                {isLoading ? 'Activating...' : 'Activate Assessment'}
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {editedQuestions.map((question, index) => (
              <div key={question.id} className="bg-gray-50 rounded-lg p-6">
                {editingIndex === index ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Question Text
                      </label>
                      <textarea
                        value={editedQuestions[index].questionText}
                        onChange={(e) => handleQuestionEdit(index, { questionText: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                        rows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Answer Options
                      </label>
                      <div className="space-y-2">
                        {editedQuestions[index].options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...editedQuestions[index].options];
                                newOptions[optionIndex] = e.target.value;
                                handleQuestionEdit(index, { options: newOptions });
                              }}
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                            />
                            <input
                              type="radio"
                              checked={option === editedQuestions[index].correctAnswer}
                              onChange={() => handleQuestionEdit(index, { correctAnswer: option })}
                              className="h-4 w-4 text-svef-purple focus:ring-svef-purple border-gray-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Explanation
                      </label>
                      <textarea
                        value={editedQuestions[index].explanation}
                        onChange={(e) => handleQuestionEdit(index, { explanation: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                        rows={2}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={() => setEditingIndex(null)}>
                        Save Question
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-4">
                    <span className="bg-svef-purple text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="space-y-4 flex-1">
                      <div>
                        <div className="flex justify-between">
                          <h3 className="font-medium text-svef-gray mb-2">
                            {renderMathContent(question.questionText)}
                          </h3>
                          <Button
                            variant="secondary"
                            onClick={() => setEditingIndex(index)}
                            className="h-8 w-8 p-0 flex items-center justify-center"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {(question as any).visual ? (
                          <MathVisual visual={(question as any).visual} />
                        ) : detectTablePattern(question.questionText) ? (
                          <MathVisual visual={detectTablePattern(question.questionText)!} />
                        ) : inferTableFromContext(question.questionText, question.explanation) ? (
                          <MathVisual visual={inferTableFromContext(question.questionText, question.explanation)!} />
                        ) : detectMultiTablePattern(question.questionText, question.explanation, question.options) ? (
                          <MathVisual visual={detectMultiTablePattern(question.questionText, question.explanation, question.options)!} />
                        ) : detectDataVisualizationPattern(question.questionText, question.explanation, question.options) ? (
                          <MathVisual visual={detectDataVisualizationPattern(question.questionText, question.explanation, question.options)!} />
                        ) : null}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {editedQuestions[index].options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={cn(
                                'p-3 rounded-lg border',
                                option === editedQuestions[index].correctAnswer
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-gray-200'
                              )}
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>
                                <span className={
                                  option === editedQuestions[index].correctAnswer
                                    ? 'text-green-700'
                                    : 'text-svef-gray'
                                }>
                                  {renderMathContent(option)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <h4 className="font-medium text-svef-gray text-sm mb-2">
                          Explanation
                        </h4>
                        <p className="text-sm text-svef-gray">
                          {renderMathContent(editedQuestions[index].explanation)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-svef-gray">
                        <span className="px-2 py-1 bg-svef-beige/30 rounded-md">
                          {question.type}
                        </span>
                        <span className="px-2 py-1 bg-svef-beige/30 rounded-md">
                          {question.subtopic}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            {saveSuccess && (
              <div className="flex items-center text-green-600 mr-4">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <p className="text-sm">Changes saved successfully</p>
              </div>
            )}
            {error && (
              <div className="flex items-center text-red-600 mr-4">
                <AlertCircle className="w-5 h-5 mr-2" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            {activationError && (
              <div className="flex items-center text-red-600">
                <AlertCircle className="w-5 h-5 mr-2" />
                <p className="text-sm">{activationError}</p>
              </div>
            )}
          </div>
          <div className="flex space-x-4">
            <Button 
              variant="secondary" 
              onClick={onClose}
            >
              Close
            </Button>
            {onSave && (
              <Button
                onClick={handleSaveChanges}
                isLoading={isSaving}
                disabled={isSaving}
              >
                Save Changes
              </Button>
            )}
            {!quiz.isActive && (
              <Button
                onClick={handleActivate}
                disabled={isLoading}
                className="bg-svef-green hover:bg-svef-green/90"
              >
                {isLoading ? 'Activating...' : 'Activate Assessment'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}