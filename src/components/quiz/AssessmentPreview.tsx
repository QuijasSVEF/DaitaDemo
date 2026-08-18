import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Clock, BarChart2, CreditCard as Edit2, Trash2, Plus, Save, Eye, AlertCircle, CheckCircle, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { QuizQuestion } from '../../types/quiz';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { supabase } from '../../services/supabase/config';
import { v4 as uuidv4 } from 'uuid';
import { renderMathContent, formatMathContent, detectTablePattern, inferTableFromContext, detectMultiTablePattern, detectDataVisualizationPattern } from '../../utils/mathUtils.tsx';
import { MathVisual } from './MathVisual';

interface Props {
  questions: QuizQuestion[];
  onSave: (questions: QuizQuestion[]) => void;
  onActivate?: () => void;
  isLoading?: boolean;
}

export function AssessmentPreview({ questions: initialQuestions, onSave, onActivate, isLoading = false }: Props) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isTogglingAnswers, setIsTogglingAnswers] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const queryClient = useQueryClient();

  // Get template ID from first question
  useEffect(() => {
    const id = initialQuestions?.[0]?.templateId;
    if (id) {
      setTemplateId(id);
    }
  }, [initialQuestions]);

  const handleQuestionEdit = (index: number, updates: Partial<QuizQuestion>) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    setQuestions(updatedQuestions);
  };

  const handleOptionEdit = (questionIndex: number, optionIndex: number, newValue: string) => {
    console.log(`Editing option ${optionIndex + 1} for question ${questionIndex + 1} from "${questions[questionIndex].options[optionIndex]}" to "${newValue}"`);
    const updatedQuestions = [...questions];
    const newOptions = [...updatedQuestions[questionIndex].options];
    const oldValue = newOptions[optionIndex];
    newOptions[optionIndex] = formatMathContent(newValue);
    
    // If this option was the correct answer, update the correct answer to the new value
    const wasCorrectAnswer = updatedQuestions[questionIndex].correctAnswer === oldValue;
    
    updatedQuestions[questionIndex] = { 
      ...updatedQuestions[questionIndex], 
      options: newOptions,
      correctAnswer: wasCorrectAnswer
        ? formatMathContent(newValue)
        : updatedQuestions[questionIndex].correctAnswer
    };
    
    console.log(`Question ${questionIndex + 1} after option edit:`, {
      oldValue,
      newValue: formatMathContent(newValue),
      wasCorrectAnswer,
      newCorrectAnswer: updatedQuestions[questionIndex].correctAnswer,
      allOptions: updatedQuestions[questionIndex].options
    });
    
    setQuestions(updatedQuestions);
  };

  const handleCorrectAnswerChange = (questionIndex: number, newCorrectAnswer: string) => {
    console.log(`Changing correct answer for question ${questionIndex + 1} from "${questions[questionIndex].correctAnswer}" to "${newCorrectAnswer}"`);
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex] = { 
      ...updatedQuestions[questionIndex], 
      correctAnswer: formatMathContent(newCorrectAnswer)
    };
    setQuestions(updatedQuestions);
  };

  const handleQuestionDelete = (index: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      setQuestions(updatedQuestions);
    }
  };

  const handleQuestionReorder = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedQuestions = [...questions];
    [updatedQuestions[index], updatedQuestions[newIndex]] = 
    [updatedQuestions[newIndex], updatedQuestions[index]];
    setQuestions(updatedQuestions);
  };

  const handleAddQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: uuidv4(),
      templateId: templateId || '',
      questionText: '',
      correctAnswer: '',
      explanation: '',
      options: ['', '', '', ''],
      type: 'Multiple Choice',
      subtopic: '',
      createdAt: new Date()
    };
    setQuestions([...questions, newQuestion]);
    setEditingIndex(questions.length);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      console.log('Starting save process with templateId:', templateId);
      console.log('Questions to save:', questions.length);
      
      if (!questions || questions.length === 0) {
        throw new Error('No questions to save');
      }

      // Validate questions with better logic
      const invalidQuestions = questions.filter(q => {
        // Only validate truly critical fields
        const hasEmptyQuestionText = !q.questionText?.trim();
        const hasEmptyCorrectAnswer = !q.correctAnswer?.trim();
        
        return hasEmptyQuestionText || hasEmptyCorrectAnswer;
      });

      if (invalidQuestions.length > 0) {
        console.warn('Some questions have validation issues, but proceeding with save...');
        // Don't block save for minor validation issues
      }
      
      console.log('Validation passed, formatting questions...');
      
      // Format questions for database storage
      const formattedQuestions = questions.map((q, index) => ({
        id: q.id || uuidv4(),
        questionText: q.questionText || '',
        correctAnswer: q.correctAnswer || '',
        explanation: q.explanation || '',
        options: Array.isArray(q.options) ? q.options : [],
        type: q.type || 'Multiple Choice',
        subtopic: q.subtopic || '',
        templateId: templateId,
        ...(q.visual ? { visual: q.visual } : {})
      }));
      
      console.log('Formatted questions for save:', formattedQuestions);
      
      if (!templateId) {
        console.error('No templateId available for save operation');
        throw new Error('Quiz template ID not found. Please try creating the assessment again.');
      }
      
      // First, verify the template exists and get current data
      const { data: currentTemplate, error: fetchError } = await supabase
        .from('quiz_templates')
        .select('id, questions, processed_questions, num_questions, updated_at')
        .eq('id', templateId)
        .single();

      if (fetchError) {
        console.error('Error fetching current template:', fetchError);
        throw new Error(`Template not found: ${fetchError.message}`);
      }

      console.log('Current template data before update:', {
        currentQuestionsCount: currentTemplate.questions?.length || 0,
        currentProcessedCount: currentTemplate.processed_questions?.length || 0,
        lastUpdated: currentTemplate.updated_at
      });

      console.log('Updating quiz_templates table with both questions and processed_questions...');
      
      // CRITICAL: Update both questions and processed_questions fields
      const { error: saveError } = await supabase
        .from('quiz_templates')
        .update({
          questions: formattedQuestions,
          processed_questions: formattedQuestions,
          num_questions: formattedQuestions.length,
          show_answers: showAnswers,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (saveError) {
        console.error('Supabase save error:', saveError);
        throw new Error(`Failed to save to database: ${saveError.message}`);
      }
      
      console.log('Successfully updated quiz_templates table');
      
      // Verify the save by fetching the updated data
      const { data: verifyData, error: verifyError } = await supabase
        .from('quiz_templates')
        .select('questions, processed_questions, num_questions, updated_at')
        .eq('id', templateId)
        .single();
        
      if (verifyError) {
        console.error('Error verifying save:', verifyError);
        throw new Error(`Failed to verify save: ${verifyError.message}`);
      } else {
        console.log('Save verification successful:', {
          questionsLength: verifyData.questions?.length || 0,
          processedQuestionsLength: verifyData.processed_questions?.length || 0,
          numQuestions: verifyData.num_questions,
          updatedAt: verifyData.updated_at,
          dataActuallyChanged: verifyData.updated_at !== currentTemplate.updated_at,
          timestampChanged: new Date(verifyData.updated_at).getTime() > new Date(currentTemplate.updated_at).getTime()
        });
        
        // Ensure the data was actually updated
        if (verifyData.questions?.length !== formattedQuestions.length) {
          throw new Error(`Save verification failed: Expected ${formattedQuestions.length} questions, but database has ${verifyData.questions?.length || 0}`);
        }
        
        if (verifyData.updated_at === currentTemplate.updated_at) {
          console.warn('Warning: updated_at timestamp did not change, data may not have been saved');
        }
      }
      
      // Force refresh of all related queries
      console.log('Invalidating React Query cache...');
      await queryClient.invalidateQueries(['quizQuestions']);
      await queryClient.invalidateQueries(['teacherQuizzes']);
      await queryClient.invalidateQueries(['activeQuiz']);
      
      // Force refetch to ensure UI updates
      await queryClient.refetchQueries(['teacherQuizzes']);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      console.log('Save process completed successfully');
      
    } catch (error) {
      console.error('Error saving assessment:', error);
      setError(error instanceof Error ? error.message : 'Failed to save assessment');
    } finally {
      setIsSaving(false);
    }
  };

  const handleActivate = async () => {
    try {
      setIsActivating(true);
      setError(null);
      setSaveSuccess(false);
      
      // Validate questions before activation
      const invalidQuestions = questions.filter(q => 
        !q.questionText.trim() || 
        !q.correctAnswer.trim() || 
        !q.options.every(opt => opt.trim()) ||
        !q.options.includes(q.correctAnswer)
      );

      if (invalidQuestions.length > 0) {
        throw new Error('Please complete all questions before activating the assessment.');
      }

      // Save questions first
      await handleSave();
      
      // Then activate
      if (!templateId) {
        throw new Error('Invalid quiz template');
      }
      
      // Deactivate other quizzes first
      const { error: deactivateError } = await supabase
        .from('quiz_templates')
        .update({ is_active: false })
        .eq('teacher_username', questions[0]?.templateId ? undefined : templateId)
        .neq('id', templateId);

      if (deactivateError) {
        console.error('Error deactivating other quizzes:', deactivateError);
      }

      // Activate this quiz
      const { error: activateError } = await supabase
        .from('quiz_templates')
        .update({ 
          is_active: true,
          show_answers: showAnswers
        })
        .eq('id', templateId);

      if (activateError) throw activateError;
      
      // Call parent handlers
      if (onSave) {
        onSave(questions);
      }
      
      if (onActivate) {
        await onActivate();
      }
      
      await queryClient.invalidateQueries(['quizQuestions']);
      await queryClient.invalidateQueries(['teacherQuizzes']);
      await queryClient.invalidateQueries(['activeQuiz']);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error activating assessment:', error);
      setError(error instanceof Error ? error.message : 'Failed to activate assessment');
    } finally {
      setIsActivating(false);
    }
  };

  const handleToggleAnswers = () => {
    setShowConfirmation(true);
  };

  const confirmToggleAnswers = async () => {
    try {
      setIsTogglingAnswers(true);
      setError(null);
      
      if (!templateId) {
        throw new Error('Invalid quiz template');
      }

      const newShowAnswers = !showAnswers;
      
      // Update the quiz template with new answer visibility setting
      const { error: updateError } = await supabase
        .from('quiz_templates')
        .update({ show_answers: newShowAnswers })
        .eq('id', templateId);

      if (updateError) throw updateError;
      
      setShowAnswers(newShowAnswers);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error toggling answer visibility:', error);
      setError(error instanceof Error ? error.message : 'Failed to update answer visibility');
    } finally {
      setIsTogglingAnswers(false);
      setShowConfirmation(false);
    }
  };

  const estimatedTime = Math.ceil(questions.length * 2.5); // 2.5 minutes per question

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-svef-gray">
              <Clock className="w-5 h-5 text-svef-purple" />
              <span>Estimated time: {estimatedTime} minutes</span>
            </div>
            <div className="flex items-center space-x-2 text-svef-gray">
              <BarChart2 className="w-5 h-5 text-svef-purple" />
              <span>{questions.length} Questions</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              onClick={handleToggleAnswers}
              disabled={isLoading || isSaving || isActivating || isTogglingAnswers}
              className={cn(
                "flex items-center space-x-2",
                showAnswers ? "bg-green-50 text-green-700" : "bg-gray-50"
              )}
            >
              <Eye className="w-4 h-4" />
              <span>{showAnswers ? 'Hide' : 'Show'} Answers to Students</span>
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isLoading || isSaving || isActivating || editingIndex !== null}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
            </Button>
            <Button 
              onClick={handleActivate}
              disabled={isLoading || isSaving || isActivating || editingIndex !== null}
              className="flex items-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isActivating ? 'Activating...' : 'Activate Assessment'}</span>
            </Button>
          </div>
        </div>

        {/* Success Messages */}
        {saveSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              <p className="text-sm">Changes saved successfully!</p>
            </div>
          </div>
        )}
        
        {/* Error Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Answer Visibility Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Change Answer Visibility?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {showAnswers 
                  ? 'Students will no longer see correct answers and explanations after submitting their assessment.'
                  : 'Students will see correct answers and explanations after submitting their assessment.'
                }
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowConfirmation(false)}
                  disabled={isTogglingAnswers}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmToggleAnswers}
                  disabled={isTogglingAnswers}
                >
                  {isTogglingAnswers ? 'Updating...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div 
              key={question.id} 
              className={cn(
                "border border-gray-200 rounded-lg overflow-hidden",
                expandedIndex === index && "ring-2 ring-svef-purple"
              )}
            >
              <div className="bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-svef-gray">Question {index + 1}</span>
                    <span className="text-sm text-svef-purple">{question.type}</span>
                    <span className="text-sm text-svef-gray">{question.subtopic}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleQuestionReorder(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleQuestionReorder(index, 'down')}
                      disabled={index === questions.length - 1}
                      className="p-1 hover:bg-gray-100 rounded-full disabled:opacity-50"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className="p-1 hover:bg-gray-100 rounded-full text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleQuestionDelete(index)}
                      className="p-1 hover:bg-gray-100 rounded-full text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {editingIndex === index ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Question Text
                      </label>
                      <textarea
                        value={question.questionText}
                        onChange={(e) => handleQuestionEdit(index, { questionText: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                        rows={3}
                        placeholder="Enter the question text..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Answer Options
                      </label>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <span className="text-sm font-medium w-6">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionEdit(index, optionIndex, e.target.value)}
                              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                            />
                            <input
                              type="radio"
                              name={`correct-answer-${index}`}
                              checked={option === question.correctAnswer}
                              onChange={() => handleCorrectAnswerChange(index, option)}
                              className="h-4 w-4 text-svef-purple focus:ring-svef-purple border-gray-300"
                              title="Mark as correct answer"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-svef-gray mt-1">
                        Select the radio button next to the correct answer
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-svef-gray mb-1">
                        Explanation
                      </label>
                      <textarea
                        value={question.explanation}
                        onChange={(e) => handleQuestionEdit(index, { explanation: e.target.value })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                        rows={2}
                        placeholder="Explain why this is the correct answer..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-svef-gray mb-1">
                          Question Type
                        </label>
                        <input
                          type="text"
                          value={question.type}
                          onChange={(e) => handleQuestionEdit(index, { type: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                          placeholder="e.g., Multiple Choice"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-svef-gray mb-1">
                          Subtopic
                        </label>
                        <input
                          type="text"
                          value={question.subtopic}
                          onChange={(e) => handleQuestionEdit(index, { subtopic: e.target.value })}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-svef-purple focus:ring-svef-purple"
                          placeholder="e.g., Linear Equations"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="secondary" 
                        onClick={() => setEditingIndex(null)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={() => setEditingIndex(null)}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Question
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-svef-gray">
                      {renderMathContent(question.questionText) || 'No question text'}
                    </p>
                    {question.visual ? (
                      <MathVisual visual={question.visual} />
                    ) : detectTablePattern(question.questionText) ? (
                      <MathVisual visual={detectTablePattern(question.questionText)!} />
                    ) : inferTableFromContext(question.questionText, question.explanation || '') ? (
                      <MathVisual visual={inferTableFromContext(question.questionText, question.explanation || '')!} />
                    ) : detectMultiTablePattern(question.questionText, question.explanation || '', question.options) ? (
                      <MathVisual visual={detectMultiTablePattern(question.questionText, question.explanation || '', question.options)!} />
                    ) : detectDataVisualizationPattern(question.questionText, question.explanation || '', question.options) ? (
                      <MathVisual visual={detectDataVisualizationPattern(question.questionText, question.explanation || '', question.options)!} />
                    ) : null}
                    <div className="grid grid-cols-2 gap-3">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={cn(
                            "p-3 rounded-lg border",
                            option === question.correctAnswer
                              ? "border-green-200 bg-green-50"
                              : "border-gray-200"
                          )}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            <span className={
                              option === question.correctAnswer
                                ? "text-green-700 font-medium"
                                : "text-svef-gray"
                            }>
                              {renderMathContent(option) || 'Empty option'}
                            </span>
                            {option === question.correctAnswer && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {expandedIndex === index && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-svef-gray text-sm mb-2">
                          Explanation
                        </h4>
                        <p className="text-sm text-svef-gray">
                          {renderMathContent(question.explanation) || 'No explanation provided'}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      className="text-sm text-svef-purple hover:text-svef-purple/80"
                    >
                      {expandedIndex === index ? "Hide" : "Show"} Explanation
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add Question Button */}
          <div className="text-center">
            <Button
              variant="secondary"
              onClick={handleAddQuestion}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}